import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ContactList } from "@/components/chat/ContactList";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ContactDetailsEmbed } from "@/components/chat/ContactDetailsEmbed";
import { EmbedTopBar } from "@/components/embed/EmbedTopBar";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { toast } from "sonner";

import { Conversation as ConvType, Message as MsgType } from "@/types/chat";

type Conversation = ConvType;
type Message = MsgType;

export default function FullInboxEmbed() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statusTags, setStatusTags] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

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
    loadInitialData(key);
  }, []);

  const loadInitialData = async (key: string) => {
    try {
      // Load conversations, status tags, and staff in parallel
      const [convsRes, tagsRes, staffRes] = await Promise.all([
        fetch(`${projectUrl}/functions/v1/api-embed-data?resource=conversations`, {
          headers: { "x-api-key": key },
        }),
        fetch(`${projectUrl}/functions/v1/api-embed-data?resource=status_tags`, {
          headers: { "x-api-key": key },
        }),
        fetch(`${projectUrl}/functions/v1/api-embed-data?resource=staff`, {
          headers: { "x-api-key": key },
        }),
      ]);

      if (!convsRes.ok || !tagsRes.ok || !staffRes.ok) {
        throw new Error("Failed to load data");
      }

      const convsData = await convsRes.json();
      const tagsData = await tagsRes.json();
      const staffData = await staffRes.json();

      setConversations(convsData.conversations || []);
      setStatusTags(tagsData.status_tags || []);
      setStaff(staffData.staff || []);
      setLoading(false);
    } catch (err: any) {
      console.error("Load error:", err);
      setError(err.message || "Failed to load data");
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const res = await fetch(
        `${projectUrl}/functions/v1/api-embed-data?resource=messages&conversation_id=${conversationId}`,
        { headers: { "x-api-key": apiKey } }
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

  const handleToggleAI = async (enabled: boolean) => {
    try {
      const res = await fetch(`${projectUrl}/functions/v1/embed-operation`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operation: "toggle_ai",
          data: { enabled },
        }),
      });

      if (!res.ok) throw new Error("Failed to toggle AI");
      
      toast.success(`AI ${enabled ? "enabled" : "disabled"}`);
    } catch (err: any) {
      console.error("Toggle AI error:", err);
      toast.error("Failed to toggle AI");
    }
  };

  const handleSyncEmails = async () => {
    try {
      const res = await fetch(`${projectUrl}/functions/v1/embed-operation`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operation: "sync_emails",
          data: {},
        }),
      });

      if (!res.ok) throw new Error("Failed to sync emails");
      
      toast.success("Email sync triggered");
    } catch (err: any) {
      console.error("Sync error:", err);
      toast.error("Failed to sync emails");
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
    <div className="h-screen w-full flex flex-col bg-background">
      <EmbedTopBar
        onToggleAI={handleToggleAI}
        onSyncEmails={handleSyncEmails}
      />
      
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <ContactList
              conversations={conversations}
              selectedConversation={selectedConversation}
              onSelectConversation={handleConversationSelect}
            />
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="flex flex-col h-full">
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
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            {selectedConversation && (
              <ContactDetailsEmbed
                conversation={selectedConversation}
                embedMode={true}
                permissionLevel="admin"
              />
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
