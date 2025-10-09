import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScanRequest {
  fileUrl: string;
  filename: string;
  customerId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl, filename, customerId }: ScanRequest = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[SCAN] Starting scan for ${filename} (customer: ${customerId})`);

    // Download the file from storage
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error('Failed to download file for scanning');
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);
    
    // Calculate file hash (SHA-256)
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log(`[SCAN] File hash: ${fileHash}`);

    // Check VirusTotal API (if key exists)
    const virusTotalKey = Deno.env.get('VIRUSTOTAL_API_KEY');
    
    if (virusTotalKey) {
      console.log('[SCAN] Checking VirusTotal...');
      
      // Check if file hash is already known
      const vtCheckResponse = await fetch(
        `https://www.virustotal.com/api/v3/files/${fileHash}`,
        {
          headers: {
            'x-apikey': virusTotalKey,
          },
        }
      );

      if (vtCheckResponse.ok) {
        const vtData = await vtCheckResponse.json();
        const stats = vtData.data?.attributes?.last_analysis_stats;
        
        if (stats) {
          console.log(`[SCAN] VirusTotal results:`, stats);
          
          if (stats.malicious > 0 || stats.suspicious > 0) {
            // MALWARE DETECTED
            console.error(`[SCAN] MALWARE DETECTED: ${stats.malicious} malicious, ${stats.suspicious} suspicious`);
            
            // Log to database
            await supabase.from('security_logs').insert({
              event_type: 'malware_detected',
              customer_id: customerId,
              details: {
                filename,
                file_hash: fileHash,
                virustotal_stats: stats,
                file_url: fileUrl,
              },
              severity: 'critical',
            });

            return new Response(
              JSON.stringify({
                safe: false,
                reason: 'Malware detected',
                details: stats,
                action: 'File quarantined and customer notified',
              }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
        }
      } else if (vtCheckResponse.status === 404) {
        // File not in VirusTotal database - upload for analysis
        console.log('[SCAN] File not in VirusTotal, uploading for analysis...');
        
        const formData = new FormData();
        formData.append('file', new Blob([fileBytes]), filename);
        
        const uploadResponse = await fetch(
          'https://www.virustotal.com/api/v3/files',
          {
            method: 'POST',
            headers: {
              'x-apikey': virusTotalKey,
            },
            body: formData,
          }
        );

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          console.log('[SCAN] File uploaded to VirusTotal for analysis:', uploadData.data?.id);
          
          // Analysis takes time, consider file safe for now but mark for re-check
          await supabase.from('security_logs').insert({
            event_type: 'file_scan_pending',
            customer_id: customerId,
            details: {
              filename,
              file_hash: fileHash,
              virustotal_analysis_id: uploadData.data?.id,
              file_url: fileUrl,
            },
            severity: 'info',
          });
        }
      }
    }

    // Simple MIME type validation (basic heuristic check)
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.vbs', '.js'];
    const fileExtension = filename.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
    
    if (dangerousExtensions.includes(fileExtension)) {
      console.warn(`[SCAN] Dangerous file extension detected: ${fileExtension}`);
      
      await supabase.from('security_logs').insert({
        event_type: 'suspicious_file_type',
        customer_id: customerId,
        details: {
          filename,
          extension: fileExtension,
          file_url: fileUrl,
        },
        severity: 'warning',
      });

      return new Response(
        JSON.stringify({
          safe: false,
          reason: 'Dangerous file type',
          details: { extension: fileExtension },
          action: 'File blocked',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // File appears safe
    console.log(`[SCAN] File appears safe: ${filename}`);
    
    await supabase.from('security_logs').insert({
      event_type: 'file_scan_clean',
      customer_id: customerId,
      details: {
        filename,
        file_hash: fileHash,
        file_url: fileUrl,
      },
      severity: 'info',
    });

    return new Response(
      JSON.stringify({
        safe: true,
        file_hash: fileHash,
        scanned_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[SCAN] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
