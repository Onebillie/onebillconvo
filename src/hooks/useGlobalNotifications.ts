import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useGlobalNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);

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
          
          // Fetch customer details for the notification
          const { data: conversation } = await supabase
            .from('conversations')
            .select(`
              customer:customers (
                name,
                phone,
                email
              )
            `)
            .eq('id', newMessage.conversation_id)
            .single();

          const customerName = conversation?.customer?.name || 'Unknown';
          const messagePreview = newMessage.content.substring(0, 50);

          // Show prominent toast notification
          toast.success('New Message Received', {
            description: `${customerName}: ${messagePreview}${newMessage.content.length > 50 ? '...' : ''}`,
            duration: 8000,
            action: {
              label: 'View',
              onClick: () => {
                window.location.href = '/dashboard';
              },
            },
          });

          // Update unread count
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
      supabase.removeChannel(channel);
    };
  }, [fetchUnreadCount]);

  return { unreadCount, refreshUnreadCount: fetchUnreadCount };
};
