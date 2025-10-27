import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/chat';

export const useRealtimeMessages = (
  conversationId: string | null,
  onNewMessage: (message: Message) => void,
  onMessageUpdate: (message: Message) => void
) => {
  useEffect(() => {
    if (!conversationId) return;

    let isSubscribed = true;

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (isSubscribed) {
            onNewMessage(payload.new as Message);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (isSubscribed) {
            onMessageUpdate(payload.new as Message);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_attachments',
        },
        async (payload) => {
          try {
            const { data: fullMessage } = await supabase
              .from('messages')
              .select('*, message_attachments(*)')
              .eq('id', (payload.new as any).message_id)
              .maybeSingle();

            if (fullMessage && fullMessage.conversation_id === conversationId && isSubscribed) {
              onMessageUpdate(fullMessage as unknown as Message);
            }
          } catch (e) {
            console.error('Realtime attachment fetch failed', e);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'message_attachments',
        },
        async (payload) => {
          try {
            const { data: fullMessage } = await supabase
              .from('messages')
              .select('*, message_attachments(*)')
              .eq('id', (payload.new as any).message_id)
              .maybeSingle();

            if (fullMessage && fullMessage.conversation_id === conversationId && isSubscribed) {
              onMessageUpdate(fullMessage as unknown as Message);
            }
          } catch (e) {
            console.error('Realtime attachment fetch failed (update)', e);
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId, onNewMessage, onMessageUpdate]);
};
