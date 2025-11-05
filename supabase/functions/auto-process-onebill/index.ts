import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONEBILL_BUSINESS_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { attachment_id, message_id, attachment_url, attachment_type } = await req.json();

    console.log('Auto-processing OneBill attachment:', { attachment_id, message_id });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check idempotency - has this attachment already been processed?
    const { data: existingParse } = await supabase
      .from('attachment_parse_results')
      .select('id, parse_status')
      .eq('attachment_id', attachment_id)
      .eq('parse_status', 'success')
      .single();

    if (existingParse) {
      console.log('Attachment already processed successfully, skipping');
      return new Response(
        JSON.stringify({ message: 'Already processed', parse_id: existingParse.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get message and conversation details
    const { data: message } = await supabase
      .from('messages')
      .select('id, conversation_id, customer_id, conversations!inner(business_id)')
      .eq('id', message_id)
      .single();

    if (!message) {
      throw new Error('Message not found');
    }

    const businessId = message.conversations.business_id;
    const customerId = message.customer_id;

    console.log('Processing for business:', businessId);

    // Call onebill-parse-router to parse (routes to Gemini or OpenAI based on file type)
    console.log('Calling onebill-parse-router...');
    const parseResponse = await supabase.functions.invoke('onebill-parse-router', {
      body: { attachmentUrl: attachment_url }
    });

    if (parseResponse.error) {
      console.error('Parse error:', parseResponse.error);
      throw new Error(`Parsing failed: ${parseResponse.error.message}`);
    }

    const parsedData = parseResponse.data;
    console.log('Parse successful, extracted data:', JSON.stringify(parsedData).substring(0, 500));

    // Extract phone number from parsed data or customer record
    let phone = parsedData.bills?.cus_details?.[0]?.details?.phone;
    
    if (!phone && customerId) {
      const { data: customer } = await supabase
        .from('customers')
        .select('phone, whatsapp_phone')
        .eq('id', customerId)
        .single();
      
      phone = customer?.whatsapp_phone || customer?.phone;
    }

    if (!phone) {
      throw new Error('Phone number not found in parsed data or customer record');
    }

    // Normalize phone (remove leading + or 00)
    phone = phone.replace(/^\+/, '').replace(/^00/, '');

    console.log('Using phone:', phone);

    // Determine which utility types are present and create submissions
    const submissions = [];
    const bills = parsedData.bills || {};

    // Check for electricity bill FIRST (priority over meter reading)
    const hasElectricityBill = bills.electricity && bills.electricity.length > 0;
    const hasGasBill = bills.gas && bills.gas.length > 0;
    const hasMeterReading = bills.meter_reading && bills.meter_reading.read_value;

    // Check for electricity bill
    if (hasElectricityBill) {
      console.log('Detected electricity bill');
      const elecData = bills.electricity[0];
      const meterDetails = elecData.electricity_details?.meter_details;

      if (meterDetails?.mprn) {
        const { data: submission, error } = await supabase
          .from('onebill_submissions')
          .insert({
            business_id: businessId,
            customer_id: customerId,
            document_type: 'electricity',
            file_url: attachment_url,
            file_name: `attachment_${attachment_id}.jpg`,
            file_size: 0,
            submission_status: 'pending',
            phone: phone,
            mprn: meterDetails.mprn,
            mcc_type: meterDetails.mcc,
            dg_type: meterDetails.dg,
            extracted_fields: parsedData
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating electricity submission:', error);
          throw new Error(`Failed to create electricity submission: ${error.message}`);
        } else if (!submission?.id) {
          console.error('Electricity submission created but no ID returned:', submission);
          throw new Error('Electricity submission created but no ID returned');
        } else {
          console.log('Created electricity submission:', submission.id);
          submissions.push({ type: 'electricity', id: submission.id });
        }
      }
    }

    // Check for gas bill
    if (hasGasBill) {
      console.log('Detected gas bill');
      const gasData = bills.gas[0];
      const meterDetails = gasData.gas_details?.meter_details;

      if (meterDetails?.gprn) {
        const { data: submission, error } = await supabase
          .from('onebill_submissions')
          .insert({
            business_id: businessId,
            customer_id: customerId,
            document_type: 'gas',
            file_url: attachment_url,
            file_name: `attachment_${attachment_id}.jpg`,
            file_size: 0,
            submission_status: 'pending',
            phone: phone,
            gprn: meterDetails.gprn,
            extracted_fields: parsedData
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating gas submission:', error);
          throw new Error(`Failed to create gas submission: ${error.message}`);
        } else if (!submission?.id) {
          console.error('Gas submission created but no ID returned:', submission);
          throw new Error('Gas submission created but no ID returned');
        } else {
          console.log('Created gas submission:', submission.id);
          submissions.push({ type: 'gas', id: submission.id });
        }
      }
    }

    // Only submit meter reading if NO bills were detected (meter photo scenario)
    if (hasMeterReading && !hasElectricityBill && !hasGasBill) {
      console.log('Detected standalone meter reading (no bill present)');
      const meterData = bills.meter_reading;
      
      const { data: submission, error } = await supabase
        .from('onebill_submissions')
        .insert({
          business_id: businessId,
          customer_id: customerId,
          document_type: 'meter',
          file_url: attachment_url,
          file_name: `attachment_${attachment_id}.jpg`,
          file_size: 0,
          submission_status: 'pending',
          phone: phone,
          utility: meterData.utility || 'gas',
          read_value: meterData.read_value,
          unit: meterData.unit || 'm3',
          meter_make: meterData.meter_make,
          meter_model: meterData.meter_model,
          raw_text: meterData.raw_text,
          extracted_fields: parsedData
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating meter submission:', error);
        throw new Error(`Failed to create meter submission: ${error.message}`);
      } else if (!submission?.id) {
        console.error('Meter submission created but no ID returned:', submission);
        throw new Error('Meter submission created but no ID returned');
      } else {
        console.log('Created meter submission:', submission.id);
        submissions.push({ type: 'meter', id: submission.id });
      }
    } else if (hasMeterReading) {
      console.log('Meter reading found but skipped (part of bill)', { hasElectricityBill, hasGasBill });
    }

    if (submissions.length === 0) {
      console.log('No valid utility data found in parsed result');
      await supabase
        .from('attachment_parse_results')
        .insert({
          attachment_id: attachment_id,
          parse_status: 'failed',
          parsed_data: parsedData,
          error_message: 'No valid utility data found',
        });

      return new Response(
        JSON.stringify({ message: 'No valid utility data found', parsed_data: parsedData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Created ${submissions.length} submission(s), calling onebill-submit...`);

    // Store parse result
    await supabase
      .from('attachment_parse_results')
      .insert({
        attachment_id: attachment_id,
        parse_status: 'success',
        parsed_data: parsedData,
      });

    // Submit to OneBill for each detected utility type
    const submissionResults = [];
    for (const submission of submissions) {
      // Validate submission ID before invoking
      if (!submission.id) {
        console.error(`Skipping ${submission.type} - missing submission ID`);
        submissionResults.push({ 
          type: submission.type, 
          success: false, 
          error: 'Missing submission ID' 
        });
        continue;
      }

      console.log(`Submitting ${submission.type} (ID: ${submission.id}) to OneBill...`);
      
      try {
        const submitResponse = await supabase.functions.invoke('onebill-submit', {
          body: {
            submissionId: submission.id,
            businessId: businessId,
            customerId: customerId,
            documentType: submission.type,
            fileUrl: attachment_url,
            fileName: `attachment_${attachment_id}.jpg`,
          }
        });

        if (submitResponse.error) {
          console.error(`${submission.type} submission error:`, submitResponse.error);
          submissionResults.push({ type: submission.type, success: false, error: submitResponse.error });
        } else {
          console.log(`${submission.type} submitted successfully`);
          submissionResults.push({ type: submission.type, success: true, data: submitResponse.data });
        }
      } catch (error) {
        console.error(`Error submitting ${submission.type}:`, error);
        submissionResults.push({ type: submission.type, success: false, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${submissions.length} submission(s)`,
        submissions: submissionResults,
        parsed_data: parsedData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in auto-process-onebill:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
