import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRealtimeConversations = (onUpdate: () => void) => {
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<number>(0);
  
  // Debounce updates to prevent excessive refetching
  const debouncedUpdate = useCallback(() => {
    const now = Date.now();
    // Only allow updates every 2 seconds minimum
    if (now - lastUpdateRef.current < 2000) {
      return;
    }
    
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      lastUpdateRef.current = Date.now();
      onUpdate();
    }, 1000); // Wait 1s before updating
  }, [onUpdate]);

  useEffect(() => {
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
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [debouncedUpdate]);
};
