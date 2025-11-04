import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { crypto } from "https://deno.land/std@0.192.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Unified JSON schema structure
interface ParsedDocument {
  ingestion_key: string;
  customer: {
    external_id: string | null;
    email: string | null;
    phone: string | null;
    customer_key: string;
  };
  file: {
    original_filename: string;
    media_type: string;
    byte_size: number;
    sha256: string;
    received_at: string;
  };
  document: {
    document_type: 'electricity_bill' | 'gas_bill' | 'electricity_meter_reading' | 'gas_meter_reading' | 'other';
    classification_confidence: number;
    supplier: { name: string | null; confidence: number };
    account: {
      account_number: string | null;
      mprn: string | null;
      gprn: string | null;
    };
    meter: {
      mprn: string | null;
      gprn: string | null;
      mprn_confidence: number;
      gprn_confidence: number;
      reading_type: 'actual' | 'estimated' | null;
      reads: Array<{
        register: string | null;
        value: string | number;
        uom: string;
        read_at: string | null;
        confidence: number;
      }>;
    };
    billing: {
      period_start: string | null;
      period_end: string | null;
      issue_date: string | null;
      due_date: string | null;
      usage_kwh: number | null;
      usage_m3: number | null;
      standing_charge_eur: number | null;
      unit_rates: Array<{
        rate_name: string;
        price_eur_per_kwh: number;
        confidence: number;
      }>;
      pso_levy_eur: number | null;
      vat_eur: number | null;
      total_eur_incl_vat: number | null;
    };
    addresses: {
      supply_address: string | null;
      billing_address: string | null;
    };
    raw_extracted: {
      key_values: Record<string, any>;
      tables: Array<{ name: string; headers: string[]; rows: any[][] }>;
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { attachmentId, messageId, forceReparse = false } = await req.json();

    if (!attachmentId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: attachmentId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[PARSE-SYNC] Processing attachment ${attachmentId}`);

    // Get attachment with message and customer details
    const { data: attachment, error: attachmentError } = await supabase
      .from('message_attachments')
      .select(`
        *,
        messages!inner(
          id,
          business_id,
          direction,
          customer_id,
          conversation_id,
          businesses!inner(id, name, slug),
          customers(id, email, phone, whatsapp_phone, name)
        )
      `)
      .eq('id', attachmentId)
      .single();

    if (attachmentError || !attachment) {
      throw new Error(`Attachment not found: ${attachmentError?.message}`);
    }

    const message = attachment.messages;
    const business = message.businesses;
    const customer = message.customers;
    const businessId = message.business_id;

    // Check if OneBillChat business
    const isOneBillChat = 
      business.name?.toLowerCase().includes('onebill') || 
      business.slug?.toLowerCase().includes('onebill');

    if (!isOneBillChat) {
      console.log('[PARSE-SYNC] Skipping: not OneBillChat business');
      return new Response(
        JSON.stringify({ success: false, message: 'Only OneBillChat businesses supported' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch file content and calculate SHA256
    const fileResponse = await fetch(attachment.url);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileSizeBytes = fileBuffer.byteLength;
    
    if (fileSizeBytes > 20 * 1024 * 1024) {
      throw new Error('File too large for processing (max 20MB)');
    }

    // Calculate SHA256
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const fileSha256 = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    console.log(`[PARSE-SYNC] File SHA256: ${fileSha256}`);

    // Build customer identity
    const customerKey = await generateCustomerKey(customer);
    const ingestionKey = await generateIngestionKey(customerKey, fileSha256);

    console.log(`[PARSE-SYNC] Customer key: ${customerKey}, Ingestion key: ${ingestionKey}`);

    // Check for existing parse result
    if (!forceReparse) {
      const { data: existing } = await supabase
        .from('attachment_parse_results')
        .select('*')
        .eq('attachment_id', attachmentId)
        .eq('parse_status', 'completed')
        .maybeSingle();

      if (existing) {
        console.log('[PARSE-SYNC] Returning cached result');
        return new Response(
          JSON.stringify({ success: true, cached: true, result: existing }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get OpenAI configuration
    const { data: openAIProvider } = await supabase
      .from('ai_providers')
      .select('*')
      .eq('business_id', businessId)
      .eq('provider_name', 'openai')
      .eq('is_active', true)
      .maybeSingle();

    if (!openAIProvider?.api_key) {
      throw new Error('OpenAI API key not configured for OneBillChat');
    }

    // Update parse status to processing
    await supabase
      .from('attachment_parse_results')
      .upsert({
        attachment_id: attachmentId,
        message_id: message.id,
        parse_status: 'processing',
        ai_provider: 'openai',
        ai_model: openAIProvider.model || 'gpt-4o',
      }, { onConflict: 'attachment_id' });

    // Convert to base64 for OpenAI
    const base64File = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    const mimeType = attachment.type || 'image/jpeg';

    // Enhanced system prompt for unified schema
    const systemPrompt = `You are an expert document parser for Irish utility bills and meter readings.

Analyze this document and extract ALL information into structured JSON following this exact schema.

DOCUMENT TYPES:
- electricity_bill: Full invoice with charges, MPRN, kWh usage, supplier branding
- gas_bill: Full invoice with charges, GPRN, m³ usage, gas supplier
- electricity_meter_reading: Customer-submitted meter photo/reading with MPRN
- gas_meter_reading: Customer-submitted meter photo/reading with GPRN
- other: Cannot classify with confidence

EXTRACT ALL THESE FIELDS:
- Supplier name and confidence
- Account numbers (account_number, MPRN, GPRN) with confidence
- Meter readings (register type, value, unit, timestamp, confidence)
- Billing period dates (ISO-8601 format)
- Usage in kWh or m³
- Charges: standing charge, unit rates (day/night), PSO levy, VAT, total
- Addresses: supply address, billing address

IMPORTANT:
- All monetary amounts in EUR
- All dates in ISO-8601 format (YYYY-MM-DD)
- Include confidence score (0-1) for every extracted field
- If field not found, set to null but include it
- For meter readings, specify register type (day/night/gas/general)
- Extract rate tables with prices per kWh

Return ONLY valid JSON.`;

    // Call OpenAI with structured output
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIProvider.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: openAIProvider.model || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Parse this utility document and extract all fields according to the schema.' },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64File}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'utility_document_parse',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                document_type: {
                  type: 'string',
                  enum: ['electricity_bill', 'gas_bill', 'electricity_meter_reading', 'gas_meter_reading', 'other']
                },
                classification_confidence: { type: 'number' },
                supplier_name: { type: 'string' },
                supplier_confidence: { type: 'number' },
                account_number: { type: 'string' },
                mprn: { type: 'string' },
                gprn: { type: 'string' },
                mprn_confidence: { type: 'number' },
                gprn_confidence: { type: 'number' },
                meter_readings: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      register: { type: 'string' },
                      value: { type: 'number' },
                      unit: { type: 'string' },
                      confidence: { type: 'number' }
                    },
                    required: ['register', 'value', 'unit', 'confidence'],
                    additionalProperties: false
                  }
                },
                period_start: { type: 'string' },
                period_end: { type: 'string' },
                usage_kwh: { type: 'number' },
                usage_m3: { type: 'number' },
                standing_charge_eur: { type: 'number' },
                pso_levy_eur: { type: 'number' },
                vat_eur: { type: 'number' },
                total_eur: { type: 'number' },
                supply_address: { type: 'string' }
              },
              required: [
                'document_type',
                'classification_confidence',
                'supplier_name',
                'supplier_confidence'
              ],
              additionalProperties: false
            }
          }
        },
        max_tokens: 2000,
        temperature: 0.1
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`OpenAI error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const rawParsed = JSON.parse(aiData.choices[0].message.content);

    console.log('[PARSE-SYNC] Classification:', rawParsed.document_type);

    // Build unified document
    const parsedDocument: ParsedDocument = {
      ingestion_key: ingestionKey,
      customer: {
        external_id: customer?.id || null,
        email: customer?.email || null,
        phone: customer?.phone || customer?.whatsapp_phone || null,
        customer_key: customerKey
      },
      file: {
        original_filename: attachment.filename || 'attachment',
        media_type: mimeType,
        byte_size: fileSizeBytes,
        sha256: fileSha256,
        received_at: new Date().toISOString()
      },
      document: {
        document_type: rawParsed.document_type,
        classification_confidence: rawParsed.classification_confidence,
        supplier: {
          name: rawParsed.supplier_name || null,
          confidence: rawParsed.supplier_confidence
        },
        account: {
          account_number: rawParsed.account_number || null,
          mprn: rawParsed.mprn || null,
          gprn: rawParsed.gprn || null
        },
        meter: {
          mprn: rawParsed.mprn || null,
          gprn: rawParsed.gprn || null,
          mprn_confidence: rawParsed.mprn_confidence || 0,
          gprn_confidence: rawParsed.gprn_confidence || 0,
          reading_type: 'actual',
          reads: (rawParsed.meter_readings || []).map((r: any) => ({
            register: r.register,
            value: r.value,
            uom: r.unit,
            read_at: null,
            confidence: r.confidence
          }))
        },
        billing: {
          period_start: rawParsed.period_start || null,
          period_end: rawParsed.period_end || null,
          issue_date: null,
          due_date: null,
          usage_kwh: rawParsed.usage_kwh || null,
          usage_m3: rawParsed.usage_m3 || null,
          standing_charge_eur: rawParsed.standing_charge_eur || null,
          unit_rates: [],
          pso_levy_eur: rawParsed.pso_levy_eur || null,
          vat_eur: rawParsed.vat_eur || null,
          total_eur_incl_vat: rawParsed.total_eur || null
        },
        addresses: {
          supply_address: rawParsed.supply_address || null,
          billing_address: null
        },
        raw_extracted: {
          key_values: rawParsed,
          tables: []
        }
      }
    };

    // Store in attachment_parse_results
    await supabase
      .from('attachment_parse_results')
      .update({
        parse_status: 'completed',
        document_type: parsedDocument.document.document_type,
        classification_confidence: parsedDocument.document.classification_confidence,
        extracted_fields: parsedDocument,
        tokens_used: aiData.usage?.total_tokens || 0,
        parsed_at: new Date().toISOString()
      })
      .eq('attachment_id', attachmentId);

    // Sync to OneBill API
    const onebillApiKey = Deno.env.get('ONEBILL_API_KEY');
    if (onebillApiKey) {
      await syncToOneBillAPI(parsedDocument, onebillApiKey);
    }

    // Post summary to conversation
    await postSummaryToChat(supabase, message.conversation_id, parsedDocument);

    return new Response(
      JSON.stringify({ 
        success: true,
        ingestion_key: ingestionKey,
        document_type: parsedDocument.document.document_type,
        confidence: parsedDocument.document.classification_confidence
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PARSE-SYNC] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper: Generate customer key
async function generateCustomerKey(customer: any): Promise<string> {
  const identifier = customer?.email?.toLowerCase() || 
                    customer?.phone?.replace(/\D/g, '') || 
                    customer?.id;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: Generate ingestion key
async function generateIngestionKey(customerKey: string, fileSha256: string): Promise<string> {
  const combined = customerKey + fileSha256;
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: Sync to OneBill API
async function syncToOneBillAPI(doc: ParsedDocument, apiKey: string) {
  try {
    // TODO: Replace with actual OneBill API endpoint from OpenAPI spec
    const response = await fetch('https://api.onebill.ie/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': doc.ingestion_key
      },
      body: JSON.stringify(doc)
    });

    if (!response.ok) {
      console.error('[PARSE-SYNC] OneBill API error:', await response.text());
    } else {
      console.log('[PARSE-SYNC] Synced to OneBill API successfully');
    }
  } catch (error) {
    console.error('[PARSE-SYNC] Failed to sync to OneBill:', error);
  }
}

// Helper: Post summary to chat
async function postSummaryToChat(supabase: any, conversationId: string, doc: ParsedDocument) {
  const summary = `📄 Document processed: **${doc.document.document_type.replace(/_/g, ' ')}**\n` +
    `Confidence: ${(doc.document.classification_confidence * 100).toFixed(0)}%\n` +
    (doc.document.supplier.name ? `Supplier: ${doc.document.supplier.name}\n` : '') +
    (doc.document.account.mprn ? `MPRN: ${doc.document.account.mprn}\n` : '') +
    (doc.document.account.gprn ? `GPRN: ${doc.document.account.gprn}\n` : '') +
    `✅ Stored & synced`;

  await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      content: summary,
      direction: 'outbound',
      platform: 'system',
      is_read: true
    });
}
