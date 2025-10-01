import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Conversation, Message, Template, Customer } from "@/types/chat";
import { ContactList } from "@/components/chat/ContactList";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ContactDetails } from "@/components/chat/ContactDetails";
import { CreateContactDialog } from "@/components/chat/CreateContactDialog";
import { TemplateSelector } from "@/components/chat/TemplateSelector";
import { AdminAssignment } from "@/components/chat/AdminAssignment";

const Dashboard = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchConversations();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      markAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);


  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        customers (
          id,
          name,
          phone,
          email,
          avatar,
          last_active,
          notes
        )
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return;
    }

    // Transform data to match interface
    const conversations = (data || []).map(conv => ({
      ...conv,
      customer: conv.customers
    }));
    
    setConversations(conversations);
  };

  const fetchMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        message_attachments (
          id,
          filename,
          url,
          type,
          size
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    // Transform data to ensure direction is properly typed
    const messages = (data || []).map(msg => ({
      ...msg,
      direction: msg.direction as 'inbound' | 'outbound'
    }));
    
    setMessages(messages);
  };

  const markAsRead = async (conversationId: string) => {
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("direction", "inbound");
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-templates");
      if (error) throw error;
      setTemplates(data.templates || []);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-6 h-6 text-primary" />
              <h1 className="font-semibold">Customer Service</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <CreateContactDialog onContactCreated={fetchConversations} />
            {selectedConversation && (
              <TemplateSelector
                templates={templates}
                customerPhone={selectedConversation.customer.phone || ""}
                onTemplateSent={() => fetchMessages(selectedConversation.id)}
              />
            )}
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <ContactList
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={(conv) => {
              setSelectedConversation(conv);
              setShowContactDetails(false);
            }}
          />
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-background">
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center space-x-3 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors flex-1"
                  onClick={() => setShowContactDetails(!showContactDetails)}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedConversation.customer.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedConversation.customer.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold text-base">
                      {selectedConversation.customer.name}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedConversation.customer.phone}
                    </p>
                  </div>
                </div>
                
                <div className="w-48">
                  <AdminAssignment
                    conversationId={selectedConversation.id}
                    currentAssignee={selectedConversation.assigned_to}
                    onAssignmentChange={fetchConversations}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Messages */}
              <div className="flex-1 flex flex-col">
                <MessageList messages={messages} />
                <MessageInput
                  conversationId={selectedConversation.id}
                  customerPhone={selectedConversation.customer.phone || ""}
                  onMessageSent={() => fetchMessages(selectedConversation.id)}
                />
              </div>

              {/* Contact Details Panel */}
              {showContactDetails && (
                <div className="w-80 border-l border-border overflow-y-auto">
                  <ContactDetails
                    customer={selectedConversation.customer}
                    onUpdate={fetchConversations}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">
                Select a conversation to start messaging
              </h3>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;