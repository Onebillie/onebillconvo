import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ContactList } from "@/components/chat/ContactList";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { toast } from "sonner";

import { Conversation as ConvType, Message as MsgType } from "@/types/chat";

type Conversation = ConvType;
type Message = MsgType;

export default function CustomerInboxEmbed() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const projectUrl = "https://jrtlrnfdqfkjlkpfirzr.supabase.co";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("apiKey");
    
    if (!key) {
      setError("Missing API key. Please provide apiKey parameter.");
      setLoading(false);
      return;
    }
    
    setApiKey(key);
    loadConversations(key);
  }, []);

  const loadConversations = async (key: string) => {
    try {
      const res = await fetch(`${projectUrl}/functions/v1/api-embed-data?resource=conversations`, {
        headers: { "x-api-key": key },
      });

      if (!res.ok) {
        throw new Error("Failed to load conversations");
      }

      const data = await res.json();
      const convs = data.conversations || [];
      
      setConversations(convs);
      
      // Auto-select first conversation
      if (convs.length > 0) {
        setSelectedConversation(convs[0]);
        await loadMessages(convs[0].id, key);
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error("Load error:", err);
      setError(err.message || "Failed to load conversations");
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string, key?: string) => {
    try {
      const res = await fetch(
        `${projectUrl}/functions/v1/api-embed-data?resource=messages&conversation_id=${conversationId}`,
        { headers: { "x-api-key": key || apiKey } }
      );

      if (!res.ok) throw new Error("Failed to load messages");

      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err: any) {
      console.error("Messages error:", err);
      toast.error("Failed to load messages");
    }
  };

  const handleConversationSelect = async (conv: Conversation) => {
    setSelectedConversation(conv);
    await loadMessages(conv.id);
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return;

    try {
      const res = await fetch(`${projectUrl}/functions/v1/embed-operation`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operation: "send_message",
          data: {
            conversation_id: selectedConversation.id,
            content,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const result = await res.json();
      if (result.success) {
        await loadMessages(selectedConversation.id);
        toast.success("Message sent");
      }
    } catch (err: any) {
      console.error("Send error:", err);
      toast.error("Failed to send message");
    }
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
      <div className="flex items-center justify-center h-screen bg-background p-4">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-destructive">Error</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-background">
      {conversations.length > 1 && (
        <div className="w-80 border-r overflow-y-auto">
          <ContactList
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleConversationSelect}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <MessageList
          messages={messages}
          isEmbedActive={true}
        />
        <MessageInput
          conversationId={selectedConversation?.id || ""}
          customerId={selectedConversation?.customer_id}
          customerPhone={selectedConversation?.customer?.phone}
          customerEmail={selectedConversation?.customer?.email}
          lastContactMethod="embed"
          onMessageSent={() => selectedConversation && loadMessages(selectedConversation.id)}
          embedMode={true}
        />
      </div>
    </div>
  );
}
