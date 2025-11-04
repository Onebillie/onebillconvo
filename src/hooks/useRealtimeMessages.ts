import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/chat';

export const useRealtimeMessages = (
  conversationId: string | null,
  onNewMessage: (message: Message) => void,
  onMessageUpdate: (message: Message) => void
) => {
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingUpdatesRef = useRef<Set<string>>(new Set());
  const lastFetchedAttachments = useRef<Map<string, string>>(new Map());

  // Debounced batch update function - prevents excessive re-renders
  const debouncedUpdate = useCallback(async (messageId: string) => {
    pendingUpdatesRef.current.add(messageId);
    
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(async () => {
      const messageIds = Array.from(pendingUpdatesRef.current);
      pendingUpdatesRef.current.clear();
      
      if (messageIds.length === 0) return;
      
      console.log('[useRealtimeMessages] Processing batched attachment updates:', messageIds);
      
      try {
        // Batch fetch all pending messages with attachments
        const { data: messages } = await supabase
          .from('messages')
          .select(`
            *,
            message_attachments (
              id,
              filename,
              url,
              type,
              size,
              duration_seconds
            )
          `)
          .in('id', messageIds)
          .eq('conversation_id', conversationId);
        
        messages?.forEach(msg => {
          // Create a stable key from attachment IDs and filenames
          const attachmentKey = msg.message_attachments
            ?.map((a: any) => `${a.id}-${a.filename}`)
            .sort()
            .join('|') || '';
          
          const lastKey = lastFetchedAttachments.current.get(msg.id);
          
          // Only trigger update if attachments actually changed
          if (attachmentKey !== lastKey) {
            lastFetchedAttachments.current.set(msg.id, attachmentKey);
            
            const mappedMessage = {
              ...msg,
              message_attachments: msg.message_attachments?.map((att: any) => ({
                id: att.id,
                filename: att.filename,
                url: att.url,
                type: att.type,
                size: att.size,
                duration_seconds: att.duration_seconds
              }))
            };
            onMessageUpdate(mappedMessage as unknown as Message);
            console.log('[useRealtimeMessages] Attachment changed, updating message:', msg.id);
          } else {
            console.log('[useRealtimeMessages] No attachment change, skipping update:', msg.id);
          }
        });
      } catch (e) {
        console.error('Batch message update failed', e);
      }
    }, 300); // 300ms debounce for smooth batching
  }, [conversationId, onMessageUpdate]);

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
          if (isSubscribed) {
            const messageId = (payload.new as any).message_id;
            debouncedUpdate(messageId);
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
          if (isSubscribed) {
            const messageId = (payload.new as any).message_id;
            debouncedUpdate(messageId);
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [conversationId, onNewMessage, onMessageUpdate, debouncedUpdate]);
};
