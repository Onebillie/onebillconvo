import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function logMessageEvent(
  supabaseUrl: string,
  supabaseKey: string,
  messageId: string,
  eventType: 'created' | 'sent' | 'delivered' | 'read' | 'failed' | 'bounced' | 'opened' | 'clicked',
  status: 'pending' | 'processing' | 'success' | 'failed',
  platform: string,
  metadata?: any,
  errorDetails?: { code?: string; message?: string; details?: any }
) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const logEntry: any = {
    message_id: messageId,
    timestamp: new Date().toISOString(),
    event_type: eventType,
    status: status,
    platform: platform,
    metadata: metadata || {},
    delivery_attempt: 1
  };

  if (errorDetails) {
    logEntry.error_code = errorDetails.code;
    logEntry.error_message = errorDetails.message;
    logEntry.error_details = errorDetails.details;
  }

  const { error } = await supabase
    .from('message_logs')
    .insert(logEntry);

  if (error) {
    console.error('Failed to log message event:', error);
  }
}

export async function updateMessageStatus(
  supabaseUrl: string,
  supabaseKey: string,
  messageId: string,
  deliveryStatus: string,
  platformMessageId?: string,
  errorDetails?: any
) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const updateData: any = {
    delivery_status: deliveryStatus,
    updated_at: new Date().toISOString()
  };

  if (platformMessageId) {
    updateData.platform_message_id = platformMessageId;
  }

  if (errorDetails) {
    updateData.last_error = errorDetails;
    updateData.retry_count = (await supabase
      .from('messages')
      .select('retry_count')
      .eq('id', messageId)
      .single()).data?.retry_count || 0 + 1;
  }

  const { error } = await supabase
    .from('messages')
    .update(updateData)
    .eq('id', messageId);

  if (error) {
    console.error('Failed to update message status:', error);
  }
}
