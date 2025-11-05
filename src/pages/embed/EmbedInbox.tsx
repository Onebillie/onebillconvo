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

export default function EmbedInbox() {
  const [searchParams] = useSearchParams();
  const apiKey = searchParams.get('apiKey');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [customization, setCustomization] = useState<EmbedCustomization>({});

  useEffect(() => {
    if (!apiKey) {
      setError('Missing API key');
      setLoading(false);
      return;
    }

    validateAndLoadData();
  }, [apiKey]);

  // Broadcast presence when widget is active - ENHANCED TRACKING
  useEffect(() => {
    if (!selectedConversation) return;

    console.log('[EmbedInbox] Setting up presence for conversation:', selectedConversation);
    const presenceChannel = supabase.channel(`embed-presence-${selectedConversation}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        console.log('[EmbedInbox] Presence synced, active clients:', Object.keys(state).length);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log('[EmbedInbox] Client joined:', key);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('[EmbedInbox] Client left:', key);
      })
      .subscribe(async (status) => {
        console.log('[EmbedInbox] Channel status:', status);
        if (status === 'SUBSCRIBED') {
          const trackResult = await presenceChannel.track({
            online_at: new Date().toISOString(),
            conversation_id: selectedConversation,
            user_agent: navigator.userAgent,
            page: 'embed_inbox'
          });
          console.log('[EmbedInbox] Initial presence tracked:', trackResult);
        }
      });

    // Update presence every 15 seconds to keep it alive (more frequent)
    const presenceInterval = setInterval(async () => {
      const trackResult = await presenceChannel.track({
        online_at: new Date().toISOString(),
        conversation_id: selectedConversation,
        user_agent: navigator.userAgent,
        page: 'embed_inbox'
      });
      console.log('[EmbedInbox] Presence heartbeat sent:', trackResult);
    }, 15000);

    return () => {
      console.log('[EmbedInbox] Cleaning up presence for:', selectedConversation);
      clearInterval(presenceInterval);
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
    };
  }, [selectedConversation]);

  // Set up real-time subscription for messages
  useEffect(() => {
    if (!selectedConversation) return;

    console.log('[EmbedInbox] Setting up real-time subscription for conversation:', selectedConversation);

    const channel = supabase
      .channel(`embed-inbox-messages-${selectedConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation}`,
        },
        async (payload) => {
          console.log('[EmbedInbox] New message received:', payload.new);
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
          filter: `conversation_id=eq.${selectedConversation}`,
        },
        async (payload) => {
          console.log('[EmbedInbox] Message updated:', payload.new);
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
      console.log('[EmbedInbox] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  const validateAndLoadData = async () => {
    try {
      // Validate API key via Edge Function (bypasses RLS safely)
      const { data: result, error: fnError } = await supabase.functions.invoke('api-validate-api-key', {
        headers: {
          'x-api-key': apiKey || '',
        },
      });

      if (fnError || !result?.valid) {
        console.error('API key validation failed:', fnError || result);
        setError('Invalid API key');
        setLoading(false);
        return;
      }

      const bizId: string = result.business_id;
      setBusinessId(bizId);

      if (result.customization) {
        setCustomization(result.customization as EmbedCustomization);
      }

      await loadConversations(bizId);
      setLoading(false);
    } catch (err: any) {
      console.error('Error loading embed:', err);
      setError(err.message || 'Failed to load embed');
      setLoading(false);
    }
  };

  const loadConversations = async (bizId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('api-embed-data', {
        headers: { 'x-api-key': apiKey || '' },
        body: { resource: 'conversations', business_id: bizId },
      });

      if (error) {
        console.error('Error loading conversations (fn):', error);
        return;
      }

      setConversations((data?.conversations || []) as any);
    } catch (err) {
      console.error('Error loading conversations (catch):', err);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('api-embed-data', {
        headers: { 'x-api-key': apiKey || '' },
        body: { resource: 'messages', conversation_id: conversationId },
      });

      if (error) {
        console.error('Error loading messages (fn):', error);
        return;
      }

      const mapped = (data?.messages || []).map((msg: any) => ({
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
    } catch (err) {
      console.error('Error loading messages (catch):', err);
    }
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

  const selectedConv = conversations.find((c) => c.id === selectedConversation);

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
          .contact-list-container {
            ${customization.hide_header_on_mobile ? 'display: none !important;' : 'width: 100% !important; max-width: 100% !important;'}
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
        className={`embed-container flex ${layoutClasses[customization.layout_mode as keyof typeof layoutClasses] || layoutClasses.floating} ${sizeClasses}`}
        style={customStyle}
      >
        <div className="contact-list-container w-80 border-r overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--background-color)' }}>
          <div className="p-4 border-b flex items-center gap-3">
            {customization.logo_url && (
              <img src={customization.logo_url} alt="Embedded inbox logo" className="h-8 w-auto" />
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
                <MessageList messages={messages} isEmbedActive={true} />
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