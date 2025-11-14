import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { setupAutoResize } from "@/lib/embedResize";
import { ContactList } from "@/components/chat/ContactList";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ContactDetailsEmbed } from "@/components/chat/ContactDetailsEmbed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Search, Filter, Zap, Mail, ArrowUpDown, Shield } from "lucide-react";
import { Conversation, Message } from "@/types/chat";
import { ConversationFilters as FilterType } from "@/types/chat";
import { DateRangeFilter } from "@/components/chat/DateRangeFilter";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

type PermissionLevel = 'read_only' | 'agent' | 'admin';

interface EmbedCustomization {
  primary_color?: string;
  secondary_color?: string;
  font_family?: string;
  show_customer_details?: boolean;
  show_branding?: boolean;
}

export default function EmbedDashboard() {
  const [searchParams] = useSearchParams();
  const apiKey = searchParams.get("apiKey");
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('read_only');
  const [customization, setCustomization] = useState<EmbedCustomization>({});
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [filters, setFilters] = useState<FilterType>({
    search: '',
    unread: false,
    statusIds: [],
    dateRange: { from: null, to: null },
    sortBy: 'newest',
    platforms: [],
    assignedTo: null,
  });
  
  const [statusTags, setStatusTags] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  
  const channelRef = useRef<any>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        setFilters(prev => ({ ...prev, search: searchInput }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters.search]);

  // Validate and load data
  useEffect(() => {
    if (!apiKey) {
      setError("Missing API key");
      setLoading(false);
      return;
    }
    validateAndLoadData();
  }, [apiKey]);

  // Setup auto-resize for iframe embedding
  useEffect(() => {
    if (containerRef.current) {
      const cleanup = setupAutoResize(containerRef.current);
      return cleanup;
    }
  }, []);

  // Fetch conversations when filters change
  useEffect(() => {
    if (businessId && apiKey) {
      loadConversations();
    }
  }, [filters, businessId, apiKey]);

  // Load messages when conversation selected
  useEffect(() => {
    if (selectedConversation && apiKey) {
      loadMessages(selectedConversation.id);
      
      // Track presence for embed widget
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      const channel = supabase.channel(`embed-presence-${selectedConversation.id}`)
        .on('presence', { event: 'sync' }, () => {})
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ online_at: new Date().toISOString() });
          }
        });
      channelRef.current = channel;
      
      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      };
    }
  }, [selectedConversation, apiKey]);

  const validateAndLoadData = async () => {
    try {
      // Validate API key
      const { data: validation, error: valError } = await supabase.functions.invoke('api-validate-api-key', {
        headers: { 'x-api-key': apiKey! }
      });

      if (valError || !validation?.valid) {
        throw new Error("Invalid API key");
      }

      setBusinessId(validation.business_id);
      setPermissionLevel(validation.permission_level || 'read_only');
      setCustomization(validation.customization || {});

      // Create embed session
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-embed-session', {
        headers: { 'x-api-key': apiKey! }
      });

      if (sessionError || !sessionData?.session_token) {
        throw new Error("Failed to create session");
      }

      setSessionToken(sessionData.session_token);

      // Load initial resources
      await Promise.all([
        loadStatusTags(),
        loadStaff(),
        loadConversations(),
      ]);

      setLoading(false);
    } catch (err: any) {
      console.error("Validation error:", err);
      setError(err.message || "Failed to load dashboard");
      setLoading(false);
    }
  };

  const loadStatusTags = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('api-embed-data', {
        body: { resource: 'status_tags' },
        headers: { 'x-api-key': apiKey! }
      });
      if (!error && data?.status_tags) {
        setStatusTags(data.status_tags);
      }
    } catch (err) {
      console.error("Failed to load status tags:", err);
    }
  };

  const loadStaff = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('api-embed-data', {
        body: { resource: 'staff' },
        headers: { 'x-api-key': apiKey! }
      });
      if (!error && data?.staff) {
        setStaffMembers(data.staff);
      }
    } catch (err) {
      console.error("Failed to load staff:", err);
    }
  };

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('api-embed-data', {
        body: {
          resource: 'conversations',
          ...filters,
          dateFrom: filters.dateRange.from?.toISOString(),
          dateTo: filters.dateRange.to?.toISOString(),
        },
        headers: { 'x-api-key': apiKey! }
      });

      if (error) throw error;
      setConversations(data?.conversations || []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
      toast({ title: "Error", description: "Failed to load conversations", variant: "destructive" });
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('api-embed-data', {
        body: { resource: 'messages', conversation_id: conversationId },
        headers: { 'x-api-key': apiKey! }
      });

      if (error) throw error;
      setMessages(data?.messages || []);
    } catch (err) {
      console.error("Failed to load messages:", err);
      toast({ title: "Error", description: "Failed to load messages", variant: "destructive" });
    }
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const handleSendMessage = async (content?: string, attachments?: any[]) => {
    if (!selectedConversation || !sessionToken || !content) return;

    // Optimistic update
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedConversation.id,
      content,
      direction: 'outbound',
      platform: 'whatsapp',
      created_at: new Date().toISOString(),
      is_read: true,
      customer_id: selectedConversation.customer_id,
    };
    setMessages(prev => [...prev, tempMessage]);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadConversations();
    if (selectedConversation) {
      await loadMessages(selectedConversation.id);
    }
    setIsRefreshing(false);
    toast({ title: "Refreshed" });
  };

  const handleToggleAI = async () => {
    if (permissionLevel !== 'admin' || !sessionToken) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('embed-operation', {
        body: {
          session_token: sessionToken,
          operation: 'toggle_ai',
          data: { enabled: !aiEnabled }
        }
      });

      if (error) throw error;
      setAiEnabled(!aiEnabled);
      toast({ title: aiEnabled ? "AI Disabled" : "AI Enabled" });
    } catch (err) {
      console.error("Failed to toggle AI:", err);
      toast({ title: "Error", description: "Failed to toggle AI", variant: "destructive" });
    }
  };

  const handleSyncEmails = async () => {
    if (permissionLevel !== 'admin' || !sessionToken) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('embed-operation', {
        body: {
          session_token: sessionToken,
          operation: 'sync_emails',
          data: {}
        }
      });

      if (error) throw error;
      toast({ title: "Email Sync Triggered", description: `Syncing ${data.accounts_synced || 0} accounts` });
    } catch (err) {
      console.error("Failed to sync emails:", err);
      toast({ title: "Error", description: "Failed to sync emails", variant: "destructive" });
    }
  };

  const toggleStatus = (statusId: string) => {
    const newStatuses = filters.statusIds.includes(statusId)
      ? filters.statusIds.filter(id => id !== statusId)
      : [...filters.statusIds, statusId];
    setFilters(prev => ({ ...prev, statusIds: newStatuses }));
  };

  const togglePlatform = (platform: string) => {
    const newPlatforms = filters.platforms.includes(platform)
      ? filters.platforms.filter(p => p !== platform)
      : [...filters.platforms, platform];
    setFilters(prev => ({ ...prev, platforms: newPlatforms }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <p className="text-destructive font-semibold mb-2">Error</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Helmet>
      <div 
        ref={containerRef}
        className="h-full min-h-screen w-full flex flex-col bg-background m-0 p-0" 
        style={{ fontFamily: customization.font_family }}
      >
        {/* Header */}
      <div className="border-b border-border bg-background px-2 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-lg">Dashboard</h1>
          <Badge variant="secondary" className="text-xs">
            <Shield className="h-3 w-3 mr-1" />
            {permissionLevel}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {permissionLevel === 'admin' && (
            <>
              <Button variant="outline" size="sm" onClick={handleToggleAI}>
                <Zap className={`h-4 w-4 mr-1 ${aiEnabled ? 'text-yellow-500' : ''}`} />
                AI {aiEnabled ? 'On' : 'Off'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSyncEmails}>
                <Mail className="h-4 w-4 mr-1" />
                Sync Emails
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-border bg-background px-2 py-3 space-y-3">
        {/* Search and Sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <DateRangeFilter
            from={filters.dateRange.from}
            to={filters.dateRange.to}
            onChange={(from, to) => setFilters(prev => ({ ...prev, dateRange: { from, to } }))}
          />
          <Select value={filters.sortBy} onValueChange={(value: any) => setFilters(prev => ({ ...prev, sortBy: value }))}>
            <SelectTrigger className="w-[140px] h-9">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="unread">Most unread</SelectItem>
              <SelectItem value="name_asc">Name A-Z</SelectItem>
              <SelectItem value="name_desc">Name Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={filters.unread ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters(prev => ({ ...prev, unread: !prev.unread }))}
          >
            Unread
          </Button>

          {/* Status Filter */}
          {statusTags.length > 0 && (
            <div className="flex gap-1">
              {statusTags.slice(0, 4).map(tag => (
                <Badge
                  key={tag.id}
                  style={{
                    backgroundColor: filters.statusIds.includes(tag.id) ? `${tag.color}40` : `${tag.color}20`,
                    borderColor: tag.color,
                    color: tag.color,
                  }}
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => toggleStatus(tag.id)}
                >
                  {tag.name}
                  {filters.statusIds.includes(tag.id) && ' ✓'}
                </Badge>
              ))}
            </div>
          )}

          {/* Platform Filter */}
          {['whatsapp', 'email', 'sms'].map(platform => (
            <Badge
              key={platform}
              variant={filters.platforms.includes(platform) ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => togglePlatform(platform)}
            >
              {platform}
              {filters.platforms.includes(platform) && ' ✓'}
            </Badge>
          ))}

          {/* Assigned Filter */}
          {permissionLevel !== 'read_only' && (
            <Select value={filters.assignedTo || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, assignedTo: value === 'all' ? null : value }))}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Assigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staffMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>{member.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Conversations List */}
        <ResizablePanel defaultSize={30} minSize={20}>
          <ContactList
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleConversationSelect}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Messages */}
        <ResizablePanel defaultSize={50}>
          {selectedConversation ? (
            <div className="flex flex-col h-full">
              <MessageList messages={messages} />
              {permissionLevel !== 'read_only' && sessionToken && (
                <MessageInput
                  conversationId={selectedConversation.id}
                  onMessageSent={handleSendMessage}
                  embedMode={true}
                  embedSessionToken={sessionToken}
                />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Select a conversation to view messages</p>
            </div>
          )}
        </ResizablePanel>

        {/* Customer Details */}
        {customization.show_customer_details !== false && selectedConversation && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={20} minSize={15}>
              <ContactDetailsEmbed
                conversation={selectedConversation}
                embedMode={true}
                permissionLevel={permissionLevel}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
      </div>
    </>
  );
}
