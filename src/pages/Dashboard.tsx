import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, LogOut, Settings as SettingsIcon, Bell, ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { PersistentHeader } from "@/components/PersistentHeader";
import { MultiStatusDialog } from "@/components/conversations/MultiStatusDialog";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { ConversationFilters } from "@/components/chat/ConversationFilters";
import { ConversationFilters as FilterType } from "@/types/chat";
import { DuplicateContactsBanner } from "@/components/conversations/DuplicateContactsBanner";
import { EmailSyncButton } from "@/components/chat/EmailSyncButton";
import { LimitReachedBanner } from "@/components/LimitReachedBanner";
import { RefreshButton } from "@/components/chat/RefreshButton";
import { AIToggle } from "@/components/chat/AIToggle";
import { AIResponseSuggestions } from "@/components/chat/AIResponseSuggestions";
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard";
import { PendingPaymentBanner } from "@/components/PendingPaymentBanner";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { WhatsAppAnalyticsWidget } from "@/components/dashboard/WhatsAppAnalyticsWidget";

const Dashboard = () => {
  const { profile, loading: authLoading, isAdmin, signOut } = useAuth();
  const { unreadCount } = useGlobalNotifications();
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [filters, setFilters] = useState<FilterType>({
    search: '',
    unread: false,
    statusIds: [],
    dateRange: { from: null, to: null },
    sortBy: 'newest',
    platforms: [],
    assignedTo: null,
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [contextMenuConversation, setContextMenuConversation] = useState<Conversation | null>(null);
  const [selectedMessageForTask, setSelectedMessageForTask] = useState<Message | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [latestInboundMessage, setLatestInboundMessage] = useState<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const navigate = useNavigate();

  // Refs for resizable panel
  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<ImperativePanelHandle>(null);

  // Set panel size once on mount and clear any old saved sizes
  useLayoutEffect(() => {
    // Clear any old saved panel sizes from localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('react-resizable-panels:')) {
        localStorage.removeItem(key);
      }
    });
    
    // Set initial size once
    const timer = setTimeout(() => {
      if (leftPanelRef.current) {
        leftPanelRef.current.resize(30);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []); // Run only once on mount


  // Handle URL parameters to auto-select conversation
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const conversationId = searchParams.get('conversation');
    
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        setSelectedConversation(conv);
        setShowContactDetails(false);
        // Clear URL parameter
        window.history.replaceState({}, '', '/app/dashboard');
      }
    }
  }, [conversations]);

  const fetchConversations = useCallback(async () => {
    // Build server-side filter query
    let query = supabase
      .from('conversations')
      .select(`
        *,
        customers!inner (
          id,
          name,
          first_name,
          last_name,
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
        messages!messages_conversation_id_fkey(content, subject, platform, direction, created_at, is_read)
      `)
      .eq('is_archived', false);

    // Apply server-side filters for status
    if (filters.statusIds.length > 0) {
      query = query.in('status_tag_id', filters.statusIds);
    }

    // Apply server-side filter for assigned user
    if (filters.assignedTo) {
      if (filters.assignedTo === 'unassigned') {
        query = query.is('assigned_to', null);
      } else {
        query = query.eq('assigned_to', filters.assignedTo);
      }
    }

    // Apply date range filter
    if (filters.dateRange.from) {
      query = query.gte('updated_at', filters.dateRange.from.toISOString());
    }
    if (filters.dateRange.to) {
      query = query.lte('updated_at', filters.dateRange.to.toISOString());
    }

    // Apply search filter on customer name, email, phone
    if (filters.search) {
      query = query.or(`customers.name.ilike.%${filters.search}%,customers.phone.ilike.%${filters.search}%,customers.email.ilike.%${filters.search}%`);
    }

    const { data, error } = await query
      .order('updated_at', { ascending: filters.sortBy === 'oldest' })
      .order('created_at', { foreignTable: 'messages', ascending: false })
      .limit(30)
      .limit(5, { foreignTable: 'messages' });

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

    if (uniqueConvs.length === 0) {
      setConversations([]);
      setFilteredConversations([]);
      return;
    }

    // Calculate unread counts from fetched messages
    const conversations = uniqueConvs.map(conv => {
      const unreadCount = conv.messages?.filter((m: any) => 
        m.direction === 'inbound' && !m.is_read
      ).length || 0;

      return {
        ...conv,
        customer: conv.customers,
        status_tags: conv.conversation_statuses?.map((cs: any) => cs.conversation_status_tags) || [],
        unread_count: unreadCount,
        last_message: conv.messages?.[0] ? {
          content: conv.messages[0].content,
          subject: conv.messages[0].subject,
          platform: conv.messages[0].platform,
          direction: conv.messages[0].direction,
          created_at: conv.messages[0].created_at
        } : undefined
      };
    });
    
    setConversations(conversations);
    applyFilters(conversations, filters);
  }, [filters]);

  const applyFilters = useCallback((convs: Conversation[], currentFilters: FilterType) => {
    let filtered = [...convs];

    // Client-side filters (for additional filtering not done server-side)
    
    // Filter by unread
    if (currentFilters.unread) {
      filtered = filtered.filter(conv => 
        conv.unread_count && conv.unread_count > 0
      );
    }

    // Filter by platforms
    if (currentFilters.platforms.length > 0) {
      filtered = filtered.filter(conv =>
        conv.last_message && currentFilters.platforms.includes(conv.last_message.platform)
      );
    }

    // Sort by different criteria
    switch (currentFilters.sortBy) {
      case 'oldest':
        filtered.sort((a, b) => 
          new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
        );
        break;
      case 'unread':
        filtered.sort((a, b) => 
          (b.unread_count || 0) - (a.unread_count || 0)
        );
        break;
      case 'name_asc':
        filtered.sort((a, b) => 
          a.customer.name.localeCompare(b.customer.name)
        );
        break;
      case 'name_desc':
        filtered.sort((a, b) => 
          b.customer.name.localeCompare(a.customer.name)
        );
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    }

    setFilteredConversations(filtered);
  }, []);

  const handleFilterChange = useCallback((newFilters: FilterType) => {
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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header - Only show on desktop, mobile has its own header */}
      {!isMobile && (
        <div className="p-3 md:p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              <h1 className="font-semibold text-sm md:text-base">Customer Service</h1>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({ 
                    search: '',
                    unread: true, 
                    statusIds: [],
                    dateRange: { from: null, to: null },
                    sortBy: 'newest',
                    platforms: [],
                    assignedTo: null,
                  })}
                  className="text-xs gap-1 h-6 px-2"
                >
                  <Bell className="w-3 h-3" />
                  {unreadCount}
                </Button>
              )}
            </div>
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
                    customer: conversation.customers as Customer,
                    status_tags: [],
                  });
                }
              }}
            />
          </div>
        </div>
      )}
      
      {/* Mobile-specific header content */}
      {isMobile && (
        <div className="flex-shrink-0 p-3 border-b border-border space-y-3">
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
                    customer: conversation.customers as Customer,
                    status_tags: [],
                  });
                }
              }}
            />
          </div>
        </div>
      )}
      
      <DuplicateContactsBanner />
      
      <div className="flex-shrink-0">
        <ConversationFilters
          onFilterChange={handleFilterChange}
          currentFilters={filters}
        />
      </div>

      {/* Contacts list - scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <ContactList
          conversations={filteredConversations}
          selectedConversation={selectedConversation}
          onSelectConversation={setSelectedConversation}
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
              onDelete={() => {
                if (confirm('Are you sure you want to delete this conversation?')) {
                  handleDeleteConversation(conversation.id);
                }
              }}
            />
          )}
        />
      </div>
    </div>
  );

  // Render chat area (shared between mobile and desktop)
  const renderChatArea = () => (
    <>
      {selectedConversation ? (
        <>
          {/* Chat Header */}
          <div className="flex-shrink-0 p-3 border-b border-border bg-background shadow-sm">
            <div className="flex items-center gap-2">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedConversation(null)}
                  className="flex-shrink-0 h-9 w-9"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors flex-1 min-w-0"
                onClick={() => !isMobile && setShowContactDetails(!showContactDetails)}
              >
                <Avatar className="w-9 h-9 flex-shrink-0">
                  <AvatarImage src={selectedConversation.customer.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {selectedConversation.customer.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-sm truncate">
                    {selectedConversation.customer.name}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedConversation.customer.phone}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 flex-shrink-0">
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
                
                {!isMobile && (
                  <div className="hidden lg:block">
                    <EnhancedTemplateSelector
                      conversationId={selectedConversation.id}
                      customerId={selectedConversation.customer.id}
                      customerPhone={selectedConversation.customer.phone}
                      customerEmail={selectedConversation.customer.email}
                      onTemplateSent={() => fetchMessages(selectedConversation.id)}
                    />
                  </div>
                )}
                
                {!isMobile && (
                  <div className="hidden xl:block w-48">
                    <AdminAssignment
                      conversationId={selectedConversation.id}
                      currentAssignee={selectedConversation.assigned_to}
                      onAssignmentChange={fetchConversations}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Mobile: Second row for additional controls */}
            {isMobile && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1">
                  <EnhancedTemplateSelector
                    conversationId={selectedConversation.id}
                    customerId={selectedConversation.customer.id}
                    customerPhone={selectedConversation.customer.phone}
                    customerEmail={selectedConversation.customer.email}
                    onTemplateSent={() => fetchMessages(selectedConversation.id)}
                  />
                </div>
                <div className="flex-1">
                  <AdminAssignment
                    conversationId={selectedConversation.id}
                    currentAssignee={selectedConversation.assigned_to}
                    onAssignmentChange={fetchConversations}
                  />
                </div>
              </div>
            )}
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
          <div className="text-center space-y-6 max-w-2xl px-4">
            <div>
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base md:text-lg font-medium text-muted-foreground mb-2">
                Select a conversation to start messaging
              </h3>
              <p className="text-sm text-muted-foreground">
                Choose from the sidebar or create a new conversation
              </p>
            </div>
            
            {/* WhatsApp Analytics Widget */}
            <div className="mt-8 max-w-xl mx-auto">
              <WhatsAppAnalyticsWidget />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <UnsavedChangesGuard 
        hasUnsavedChanges={hasUnsavedChanges}
        message="You have an unsaved message. Are you sure you want to leave?"
      />
      <div className="h-screen flex flex-col bg-background">
        <PersistentHeader />
        {isMobile ? (
          /* Mobile: Simple toggle layout */
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {!selectedConversation ? (
              /* Show conversation list on mobile */
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex-shrink-0 border-b border-border">
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      <h1 className="text-base font-semibold">Conversations</h1>
                      {unreadCount > 0 && (
                        <Badge variant="secondary" className="h-6 px-2 text-xs">
                          {unreadCount}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <GlobalNotificationCenter />
                      <TaskNotifications />
                      {isAdmin && (
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleBack}>
                          <SettingsIcon className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={signOut}>
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  {conversationSidebar}
                </div>
              </div>
            ) : (
              /* Show selected conversation on mobile */
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex-shrink-0">
                  <PendingPaymentBanner />
                </div>
                {renderChatArea()}
              </div>
            )}
          </div>
        ) : (
          /* Desktop: Resizable layout */
          <div ref={desktopContainerRef} className="flex-1 min-h-0">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Left: Conversations list - fixed size on load */}
              <ResizablePanel 
                ref={leftPanelRef}
                defaultSize={38} 
                minSize={30} 
                maxSize={50}
                collapsible
              >
                <div className="h-full border-r border-border flex flex-col">
                  {conversationSidebar}
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />

              {/* Center: Main Chat Area */}
              <ResizablePanel minSize={35}>
              <div className="h-full flex flex-col overflow-hidden">
                <div className="p-3 border-b border-border">
                  <PendingPaymentBanner />
                </div>
                {renderChatArea()}
              </div>
            </ResizablePanel>

            {/* Right: Contact details (optional, desktop only) */}
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
