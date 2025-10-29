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
  sizing_mode?: string;
  layout_mode?: string;
  mobile_width?: string;
  mobile_height?: string;
  tablet_width?: string;
  tablet_height?: string;
  desktop_width?: string;
  desktop_height?: string;
  custom_width?: string;
  custom_height?: string;
  max_width?: string;
  max_height?: string;
  min_width?: string;
  min_height?: string;
  enable_mobile_fullscreen?: boolean;
  hide_header_on_mobile?: boolean;
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

  // Set up real-time subscription for messages
  useEffect(() => {
    if (!conversationId) return;

    console.log('[EmbedConversation] Setting up real-time subscription for conversation:', conversationId);

    const channel = supabase
      .channel(`embed-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log('[EmbedConversation] New message received:', payload.new);
          // Fetch the full message with attachments
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              message_attachments (
                id,
                filename,
                url,
                type,
                size,
                duration_seconds
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data as Message]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log('[EmbedConversation] Message updated:', payload.new);
          // Fetch the full message with attachments
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              message_attachments (
                id,
                filename,
                url,
                type,
                size,
                duration_seconds
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === data.id ? (data as Message) : msg))
            );
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[EmbedConversation] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

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
        message_attachments (
          id,
          filename,
          url,
          type,
          size,
          duration_seconds
        )
      `)
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
      return;
    }

    const mapped = (data || []).map((msg: any) => ({
      ...msg,
      message_attachments: msg.message_attachments?.map((att: any) => ({
        id: att.id,
        filename: att.filename,
        url: att.url,
        type: att.type,
        size: att.size,
        duration_seconds: att.duration_seconds,
      })),
    }));

    setMessages(mapped as Message[]);
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
    '--embed-width': customization.custom_width || '100%',
    '--embed-height': customization.custom_height || '100%',
    '--embed-max-width': customization.max_width || '100vw',
    '--embed-max-height': customization.max_height || '100vh',
    '--embed-min-width': customization.min_width || '300px',
    '--embed-min-height': customization.min_height || '400px',
    '--mobile-width': customization.mobile_width || '100%',
    '--mobile-height': customization.mobile_height || '100vh',
    '--tablet-width': customization.tablet_width || '400px',
    '--tablet-height': customization.tablet_height || '600px',
    '--desktop-width': customization.desktop_width || '450px',
    '--desktop-height': customization.desktop_height || '700px',
    fontFamily: customization.font_family || 'system-ui',
  } as React.CSSProperties;

  const layoutClasses = {
    floating: 'fixed bottom-4 right-4 rounded-lg shadow-2xl',
    embedded: 'w-full h-full',
    fullscreen: 'fixed inset-0 w-screen h-screen',
    sidebar: 'fixed inset-y-0 right-0 h-screen shadow-2xl'
  };

  const sizeClasses = customization.sizing_mode === 'responsive' 
    ? 'w-full h-full max-w-[var(--embed-max-width)] max-h-[var(--embed-max-height)] min-w-[var(--embed-min-width)] min-h-[var(--embed-min-height)]'
    : customization.sizing_mode === 'fullscreen'
    ? 'w-screen h-screen'
    : 'w-[var(--embed-width)] h-[var(--embed-height)]';

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
      <style>{`
        /* Responsive breakpoints */
        @media (max-width: 768px) {
          .embed-container {
            width: var(--mobile-width) !important;
            height: var(--mobile-height) !important;
            ${customization.enable_mobile_fullscreen ? 'position: fixed !important; inset: 0 !important; max-width: 100vw !important; max-height: 100vh !important;' : ''}
          }
          ${customization.hide_header_on_mobile ? '.embed-header { display: none !important; }' : ''}
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .embed-container {
            width: var(--tablet-width) !important;
            height: var(--tablet-height) !important;
          }
        }

        @media (min-width: 1025px) {
          .embed-container {
            width: var(--desktop-width) !important;
            height: var(--desktop-height) !important;
          }
        }
      `}</style>
      <div 
        className={`embed-container flex flex-col ${layoutClasses[customization.layout_mode as keyof typeof layoutClasses] || layoutClasses.floating} ${sizeClasses}`}
        style={customStyle}
      >
        <div className="embed-header border-b px-4 py-3" style={{ backgroundColor: 'var(--background-color)' }}>
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