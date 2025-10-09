import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRealtimeConversations = (onUpdate: () => void) => {
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<number>(0);
  const isSubscribedRef = useRef<boolean>(true);
  
  // Debounce updates to prevent excessive refetching
  const debouncedUpdate = useCallback(() => {
    if (!isSubscribedRef.current) return;
    
    const now = Date.now();
    // Only allow updates every 2 seconds minimum
    if (now - lastUpdateRef.current < 2000) {
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
    }, 1000); // Wait 1s before updating
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
