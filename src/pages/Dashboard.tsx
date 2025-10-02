import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, LogOut, Settings as SettingsIcon, Bell } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Conversation, Message, Template, Customer } from "@/types/chat";
import { ContactList } from "@/components/chat/ContactList";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ContactDetails } from "@/components/chat/ContactDetails";
import { CreateContactDialog } from "@/components/chat/CreateContactDialog";
import { TemplateSelector } from "@/components/chat/TemplateSelector";
import { AdminAssignment } from "@/components/chat/AdminAssignment";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useRealtimeConversations } from "@/hooks/useRealtimeConversations";
import { useGlobalNotifications } from "@/hooks/useGlobalNotifications";
import { TaskNotifications } from "@/components/tasks/TaskNotifications";
import { ConversationContextMenu } from "@/components/conversations/ConversationContextMenu";
import { AssignDialog } from "@/components/conversations/AssignDialog";
import { MultiStatusDialog } from "@/components/conversations/MultiStatusDialog";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { ConversationFilters } from "@/components/chat/ConversationFilters";

const Dashboard = () => {
  const { profile, loading: authLoading } = useAuth();
  const { unreadCount } = useGlobalNotifications();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [filters, setFilters] = useState<{ unread: boolean; statusIds: string[] }>({
    unread: false,
    statusIds: [],
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [contextMenuConversation, setContextMenuConversation] = useState<Conversation | null>(null);
  const [selectedMessageForTask, setSelectedMessageForTask] = useState<Message | null>(null);
  const navigate = useNavigate();

  const fetchConversations = async () => {
    const { data, error } = await (supabase as any)
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
        ),
        conversation_statuses (
          status_tag_id,
          conversation_status_tags (
            id,
            name,
            color
          )
        )
      `)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return;
    }

    // Fetch unread counts for all conversations
    const conversationIds = (data || []).map(conv => conv.id);
    const { data: unreadData } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .eq('direction', 'inbound')
      .eq('is_read', false);

    // Count unread messages per conversation
    const unreadCounts = (unreadData || []).reduce((acc: Record<string, number>, msg: any) => {
      acc[msg.conversation_id] = (acc[msg.conversation_id] || 0) + 1;
      return acc;
    }, {});

    // Transform data to match interface
    const conversations = (data || []).map(conv => ({
      ...conv,
      customer: conv.customers,
      status_tags: conv.conversation_statuses?.map((cs: any) => cs.conversation_status_tags) || [],
      unread_count: unreadCounts[conv.id] || 0
    }));
    
    setConversations(conversations);
    applyFilters(conversations, filters);
  };

  const applyFilters = (convs: Conversation[], currentFilters: typeof filters) => {
    let filtered = [...convs];

    // Filter by unread
    if (currentFilters.unread) {
      filtered = filtered.filter(conv => 
        conv.unread_count && conv.unread_count > 0
      );
    }

    // Filter by status
    if (currentFilters.statusIds.length > 0) {
      filtered = filtered.filter(conv =>
        conv.status_tags?.some(tag => currentFilters.statusIds.includes(tag.id))
      );
    }

    setFilteredConversations(filtered);
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    applyFilters(conversations, newFilters);
  };

  const fetchMessages = async (conversationId: string) => {
    const { data, error } = await (supabase as any)
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

  // Real-time message handlers
  const handleNewMessage = useCallback((newMessage: Message) => {
    setMessages(prev => [...prev, newMessage]);
    if (newMessage.direction === 'inbound' && selectedConversation) {
      markAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  const handleMessageUpdate = useCallback((updatedMessage: Message) => {
    setMessages(prev => prev.map(msg => 
      msg.id === updatedMessage.id ? updatedMessage : msg
    ));
  }, []);

  // Set up real-time subscriptions
  useRealtimeMessages(
    selectedConversation?.id || null,
    handleNewMessage,
    handleMessageUpdate
  );

  useRealtimeConversations(fetchConversations);

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

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      toast({
        title: "Conversation deleted",
        description: "The conversation has been deleted successfully",
      });

      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }

      fetchConversations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete conversation",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    navigate('/settings');
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    navigate("/auth");
    return null;
  }

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
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <TaskNotifications />
              {profile?.role && ['admin', 'superadmin'].includes(profile.role) && (
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <SettingsIcon className="w-4 h-4" />
                </Button>
              )}
            </div>
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

        {/* Filters */}
        <ConversationFilters onFilterChange={handleFilterChange} />

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <ContactList
            conversations={filteredConversations}
            selectedConversation={selectedConversation}
            onSelectConversation={(conv) => {
              setSelectedConversation(conv);
              setShowContactDetails(false);
            }}
            contextMenu={(conversation) => (
              <ConversationContextMenu
                onAssign={() => {
                  setContextMenuConversation(conversation);
                  setAssignDialogOpen(true);
                }}
                onChangeStatus={() => {
                  setContextMenuConversation(conversation);
                  setStatusDialogOpen(true);
                }}
                onCreateTask={() => {
                  setContextMenuConversation(conversation);
                  setTaskDialogOpen(true);
                }}
                onDelete={() => handleDeleteConversation(conversation.id)}
              />
            )}
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
                <MessageList 
                  messages={messages}
                  onCreateTask={(message) => {
                    setSelectedMessageForTask(message);
                    setTaskDialogOpen(true);
                  }}
                />
                <MessageInput
                  conversationId={selectedConversation.id}
                  customerId={selectedConversation.customer.id}
                  customerPhone={selectedConversation.customer.phone || ""}
                  customerEmail={selectedConversation.customer.email}
                  lastContactMethod={selectedConversation.customer.last_contact_method as "whatsapp" | "email"}
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

      {/* Dialogs */}
      {contextMenuConversation && (
        <>
          <AssignDialog
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            conversationId={contextMenuConversation.id}
            currentAssignedTo={contextMenuConversation.assigned_to || undefined}
            onAssignmentChange={() => {
              fetchConversations();
              if (selectedConversation?.id === contextMenuConversation.id) {
                setSelectedConversation({ ...contextMenuConversation });
              }
            }}
          />
          {/* Multi Status Dialog */}
          <MultiStatusDialog
            open={statusDialogOpen}
            onOpenChange={setStatusDialogOpen}
            conversationId={contextMenuConversation.id}
            currentStatuses={contextMenuConversation.status_tags?.map(t => t.id) || []}
            onStatusChange={fetchConversations}
          />
        </>
      )}
      
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={(open) => {
          setTaskDialogOpen(open);
          if (!open) {
            setSelectedMessageForTask(null);
            setContextMenuConversation(null);
          }
        }}
        conversationId={contextMenuConversation?.id || selectedConversation?.id}
        customerId={contextMenuConversation?.customer_id || selectedConversation?.customer_id}
        messageId={selectedMessageForTask?.id}
        messageContent={selectedMessageForTask?.content}
        onTaskCreated={() => {
          toast({
            title: "Task Created",
            description: "The task has been created successfully",
          });
        }}
      />
    </div>
  );
};

export default Dashboard;