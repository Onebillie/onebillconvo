import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;

    console.log('SMS status update:', { messageSid, messageStatus });

    // Update message status in database
    const { error } = await supabase
      .from('messages')
      .update({ status: messageStatus })
      .eq('external_message_id', messageSid);

    if (error) {
      console.error('Error updating message status:', error);
    }

    return new Response('OK', { status: 200 });

  } catch (error: any) {
    console.error('Status callback error:', error);
    return new Response('OK', { status: 200 });
  }
});