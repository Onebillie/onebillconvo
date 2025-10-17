import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Conversation } from '@/types/chat';
import { Loader2 } from 'lucide-react';
import { ContactList } from '@/components/chat/ContactList';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { Message } from '@/types/chat';

interface EmbedCustomization {
  primary_color?: string;
  secondary_color?: string;
  background_color?: string;
  text_color?: string;
  font_family?: string;
  border_radius?: string;
  logo_url?: string;
  custom_css?: string;
}

export default function EmbedInbox() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [customization, setCustomization] = useState<EmbedCustomization>({});

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

      // Load customization
      const { data: customizationData } = await supabase
        .from('embed_customizations')
        .select('*')
        .eq('business_id', validation.business_id)
        .maybeSingle();

      if (customizationData) {
        setCustomization(customizationData);
      }

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

  const customStyle = {
    '--primary-color': customization.primary_color || '#3b82f6',
    '--secondary-color': customization.secondary_color || '#8b5cf6',
    '--background-color': customization.background_color || '#ffffff',
    '--text-color': customization.text_color || '#1f2937',
    '--border-radius': customization.border_radius || '0.5rem',
    fontFamily: customization.font_family || 'system-ui',
  } as React.CSSProperties;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={customStyle}>
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen" style={customStyle}>
        <div className="text-center">
          <p className="font-semibold mb-2" style={{ color: 'var(--text-color)' }}>Authentication Error</p>
          <p style={{ color: 'var(--text-color)', opacity: 0.7 }}>{error}</p>
        </div>
      </div>
    );
  }

  const selectedConv = conversations.find((c) => c.id === selectedConversation);

  return (
    <>
      {customization.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: customization.custom_css }} />
      )}
      <div className="flex h-screen" style={customStyle}>
        <div className="w-80 border-r overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--background-color)' }}>
          <div className="p-4 border-b flex items-center gap-3">
            {customization.logo_url && (
              <img src={customization.logo_url} alt="Logo" className="h-8 w-auto" />
            )}
            <h2 className="font-semibold" style={{ color: 'var(--text-color)' }}>Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ContactList
              conversations={conversations}
              selectedConversation={selectedConv || null}
              onSelectConversation={handleConversationSelect}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col" style={{ backgroundColor: 'var(--background-color)' }}>
          {selectedConversation && selectedConv ? (
            <>
              <div className="border-b px-4 py-3">
                <h2 className="font-semibold" style={{ color: 'var(--text-color)' }}>
                  {selectedConv.customer?.name}
                </h2>
                {selectedConv.customer?.email && (
                  <p className="text-sm" style={{ color: 'var(--text-color)', opacity: 0.7 }}>
                    {selectedConv.customer.email}
                  </p>
                )}
              </div>
              
              <div className="flex-1 overflow-hidden">
                <MessageList messages={messages} />
              </div>

              <div className="border-t">
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
              <p style={{ color: 'var(--text-color)', opacity: 0.7 }}>
                Select a conversation to start messaging
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}