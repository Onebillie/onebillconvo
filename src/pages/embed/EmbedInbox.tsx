import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Conversation } from '@/types/chat';
import { Loader2 } from 'lucide-react';
import { ContactList } from '@/components/chat/ContactList';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { Message } from '@/types/chat';

export default function EmbedInbox() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
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

      if (validation.scope !== 'inbox') {
        setError('Invalid token scope');
        setLoading(false);
        return;
      }

      setBusinessId(validation.business_id);
      await loadConversations(validation.business_id);
      setLoading(false);
    } catch (err: any) {
      console.error('Error validating token:', err);
      setError(err.message || 'Failed to validate token');
      setLoading(false);
    }
  };

  const loadConversations = async (bizId: string) => {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('business_id', bizId)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }

    setConversations((data || []) as any);
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        message_attachments(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages((data || []) as Message[]);
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation.id);
    loadMessages(conversation.id);
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

  const selectedConv = conversations.find((c) => c.id === selectedConversation);

  return (
    <div className="flex h-screen bg-background">
      <div className="w-80 border-r bg-card overflow-hidden flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-foreground">Conversations</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ContactList
            conversations={conversations}
            selectedConversation={selectedConv || null}
            onSelectConversation={handleConversationSelect}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedConversation && selectedConv ? (
          <>
            <div className="border-b px-4 py-3 bg-card">
              <h2 className="font-semibold text-foreground">{selectedConv.customer?.name}</h2>
              {selectedConv.customer?.email && (
                <p className="text-sm text-muted-foreground">{selectedConv.customer.email}</p>
              )}
            </div>
            
            <div className="flex-1 overflow-hidden">
              <MessageList messages={messages} />
            </div>

            <div className="border-t bg-card">
              <MessageInput
                conversationId={selectedConversation}
                customerId={selectedConv.customer_id}
                customerPhone={selectedConv.customer?.phone || ''}
                onMessageSent={() => loadMessages(selectedConversation)}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
