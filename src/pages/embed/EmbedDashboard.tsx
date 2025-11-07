import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Conversation, Message } from "@/types/chat";
import { ContactList } from "@/components/chat/ContactList";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ContactDetailsEmbed } from "@/components/chat/ContactDetailsEmbed";
import { Loader2 } from "lucide-react";

type PermissionLevel = 'read_only' | 'agent' | 'admin';

interface EmbedCustomization {
  primary_color?: string;
  background_color?: string;
  text_color?: string;
  font_family?: string;
  border_radius?: string;
  header_color?: string;
  message_bubble_color?: string;
  layout_mode?: 'default' | 'compact' | 'wide';
  max_width?: string;
  max_height?: string;
  show_customer_details?: boolean;
}

export default function EmbedDashboard() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('read_only');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [customization, setCustomization] = useState<EmbedCustomization>({});

  useEffect(() => {
    const apiKey = searchParams.get("apiKey");
    if (apiKey) {
      validateAndLoadData(apiKey);
    } else {
      setError("API key is required");
      setLoading(false);
    }
  }, [searchParams]);

  const validateAndLoadData = async (apiKey: string) => {
    try {
      setLoading(true);
      
      // Create embed session
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
        "create-embed-session",
        {
          body: { apiKey, metadata: { source: 'dashboard_embed' } }
        }
      );

      if (sessionError || !sessionData) {
        throw new Error("Failed to create session");
      }

      setSessionToken(sessionData.session_token);
      setBusinessId(sessionData.business_id);
      setPermissionLevel(sessionData.permission_level);

      // Load conversations
      await loadConversations(sessionData.business_id);

      // Load customization if available
      const { data: validationData } = await supabase.functions.invoke(
        "api-validate-api-key",
        {
          body: { apiKey }
        }
      );

      if (validationData?.customization) {
        setCustomization(validationData.customization);
      }

      setLoading(false);
    } catch (err: any) {
      console.error("Validation error:", err);
      setError(err.message || "Failed to validate API key");
      setLoading(false);
    }
  };

  const loadConversations = async (bizId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("api-embed-data", {
        body: {
          resource: "conversations",
          business_id: bizId
        }
      });

      if (error) throw error;

      if (data?.conversations) {
        setConversations(data.conversations);
        
        // Auto-select first conversation
        if (data.conversations.length > 0) {
          const firstConv = data.conversations[0];
          setSelectedConversation(firstConv);
          await loadMessages(firstConv.id);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("api-embed-data", {
        body: {
          resource: "messages",
          conversation_id: conversationId
        }
      });

      if (error) throw error;

      if (data?.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  const handleConversationSelect = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    await loadMessages(conversation.id);
  };

  const handleSendMessage = async (content: string, attachments: any[]) => {
    if (!sessionToken || !selectedConversation) return;

    try {
      const { data, error } = await supabase.functions.invoke("embed-operation", {
        headers: {
          "x-session-token": sessionToken
        },
        body: {
          operation: "send_message",
          data: {
            conversation_id: selectedConversation.id,
            content,
            attachments
          }
        }
      });

      if (error) throw error;

      // Reload messages
      await loadMessages(selectedConversation.id);
    } catch (err) {
      console.error("Failed to send message:", err);
      throw err;
    }
  };

  const handleMessageUpdate = (updatedMessage: Message) => {
    setMessages(prev => 
      prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
    );
  };

  // Custom styles from customization
  const customStyle = {
    "--embed-primary": customization.primary_color || "hsl(var(--primary))",
    "--embed-background": customization.background_color || "hsl(var(--background))",
    "--embed-text": customization.text_color || "hsl(var(--foreground))",
    "--embed-font": customization.font_family || "inherit",
    "--embed-radius": customization.border_radius || "var(--radius)",
    "--embed-header": customization.header_color || "hsl(var(--card))",
    "--embed-bubble": customization.message_bubble_color || "hsl(var(--primary))",
  } as React.CSSProperties;

  const layoutClasses = customization.layout_mode === 'compact' 
    ? 'max-w-4xl' 
    : customization.layout_mode === 'wide' 
    ? 'max-w-full' 
    : 'max-w-6xl';

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
          <h2 className="text-2xl font-bold text-destructive mb-2">Authentication Error</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-screen bg-background overflow-hidden"
      style={customStyle}
    >
      <div className={`mx-auto h-full ${layoutClasses}`}>
        <div className="grid h-full grid-cols-1 lg:grid-cols-[300px_1fr_280px] gap-0">
          {/* Conversations List */}
          <div className="border-r border-border bg-card overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border bg-muted/50">
              <h2 className="text-lg font-semibold">Conversations</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {conversations.length} total • {permissionLevel} access
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ContactList
                conversations={conversations}
                selectedConversation={selectedConversation}
                onSelectConversation={handleConversationSelect}
              />
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex flex-col bg-background">
            {selectedConversation ? (
              <>
                <div className="flex-1 overflow-hidden">
                  <MessageList
                    messages={messages}
                    onMessageUpdate={() => {}}
                  />
                </div>
                {permissionLevel !== 'read_only' && (
                  <div className="border-t border-border bg-card p-4">
                    <MessageInput
                      conversationId={selectedConversation.id}
                      onMessageSent={handleSendMessage}
                      embedMode={true}
                      embedSessionToken={sessionToken || undefined}
                    />
                  </div>
                )}
                {permissionLevel === 'read_only' && (
                  <div className="border-t border-border bg-muted/50 p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Read-only mode • Upgrade to Agent or Admin permission to send messages
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Select a conversation to view messages</p>
              </div>
            )}
          </div>

          {/* Customer Details */}
          {selectedConversation && customization.show_customer_details !== false && (
            <div className="border-l border-border bg-card overflow-y-auto">
              <ContactDetailsEmbed
                conversation={selectedConversation}
                embedMode={true}
                permissionLevel={permissionLevel}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
