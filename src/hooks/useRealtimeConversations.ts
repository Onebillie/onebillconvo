import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRealtimeConversations = (onUpdate: () => void) => {
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<number>(0);
  const isSubscribedRef = useRef<boolean>(true);
  
  // Optimized debounce - immediate updates for better UX
  const debouncedUpdate = useCallback(() => {
    if (!isSubscribedRef.current) return;
    
    const now = Date.now();
    // Allow updates every 1 second minimum for responsive UI
    if (now - lastUpdateRef.current < 1000) {
      return;
    }
    
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      if (isSubscribedRef.current) {
        lastUpdateRef.current = Date.now();
        onUpdate();
      }
    }, 500); // Quick 500ms debounce for responsive updates
  }, [onUpdate]);

  useEffect(() => {
    isSubscribedRef.current = true;
    
    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          debouncedUpdate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_statuses',
        },
        () => {
          debouncedUpdate();
        }
      )
      .subscribe();

    return () => {
      isSubscribedRef.current = false;
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [debouncedUpdate]);
};
