import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface InternalMessage {
  id: string;
  business_id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  priority: string;
  related_conversation_id: string | null;
  related_task_id: string | null;
  created_at: string;
  sender?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  recipient?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export const useInMail = () => {
  const { user, currentBusinessId } = useAuth();
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && currentBusinessId) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [user, currentBusinessId]);

  const fetchMessages = async () => {
    if (!user || !currentBusinessId) return;

    const { data, error } = await supabase
      .from('internal_messages')
      .select(`
        *,
        sender:sender_id (id, full_name, email, avatar_url),
        recipient:recipient_id (id, full_name, email, avatar_url)
      `)
      .eq('business_id', currentBusinessId)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data as any);
    
    const unread = data.filter(
      m => m.recipient_id === user.id && !m.is_read
    ).length;
    setUnreadCount(unread);
    setLoading(false);
  };

  const subscribeToMessages = () => {
    if (!user || !currentBusinessId) return;

    const channel = supabase
      .channel('internal-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'internal_messages',
          filter: `business_id=eq.${currentBusinessId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (
    recipientId: string,
    subject: string,
    content: string,
    priority: string = 'normal',
    relatedConversationId?: string,
    relatedTaskId?: string
  ) => {
    if (!user || !currentBusinessId) return null;

    const { data, error } = await supabase
      .from('internal_messages')
      .insert([
        {
          business_id: currentBusinessId,
          sender_id: user.id,
          recipient_id: recipientId,
          subject,
          content,
          priority,
          related_conversation_id: relatedConversationId || null,
          related_task_id: relatedTaskId || null,
        },
      ])
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
      return null;
    }

    toast({
      title: 'Success',
      description: 'Message sent successfully',
    });

    return data;
  };

  const markAsRead = async (messageId: string) => {
    const { error } = await supabase
      .from('internal_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) {
      console.error('Error marking message as read:', error);
      return false;
    }

    fetchMessages();
    return true;
  };

  const deleteMessage = async (messageId: string, asRecipient: boolean) => {
    const updateField = asRecipient ? 'deleted_by_recipient' : 'deleted_by_sender';
    
    const { error } = await supabase
      .from('internal_messages')
      .update({ [updateField]: true })
      .eq('id', messageId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Success',
      description: 'Message deleted successfully',
    });

    fetchMessages();
    return true;
  };

  return {
    messages,
    unreadCount,
    loading,
    fetchMessages,
    sendMessage,
    markAsRead,
    deleteMessage,
  };
};
