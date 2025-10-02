import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRealtimeConversations = (onUpdate: () => void) => {
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Debounce updates to prevent excessive refetching
  const debouncedUpdate = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      onUpdate();
    }, 500); // Wait 500ms before updating
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
