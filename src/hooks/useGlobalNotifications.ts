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
    // Request notification permission if not already granted
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          toast.success('Notifications enabled', {
            description: 'You will receive notifications for new messages'
          });
        }
      });
    }

    fetchUnreadCount();

    // Get current user for department check
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    };

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
          try {
            const newMessage = payload.new as any;
            
            // Throttle notifications - only show one every 3 seconds
            const now = Date.now();
            if (now - lastNotificationRef.current < 3000) {
              // Just update count without showing toast
              fetchUnreadCount();
              return;
            }
            
            lastNotificationRef.current = now;

            // Get current user
            const currentUser = await getCurrentUser();
            if (!currentUser) return;

            // Fetch conversation details including assigned user
            const { data: conversation } = await supabase
              .from('conversations')
              .select(`
                id,
                assigned_to,
                customer:customers(name)
              `)
              .eq('id', newMessage.conversation_id)
              .single();

            // Determine if this user should be notified
            let shouldNotify = false;
            
            if (!conversation?.assigned_to) {
              // Unassigned conversation - notify everyone
              shouldNotify = true;
            } else if (conversation.assigned_to === currentUser.id) {
              // Directly assigned to this user
              shouldNotify = true;
            } else {
              // Check if same department as assigned user
              const { data: assignedUser } = await supabase
                .from('profiles')
                .select('department')
                .eq('id', conversation.assigned_to)
                .single();
                
              const { data: currentUserProfile } = await supabase
                .from('profiles')
                .select('department')
                .eq('id', currentUser.id)
                .single();
                
              if (assignedUser?.department && currentUserProfile?.department && 
                  assignedUser.department === currentUserProfile.department) {
                shouldNotify = true; // Same department
              }
            }

            if (!shouldNotify) {
              // Just update count for this user
              fetchUnreadCount();
              return;
            }
            
            // Debounce the toast to avoid spam
            if (toastTimeoutRef.current) {
              clearTimeout(toastTimeoutRef.current);
            }
            
            toastTimeoutRef.current = setTimeout(async () => {
              const customerName = conversation?.customer?.name || 'Unknown';
              const messagePreview = newMessage.content.substring(0, 40);
              const channel = newMessage.channel === 'email' ? '📧' : '💬';

              // Show clickable toast notification
              toast.success(`${channel} New Message`, {
                description: `${customerName}: ${messagePreview}...`,
                duration: 5000,
                action: {
                  label: 'View',
                  onClick: () => {
                    // Navigate to dashboard and select conversation
                    window.location.href = `/app/dashboard?conversation=${newMessage.conversation_id}`;
                  },
                },
              });

              // Show browser notification if permission granted
              if (Notification.permission === 'granted') {
                try {
                  const notification = new Notification(`${channel} New Message from ${customerName}`, {
                    body: messagePreview,
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    tag: `message-${newMessage.id}`,
                    data: { 
                      conversationId: newMessage.conversation_id,
                      messageId: newMessage.id 
                    },
                    requireInteraction: false,
                    silent: false,
                  });

                  notification.onclick = () => {
                    window.focus();
                    // Navigate to conversation
                    window.location.href = `/app/dashboard?conversation=${newMessage.conversation_id}`;
                    notification.close();
                  };
                } catch (error) {
                  console.error('Failed to show browser notification:', error);
                }
              }
            }, 300);

            // Update unread count immediately
            fetchUnreadCount();
          } catch (error) {
            console.error('Failed to process notification:', error);
            // Still update count even if notification fails
            fetchUnreadCount();
          }
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
