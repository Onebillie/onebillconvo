import { useState, useEffect, useCallback } from "react";

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, LogOut, Settings as SettingsIcon, Bell, Menu, ArrowLeft, X, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Conversation, Message, Customer } from "@/types/chat";
import { ContactList } from "@/components/chat/ContactList";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ContactDetails } from "@/components/chat/ContactDetails";
import { CreateContactDialog } from "@/components/chat/CreateContactDialog";
import { ContactPickerDialog } from "@/components/chat/ContactPickerDialog";
import { EnhancedTemplateSelector } from "@/components/chat/EnhancedTemplateSelector";
import { AdminAssignment } from "@/components/chat/AdminAssignment";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useRealtimeConversations } from "@/hooks/useRealtimeConversations";
import { useGlobalNotifications } from "@/hooks/useGlobalNotifications";
import { TaskNotifications } from "@/components/tasks/TaskNotifications";
import { GlobalNotificationCenter } from "@/components/notifications/GlobalNotificationCenter";
import { ConversationContextMenu } from "@/components/conversations/ConversationContextMenu";
import { AssignDialog } from "@/components/conversations/AssignDialog";
import { MultiStatusDialog } from "@/components/conversations/MultiStatusDialog";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { ConversationFilters } from "@/components/chat/ConversationFilters";
import { DuplicateContactsBanner } from "@/components/conversations/DuplicateContactsBanner";
import { EmailSyncButton } from "@/components/chat/EmailSyncButton";
import { LimitReachedBanner } from "@/components/LimitReachedBanner";
import { RefreshButton } from "@/components/chat/RefreshButton";
import { AIToggle } from "@/components/chat/AIToggle";
import { AIResponseSuggestions } from "@/components/chat/AIResponseSuggestions";
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

const Dashboard = () => {
  const { profile, loading: authLoading, isAdmin, signOut } = useAuth();
  const { unreadCount } = useGlobalNotifications();
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [filters, setFilters] = useState<{ unread: boolean; statusIds: string[] }>({
    unread: false,
    statusIds: [],
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [contextMenuConversation, setContextMenuConversation] = useState<Conversation | null>(null);
  const [selectedMessageForTask, setSelectedMessageForTask] = useState<Message | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [latestInboundMessage, setLatestInboundMessage] = useState<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const navigate = useNavigate();

  // Handle URL parameters to auto-select conversation
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const conversationId = searchParams.get('conversation');
    
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        setSelectedConversation(conv);
        setShowContactDetails(false);
        setMobileMenuOpen(false);
        // Clear URL parameter
        window.history.replaceState({}, '', '/app/dashboard');
      }
    }
  }, [conversations]);

  const fetchConversations = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('conversations')
      .select(`
        *,
        customers!inner (
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
        ),
        assigned_user:profiles!fk_conversations_assigned_to(id, full_name, department),
        messages!messages_conversation_id_fkey(content, subject, platform, direction, created_at)
      `)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .order('created_at', { foreignTable: 'messages', ascending: false })
      .limit(100)
      .limit(1, { foreignTable: 'messages' }); // Get only the latest message

    if (error) {
      console.error('Error fetching conversations:', error);
      return;
    }

    // Deduplicate conversations by ID
    const uniqueConvs = (data || []).reduce((acc: any[], conv: any) => {
      if (!acc.find(c => c.id === conv.id)) {
        acc.push(conv);
      }
      return acc;
    }, []);

    // Fetch unread counts for all conversations in a single query
    const conversationIds = uniqueConvs.map(conv => conv.id);
    if (conversationIds.length === 0) {
      setConversations([]);
      setFilteredConversations([]);
      return;
    }

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
    const conversations = uniqueConvs.map(conv => ({
      ...conv,
      customer: conv.customers,
      status_tags: conv.conversation_statuses?.map((cs: any) => cs.conversation_status_tags) || [],
      unread_count: unreadCounts[conv.id] || 0,
      last_message: conv.messages?.[0] ? {
        content: conv.messages[0].content,
        subject: conv.messages[0].subject,
        platform: conv.messages[0].platform,
        direction: conv.messages[0].direction,
        created_at: conv.messages[0].created_at
      } : undefined
    }));
    
    setConversations(conversations);
    applyFilters(conversations, filters);
  }, [filters]);

  const applyFilters = useCallback((convs: Conversation[], currentFilters: typeof filters) => {
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
  }, []);

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    applyFilters(conversations, newFilters);
  }, [conversations, applyFilters]);

  const fetchMessages = useCallback(async (conversationId: string) => {
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
      .order('created_at', { ascending: false })
      .limit(200); // Limit to last 200 messages

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    // Transform and reverse to show oldest first
    const messages = (data || [])
      .map(msg => ({
        ...msg,
        direction: msg.direction as 'inbound' | 'outbound'
      }))
      .reverse();
    
    setMessages(messages);
  }, []);

  const markAsRead = useCallback(async (conversationId: string) => {
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("direction", "inbound");
  }, []);

  // Real-time message handlers with deduplication
  const handleNewMessage = useCallback((newMessage: Message) => {
    setMessages(prev => {
      // Check if message already exists by ID or external_message_id
      const exists = prev.some(
        msg => msg.id === newMessage.id || 
        (msg.external_message_id && msg.external_message_id === newMessage.external_message_id)
      );
      if (exists) return prev;
      return [...prev, newMessage];
    });
    
    if (newMessage.direction === 'inbound' && selectedConversation) {
      markAsRead(selectedConversation.id);
      setLatestInboundMessage(newMessage.content);
      setShowAISuggestions(true);
    }
  }, [selectedConversation, markAsRead]);

  const handleMessageUpdate = useCallback((updatedMessage: Message) => {
    setMessages(prev => {
      // Deduplicate while updating
      const existingIndex = prev.findIndex(msg => msg.id === updatedMessage.id);
      if (existingIndex === -1) return prev;
      
      const newMessages = [...prev];
      newMessages[existingIndex] = updatedMessage;
      return newMessages;
    });
  }, []);

  // Set up real-time subscriptions (only when tab is visible)
  useRealtimeMessages(
    isTabVisible ? (selectedConversation?.id || null) : null,
    handleNewMessage,
    handleMessageUpdate
  );

  useRealtimeConversations(() => {
    if (isTabVisible) {
      fetchConversations();
    }
  });

  // Handle tab visibility for pausing updates when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Track unsaved changes (if there's a draft in sessionStorage)
  useEffect(() => {
    if (selectedConversation?.id) {
      const storageKey = `message-draft-${selectedConversation.id}`;
      const checkDraft = () => {
        const draft = sessionStorage.getItem(storageKey);
        setHasUnsavedChanges(!!draft?.trim());
      };
      
      checkDraft();
      const interval = setInterval(checkDraft, 1000);
      return () => clearInterval(interval);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [selectedConversation?.id]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
    
    // Check if there's a conversation to open from notification click
    const openConversationId = localStorage.getItem('openConversation');
    if (openConversationId && conversations.length > 0) {
      const conversation = conversations.find(c => c.id === openConversationId);
      if (conversation) {
        setSelectedConversation(conversation);
        localStorage.removeItem('openConversation');
      }
    }
  }, [fetchConversations, conversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      markAsRead(selectedConversation.id);
      setShowAISuggestions(false);
      setLatestInboundMessage("");
    }
  }, [selectedConversation, fetchMessages, markAsRead]);

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
    navigate('/app/settings');
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

  const conversationSidebar = (
    <div className="h-full flex flex-col">
      {/* Sidebar Content */}
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {isMobile && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            <h1 className="font-semibold text-sm md:text-base">Customer Service</h1>
            {unreadCount > 0 && !isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ unread: true, statusIds: [] })}
                className="text-xs gap-1 h-6 px-2"
              >
                <Bell className="w-3 h-3" />
                {unreadCount}
              </Button>
            )}
          </div>
          {!isMobile && (
            <div className="flex items-center gap-2">
              <GlobalNotificationCenter />
              <TaskNotifications />
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <SettingsIcon className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <CreateContactDialog onContactCreated={fetchConversations} />
          <ContactPickerDialog
            onContactSelected={async (customerId) => {
              // Find or create conversation for the selected customer
              const { data: conversation } = await supabase
                .from("conversations")
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
                .eq("customer_id", customerId)
                .eq("is_archived", false)
                .maybeSingle();

              if (conversation) {
                setSelectedConversation({
                  ...conversation,
                  customer: conversation.customers,
                  status_tags: [],
                  unread_count: 0,
                });
                setMobileMenuOpen(false);
              }
              await fetchConversations();
            }}
          />
        </div>
      </div>

      {/* Filters */}
      <ConversationFilters onFilterChange={handleFilterChange} />

      {/* Duplicate Contacts Banner */}
      <div className="px-4 py-2">
        <DuplicateContactsBanner />
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <ContactList
          conversations={filteredConversations}
          selectedConversation={selectedConversation}
          onSelectConversation={(conv) => {
            setSelectedConversation(conv);
            setShowContactDetails(false);
            setMobileMenuOpen(false);
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
  );

  return (
    <>
      <UnsavedChangesGuard 
        hasUnsavedChanges={hasUnsavedChanges}
        message="You have an unsaved message. Are you sure you want to leave?"
      />
      <div className="h-screen flex flex-col md:flex-row bg-background">
      {/* Mobile: Sheet/Drawer for Sidebar */}
      {isMobile ? (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          {!selectedConversation && (
            <div className="w-full border-b border-border md:hidden">
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Menu className="w-4 h-4" />
                    </Button>
                  </SheetTrigger>
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <h1 className="text-sm font-semibold">Conversations</h1>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilters({ unread: true, statusIds: [] });
                        setMobileMenuOpen(true);
                      }}
                      className="h-6 px-2 text-xs gap-1 ml-1"
                    >
                      <Bell className="w-3 h-3" />
                      {unreadCount}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <GlobalNotificationCenter />
                  <TaskNotifications />
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
                      <SettingsIcon className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={signOut}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <SheetContent side="left" className="w-full sm:w-[85vw] p-0 max-w-md">
            {conversationSidebar}
          </SheetContent>
        </Sheet>
      ) : null}

      {/* Desktop: Resizable layout */}
      {!isMobile ? (
        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
          {/* Left: Conversations list - resizable and collapsible */}
          <ResizablePanel defaultSize={30} minSize={22} maxSize={45} collapsible>
            <div className="h-full border-r border-border">
              {conversationSidebar}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />

          {/* Center: Main Chat Area */}
          <ResizablePanel minSize={35}>
            <div className="h-full flex flex-col overflow-hidden">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-2 md:p-4 border-b border-border bg-background shadow-sm z-10 flex-shrink-0">
                    <div className="flex items-center justify-between gap-1 md:gap-2">
                      {isMobile && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedConversation(null)}
                          className="flex-shrink-0 h-8 w-8"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                      )}
                      <div 
                        className="flex items-center space-x-2 md:space-x-3 cursor-pointer hover:bg-muted/50 p-1.5 md:p-2 rounded-lg transition-colors flex-1 min-w-0"
                        onClick={() => setShowContactDetails(!showContactDetails)}
                      >
                        <Avatar className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0">
                          <AvatarImage src={selectedConversation.customer.avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {selectedConversation.customer.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h2 className="font-semibold text-xs md:text-base truncate">
                            {selectedConversation.customer.name}
                          </h2>
                          <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                            {selectedConversation.customer.phone}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                        <AIToggle conversationId={selectedConversation.id} />
                        
                        <RefreshButton
                          onRefresh={async () => {
                            await fetchMessages(selectedConversation.id);
                            await fetchConversations();
                            toast({
                              title: "Refreshed",
                              description: "Messages updated"
                            });
                          }}
                        />
                        
                        <EmailSyncButton onSyncComplete={() => {
                          if (selectedConversation) {
                            fetchMessages(selectedConversation.id);
                          }
                          fetchConversations();
                        }} />
                        
                        <div className="hidden lg:block">
                          <EnhancedTemplateSelector
                            conversationId={selectedConversation.id}
                            customerId={selectedConversation.customer.id}
                            customerPhone={selectedConversation.customer.phone}
                            customerEmail={selectedConversation.customer.email}
                            onTemplateSent={() => fetchMessages(selectedConversation.id)}
                          />
                        </div>
                        
                        <div className="hidden xl:block w-48">
                          <AdminAssignment
                            conversationId={selectedConversation.id}
                            currentAssignee={selectedConversation.assigned_to}
                            onAssignmentChange={fetchConversations}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Mobile: Second row for additional controls */}
                    <div className="flex lg:hidden items-center gap-1 mt-1.5">
                      <div className="flex-1">
                        <EnhancedTemplateSelector
                          conversationId={selectedConversation.id}
                          customerId={selectedConversation.customer.id}
                          customerPhone={selectedConversation.customer.phone}
                          customerEmail={selectedConversation.customer.email}
                          onTemplateSent={() => fetchMessages(selectedConversation.id)}
                        />
                      </div>
                      <div className="flex-1 xl:hidden">
                        <AdminAssignment
                          conversationId={selectedConversation.id}
                          currentAssignee={selectedConversation.assigned_to}
                          onAssignmentChange={fetchConversations}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Messages area - scrollable middle section */}
                  <div className="flex-1 overflow-hidden">
                    <div className="h-full flex flex-col">
                      <LimitReachedBanner />
                      <div className="flex-1 overflow-y-auto">
                        <MessageList
                          messages={messages}
                          onCreateTask={(message) => {
                            setSelectedMessageForTask(message);
                            setTaskDialogOpen(true);
                          }}
                          onMessageUpdate={() => fetchMessages(selectedConversation.id)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* AI Suggestions & Message Input - Fixed at bottom */}
                  <div className="flex-shrink-0 bg-background border-t shadow-sm">
                    <AIResponseSuggestions
                      conversationId={selectedConversation.id}
                      latestMessage={latestInboundMessage}
                      onSelectSuggestion={(suggestion) => {
                        setShowAISuggestions(false);
                      }}
                      isVisible={showAISuggestions}
                    />
                    <MessageInput
                      conversationId={selectedConversation.id}
                      customerId={selectedConversation.customer.id}
                      customerPhone={selectedConversation.customer.phone || ""}
                      customerEmail={selectedConversation.customer.email}
                      lastContactMethod={selectedConversation.customer.last_contact_method as "whatsapp" | "email"}
                      onMessageSent={() => {
                        fetchMessages(selectedConversation.id);
                        setShowAISuggestions(false);
                      }}
                      customer={selectedConversation.customer}
                      initialMessage=""
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-base md:text-lg font-medium text-muted-foreground">
                      {isMobile ? "Select a conversation" : "Select a conversation to start messaging"}
                    </h3>
                    {isMobile && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setMobileMenuOpen(true)}
                      >
                        <Menu className="w-4 h-4 mr-2" />
                        View Conversations
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>

          {/* Right: Contact details (optional) */}
          {showContactDetails && selectedConversation && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={25} minSize={18} maxSize={40} collapsible>
                <div className="h-full border-l border-border overflow-y-auto">
                  <ContactDetails
                    customer={selectedConversation.customer}
                    onUpdate={fetchConversations}
                  />
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      ) : (
        // Mobile: Main Chat Area
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-2 md:p-4 border-b border-border bg-background shadow-sm z-10 flex-shrink-0">
                <div className="flex items-center justify-between gap-1 md:gap-2">
                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedConversation(null)}
                      className="flex-shrink-0 h-8 w-8"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  )}
                  <div 
                    className="flex items-center space-x-2 md:space-x-3 cursor-pointer hover:bg-muted/50 p-1.5 md:p-2 rounded-lg transition-colors flex-1 min-w-0"
                    onClick={() => setShowContactDetails(!showContactDetails)}
                  >
                    <Avatar className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0">
                      <AvatarImage src={selectedConversation.customer.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedConversation.customer.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-xs md:text-base truncate">
                        {selectedConversation.customer.name}
                      </h2>
                      <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                        {selectedConversation.customer.phone}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                    <AIToggle conversationId={selectedConversation.id} />
                    <RefreshButton
                      onRefresh={async () => {
                        await fetchMessages(selectedConversation.id);
                        await fetchConversations();
                        toast({ title: "Refreshed", description: "Messages updated" });
                      }}
                    />
                    <EmailSyncButton onSyncComplete={() => {
                      if (selectedConversation) fetchMessages(selectedConversation.id);
                      fetchConversations();
                    }} />
                  </div>
                </div>
              </div>

              {/* Messages area - scrollable middle section */}
              <div className="flex-1 overflow-hidden">
                <div className="h-full flex flex-col">
                  <LimitReachedBanner />
                  <div className="flex-1 overflow-y-auto">
                    <MessageList
                      messages={messages}
                      onCreateTask={(message) => {
                        setSelectedMessageForTask(message);
                        setTaskDialogOpen(true);
                      }}
                      onMessageUpdate={() => fetchMessages(selectedConversation.id)}
                    />
                  </div>
                </div>
              </div>

              {/* AI Suggestions & Message Input - Fixed at bottom */}
              <div className="flex-shrink-0 bg-background border-t shadow-sm">
                <AIResponseSuggestions
                  conversationId={selectedConversation.id}
                  latestMessage={latestInboundMessage}
                  onSelectSuggestion={() => setShowAISuggestions(false)}
                  isVisible={showAISuggestions}
                />
                <MessageInput
                  conversationId={selectedConversation.id}
                  customerId={selectedConversation.customer.id}
                  customerPhone={selectedConversation.customer.phone || ""}
                  customerEmail={selectedConversation.customer.email}
                  lastContactMethod={selectedConversation.customer.last_contact_method as "whatsapp" | "email"}
                  onMessageSent={() => {
                    fetchMessages(selectedConversation.id);
                    setShowAISuggestions(false);
                  }}
                  customer={selectedConversation.customer}
                  initialMessage=""
                />
              </div>

              {/* Contact Details Panel - Mobile Sheet */}
              {showContactDetails && isMobile && (
                <Sheet open={showContactDetails} onOpenChange={setShowContactDetails}>
                  <SheetContent side="right" className="w-full sm:w-80 p-0">
                    <ContactDetails
                      customer={selectedConversation.customer}
                      onUpdate={fetchConversations}
                    />
                  </SheetContent>
                </Sheet>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-base md:text-lg font-medium text-muted-foreground">
                  {isMobile ? "Select a conversation" : "Select a conversation to start messaging"}
                </h3>
                {isMobile && (
                  <Button variant="outline" className="mt-4" onClick={() => setMobileMenuOpen(true)}>
                    <Menu className="w-4 h-4 mr-2" />
                    View Conversations
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}


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
    </>
  );
};

export default Dashboard;