import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { Message, Customer } from '@/types/chat';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EmbedConversation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!token) {
      setError('Missing authentication token');
      setLoading(false);
      return;
    }

    validateTokenAndLoadData();
  }, [token]);

  const validateTokenAndLoadData = async () => {
    try {
      // Validate SSO token by passing token as query parameter
      const supabaseUrl = 'https://jrtlrnfdqfkjlkpfirzr.supabase.co';
      const url = `${supabaseUrl}/functions/v1/api-sso-validate-token?token=${encodeURIComponent(token || '')}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        setError('Invalid or expired token');
        setLoading(false);
        return;
      }

      const validation = await response.json();

      if (validation.scope !== 'conversation') {
        setError('Invalid token scope');
        setLoading(false);
        return;
      }

      setBusinessId(validation.business_id);
      setCustomer(validation.customer);

      // Get or create conversation
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('customer_id', validation.customer_id)
        .eq('business_id', validation.business_id)
        .order('created_at', { ascending: false })
        .limit(1);

      let convId = conversations?.[0]?.id;

      if (!convId) {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            customer_id: validation.customer_id,
            business_id: validation.business_id,
            status: 'active',
          })
          .select()
          .single();

        if (convError) throw convError;
        convId = newConv.id;
      }

      setConversationId(convId);

      // Load messages
      await loadMessages(convId);

      setLoading(false);
    } catch (err: any) {
      console.error('Error validating token:', err);
      setError(err.message || 'Failed to validate token');
      setLoading(false);
    }
  };

  const loadMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        message_attachments(*)
      `)
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
      return;
    }

    setMessages((data || []) as Message[]);
  };

  const handleNewMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleMessageUpdate = (updatedMessage: Message) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <p className="text-destructive font-semibold mb-2">Authentication Error</p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!customer || !conversationId || !businessId) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="border-b px-4 py-3 bg-card">
        <h2 className="font-semibold text-foreground">{customer.name}</h2>
        {customer.email && (
          <p className="text-sm text-muted-foreground">{customer.email}</p>
        )}
      </div>
      
      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} />
      </div>

      <div className="border-t bg-card">
        <MessageInput
          conversationId={conversationId}
          customerId={customer.id}
          customerPhone={customer.phone || ''}
          onMessageSent={() => loadMessages(conversationId)}
        />
      </div>
    </div>
  );
}
