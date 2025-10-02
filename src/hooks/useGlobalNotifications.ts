import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useGlobalNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const toastTimeoutRef = useRef<NodeJS.Timeout>();
  const lastNotificationRef = useRef<number>(0);

  const fetchUnreadCount = useCallback(async () => {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('direction', 'inbound')
      .eq('is_read', false);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();

    // Listen to all new inbound messages
    const channel = supabase
      .channel('global-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'direction=eq.inbound',
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Throttle notifications - only show one every 3 seconds
          const now = Date.now();
          if (now - lastNotificationRef.current < 3000) {
            // Just update count without showing toast
            fetchUnreadCount();
            return;
          }
          
          lastNotificationRef.current = now;
          
          // Debounce the toast to avoid spam
          if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
          }
          
          toastTimeoutRef.current = setTimeout(async () => {
            // Simplified query - just get customer name
            const { data: conversation } = await supabase
              .from('conversations')
              .select('customer:customers(name)')
              .eq('id', newMessage.conversation_id)
              .single();

            const customerName = conversation?.customer?.name || 'Unknown';
            const messagePreview = newMessage.content.substring(0, 40);

            // Show toast notification
            toast.success('New Message', {
              description: `${customerName}: ${messagePreview}...`,
              duration: 5000,
            });
          }, 300);

          // Update unread count immediately
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        () => {
          // Refresh count when messages are marked as read
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [fetchUnreadCount]);

  return { unreadCount, refreshUnreadCount: fetchUnreadCount };
};
