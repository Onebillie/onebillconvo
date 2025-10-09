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
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId, onNewMessage, onMessageUpdate]);
};
