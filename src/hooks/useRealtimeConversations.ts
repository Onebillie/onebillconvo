import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRealtimeConversations = (onUpdate: () => void) => {
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<number>(0);
  const isSubscribedRef = useRef<boolean>(true);
  
  // Optimized debounce - reduced frequency from every 1-2s to every 8s
  const debouncedUpdate = useCallback(() => {
    if (!isSubscribedRef.current) return;
    
    const now = Date.now();
    // Only allow updates every 8 seconds minimum (reduced from 2s)
    if (now - lastUpdateRef.current < 8000) {
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
    }, 3000); // Wait 3s before updating (increased from 1s)
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
