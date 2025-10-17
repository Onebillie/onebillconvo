import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { Message, Customer } from '@/types/chat';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

export default function EmbedConversation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
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

      if (validation.scope !== 'conversation') {
        setError('Invalid token scope');
        setLoading(false);
        return;
      }

      setBusinessId(validation.business_id);
      setCustomer(validation.customer);

      // Load customization
      const { data: customizationData } = await supabase
        .from('embed_customizations')
        .select('*')
        .eq('business_id', validation.business_id)
        .maybeSingle();

      if (customizationData) {
        setCustomization(customizationData);
      }

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

  if (!customer || !conversationId || !businessId) {
    return null;
  }

  return (
    <>
      {customization.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: customization.custom_css }} />
      )}
      <div className="flex flex-col h-screen" style={customStyle}>
        <div className="border-b px-4 py-3" style={{ backgroundColor: 'var(--background-color)' }}>
          <div className="flex items-center gap-3">
            {customization.logo_url && (
              <img src={customization.logo_url} alt="Logo" className="h-8 w-auto" />
            )}
            <div>
              <h2 className="font-semibold" style={{ color: 'var(--text-color)' }}>
                {customer.name}
              </h2>
              {customer.email && (
                <p className="text-sm" style={{ color: 'var(--text-color)', opacity: 0.7 }}>
                  {customer.email}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden" style={{ backgroundColor: 'var(--background-color)' }}>
          <MessageList messages={messages} />
        </div>

        <div className="border-t" style={{ backgroundColor: 'var(--background-color)' }}>
          <MessageInput
            conversationId={conversationId}
            customerId={customer.id}
            customerPhone={customer.phone || ''}
            onMessageSent={() => loadMessages(conversationId)}
          />
        </div>
      </div>
    </>
  );
}