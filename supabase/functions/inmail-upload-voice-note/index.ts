import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const recipientId = formData.get('recipientId') as string;
    const subject = formData.get('subject') as string;
    const businessId = formData.get('businessId') as string;
    const duration = parseInt(formData.get('duration') as string);
    const conversationId = formData.get('conversationId') as string || null;
    const taskId = formData.get('taskId') as string || null;

    if (!audioFile || !recipientId || !businessId) {
      throw new Error('Missing required fields');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${user.id}/${timestamp}-voice-note.webm`;

    console.log('Uploading voice note:', filename);

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('inmail-voice-notes')
      .upload(filename, audioFile, {
        contentType: 'audio/webm',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('inmail-voice-notes')
      .getPublicUrl(filename);

    console.log('Voice note uploaded:', publicUrl);

    // Create internal message record
    const { data: message, error: messageError } = await supabase
      .from('internal_messages')
      .insert({
        business_id: businessId,
        sender_id: user.id,
        recipient_id: recipientId,
        subject: subject || 'Voice Note',
        content: '🎤 Voice message',
        message_type: 'voice_note',
        audio_url: publicUrl,
        audio_duration: duration,
        related_conversation_id: conversationId,
        related_task_id: taskId,
        priority: 'normal'
      })
      .select()
      .single();

    if (messageError) {
      console.error('Message creation error:', messageError);
      throw messageError;
    }

    console.log('Voice note message created:', message.id);

    return new Response(
      JSON.stringify({ success: true, message, audioUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in voice note upload:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
