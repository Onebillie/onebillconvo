import { useEffect, useRef, useState, memo } from "react";
import { useMessageSearch } from "@/hooks/useMessageSearch";
import { MessageSearch } from "./MessageSearch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Message } from "@/types/chat";
import { VoicePlayer } from "./VoicePlayer";
import { FilePreview } from "./FilePreview";
import { MessageStatusIndicator } from "./MessageStatusIndicator";
import { ChannelIndicator } from "./ChannelIndicator";
import { EditMessageDialog } from "./EditMessageDialog";
import { EmailMessageRenderer } from "./EmailMessageRenderer";
import { EmailDetailModal } from "./EmailDetailModal";
import { AttachmentParseStatus } from "./AttachmentParseStatus";
import { MessageContextMenu } from "./MessageContextMenu";
import { MessageInfoDialog } from "./MessageInfoDialog";
import { EmojiPicker } from "./EmojiPicker";
import { Pencil, Reply, Search, Paperclip, Star, Pin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import DOMPurify from 'dompurify';
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

// Memoized attachment renderer to prevent flickering
const AttachmentItem = memo(({ attachment, messageId }: { attachment: any; messageId?: string }) => {
  const isVoiceNote = attachment.type?.startsWith("audio/");

  if (isVoiceNote) {
    return (
      <div className="mt-2">
        <VoicePlayer 
          audioUrl={attachment.url} 
          duration={attachment.duration_seconds}
        />
      </div>
    );
  }

  return <FilePreview attachment={attachment} messageId={messageId} />;
}, (prevProps, nextProps) => {
  // Only re-render if attachment id or type changes
  return prevProps.attachment.id === nextProps.attachment.id && 
         prevProps.attachment.type === nextProps.attachment.type &&
         prevProps.messageId === nextProps.messageId;
});

interface MessageListProps {
  messages: Message[];
  onCreateTask?: (message: Message) => void;
  onMessageUpdate?: () => void;
  isEmbedActive?: boolean;
  hasMoreMessages?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export const MessageList = memo(({ messages, onCreateTask, onMessageUpdate, isEmbedActive, hasMoreMessages, onLoadMore, isLoadingMore }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevScrollHeight = useRef<number>(0);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [emailDetailMessage, setEmailDetailMessage] = useState<Message | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, Array<{ emoji: string; count: number }>>>({});
  const [showSearch, setShowSearch] = useState(false);
  const [infoMessage, setInfoMessage] = useState<Message | null>(null);
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState<Message | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [messageCategories, setMessageCategories] = useState<Record<string, any>>({});
  const { toast } = useToast();
  const [attachmentsMap, setAttachmentsMap] = useState<Record<string, any[]>>({});

  // Fetch message categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('message_categories')
        .select('*');
      
      if (data) {
        const categoriesMap = data.reduce((acc, cat) => {
          acc[cat.category_name] = cat;
          return acc;
        }, {} as Record<string, any>);
        setMessageCategories(categoriesMap);
      }
    };
    fetchCategories();
  }, []);
  
  const {
    searchTerm,
    setSearchTerm,
    matches,
    currentMatch,
    currentMatchIndex,
    goToNextMatch,
    goToPreviousMatch,
    clearSearch,
  } = useMessageSearch(messages);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!searchTerm) {
      scrollToBottom();
    }
  }, [messages, searchTerm]);

  useEffect(() => {
    if (currentMatch && messageRefs.current[currentMatch.id]) {
      messageRefs.current[currentMatch.id].scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, [currentMatch]);

  // Fetch reactions for all messages
  useEffect(() => {
    const fetchReactions = async () => {
      if (messages.length === 0) return;
      
      const messageIds = messages.map(m => m.id);
      const { data } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messageIds);
      
      if (data) {
        const reactionsMap = data.reduce((acc, reaction) => {
          if (!acc[reaction.message_id]) {
            acc[reaction.message_id] = [];
          }
          acc[reaction.message_id].push(reaction);
          return acc;
        }, {} as Record<string, any[]>);
        
        setMessageReactions(reactionsMap);
      }
    };

    fetchReactions();

    // Subscribe to real-time reaction updates
    const channel = supabase
      .channel('message-reactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions'
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messages]);

  // Fetch attachments for messages so they render on initial load
  useEffect(() => {
    const fetchAttachments = async () => {
      if (messages.length === 0) return;
      const ids = messages.map(m => m.id);
      const { data, error } = await supabase
        .from('message_attachments')
        .select('*')
        .in('message_id', ids);
      if (!error && data) {
        const map = data.reduce((acc: Record<string, any[]>, att: any) => {
          if (!acc[att.message_id]) acc[att.message_id] = [];
          acc[att.message_id].push(att);
          return acc;
        }, {} as Record<string, any[]>);
        setAttachmentsMap(map);
      }
    };
    fetchAttachments();

    const channel = supabase
      .channel('message-attachments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_attachments' },
        () => fetchAttachments()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [messages]);

  // Preserve scroll position when loading older messages
  useEffect(() => {
    if (scrollRef.current && prevScrollHeight.current > 0 && isLoadingMore === false) {
      const newScrollHeight = scrollRef.current.scrollHeight;
      const heightDifference = newScrollHeight - prevScrollHeight.current;
      scrollRef.current.scrollTop += heightDifference;
      prevScrollHeight.current = 0;
    }
  }, [messages, isLoadingMore]);

  // Message action handlers
  const handleStar = async (message: Message) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          is_starred: !message.is_starred,
          starred_at: !message.is_starred ? new Date().toISOString() : null,
          starred_by: !message.is_starred ? (await supabase.auth.getUser()).data.user?.id : null
        })
        .eq('id', message.id);

      if (error) throw error;
      
      toast({
        title: message.is_starred ? "Unstarred message" : "Starred message",
      });
      
      if (onMessageUpdate) onMessageUpdate();
    } catch (error) {
      console.error('Error starring message:', error);
      toast({
        title: "Error",
        description: "Failed to update message",
        variant: "destructive",
      });
    }
  };

  const handlePin = async (message: Message) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          is_pinned: !message.is_pinned,
          pinned_at: !message.is_pinned ? new Date().toISOString() : null,
          pinned_by: !message.is_pinned ? (await supabase.auth.getUser()).data.user?.id : null
        })
        .eq('id', message.id);

      if (error) throw error;
      
      toast({
        title: message.is_pinned ? "Unpinned message" : "Pinned message",
      });
      
      if (onMessageUpdate) onMessageUpdate();
    } catch (error) {
      console.error('Error pinning message:', error);
      toast({
        title: "Error",
        description: "Failed to update message",
        variant: "destructive",
      });
    }
  };

  const handleReact = async (message: Message, emoji: string) => {
    try {
      const user = await supabase.auth.getUser();
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: message.id,
          user_id: user.data.user?.id,
          emoji: emoji
        });

      if (error) throw error;
      
      toast({
        title: "Reaction added",
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast({
        title: "Error",
        description: "Failed to add reaction",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast({
        title: "Copied to clipboard",
      });
    } catch (error) {
      console.error('Error copying message:', error);
      toast({
        title: "Error",
        description: "Failed to copy message",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmMessage) return;
    
    try {
      const user = await supabase.auth.getUser();
      const { error } = await supabase
        .from('messages')
        .update({ 
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.data.user?.id,
          original_content: deleteConfirmMessage.content,
          content: "This message was deleted"
        })
        .eq('id', deleteConfirmMessage.id);

      if (error) throw error;
      
      toast({
        title: "Message deleted",
      });
      
      if (onMessageUpdate) onMessageUpdate();
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmMessage(null);
    }
  };

  const handleForward = (message: Message) => {
    toast({
      title: "Forward",
      description: "Forward functionality coming soon",
    });
  };

  const handleReparse = async (message: Message) => {
    if (!message.message_attachments || message.message_attachments.length === 0) {
      toast({
        title: "No attachments",
        description: "This message has no attachments to parse",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Parsing document...",
      description: "AI is analyzing the attachment",
    });

    try {
      // Parse first attachment (most common use case)
      const attachment = message.message_attachments[0];
      
      const { data, error } = await supabase.functions.invoke('onebill-classify-document', {
        body: {
          fileUrl: attachment.url,
          fileName: attachment.filename,
          businessId: (message as any).business_id,
        },
      });

      if (error) throw error;

      if (data?.success && data?.classification) {
        toast({
          title: "Parse complete",
          description: `Classified as: ${data.classification.document_type}`,
        });
      } else {
        throw new Error('Invalid response from parsing service');
      }
    } catch (error: any) {
      console.error('Parse error:', error);
      toast({
        title: "Parse failed",
        description: error.message || "Failed to parse attachment",
        variant: "destructive",
      });
    }
  };

  const renderAttachment = (attachment: any, messageId?: string) => {
    return <AttachmentItem key={attachment.id} attachment={attachment} messageId={messageId} />;
  };

  const formatDateSeparator = (date: Date) => {
    // Normalize to local timezone
    const localDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Compare using local date strings
    const localDateStr = localDate.toLocaleDateString();
    const todayStr = today.toLocaleDateString();
    const yesterdayStr = yesterday.toLocaleDateString();

    if (localDateStr === todayStr) {
      return "Today";
    } else if (localDateStr === yesterdayStr) {
      return "Yesterday";
    } else {
      return format(localDate, "EEE dd MMM");
    }
  };

  const highlightText = (text: string) => {
    if (!searchTerm.trim()) return text;
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchTerm.toLowerCase() 
        ? `<mark class="bg-primary/30">${part}</mark>` 
        : part
    ).join('');
  };

  // Display either filtered messages or all messages
  const displayMessages = searchTerm ? matches : messages;

  // Group messages by date
  const groupedMessages = displayMessages.reduce((groups: { [key: string]: Message[] }, message) => {
    const date = format(new Date(message.created_at), "yyyy-MM-dd");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <>
      {showSearch && (
        <MessageSearch
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          matchCount={matches.length}
          currentIndex={currentMatchIndex}
          onNext={goToNextMatch}
          onPrevious={goToPreviousMatch}
          onClear={clearSearch}
      onClose={() => setShowSearch(false)}
        />
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
        {!showSearch && hasMoreMessages && (
          <div className="sticky top-0 z-10 flex justify-center py-2 mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (scrollRef.current) {
                  prevScrollHeight.current = scrollRef.current.scrollHeight;
                }
                onLoadMore?.();
              }}
              disabled={isLoadingMore}
              className="bg-background/95 backdrop-blur shadow-sm"
            >
              {isLoadingMore ? (
                <>
                  <Icons.Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading older messages...
                </>
              ) : (
                <>
                  <Icons.ArrowUp className="h-4 w-4 mr-2" />
                  Load Older Messages
                </>
              )}
            </Button>
          </div>
        )}
        
        {!showSearch && messages.length > 5 && (
          <div className="sticky top-0 z-10 flex justify-center py-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSearch(true)}
              className="bg-background/95 backdrop-blur"
            >
              <Search className="h-4 w-4 mr-2" />
              Search in conversation
            </Button>
          </div>
        )}
        
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex justify-center mb-4">
              <div className="bg-muted px-3 py-1 rounded-full">
                <span className="text-xs font-medium text-muted-foreground">
                  {formatDateSeparator(new Date(date))}
                </span>
              </div>
            </div>

            {/* Messages for this date */}
            <div className="space-y-3">
              {dateMessages.map((message) => {
                const repliedToMessage = message.replied_to_message_id 
                  ? messages.find(m => m.id === message.replied_to_message_id)
                  : null;
                const reactions = messageReactions[message.id] || [];
                const isMatch = searchTerm && currentMatch?.id === message.id;

                return (
                  <MessageContextMenu
                    key={message.id}
                    message={message}
                    onReply={(msg) => setReplyToMessage(msg)}
                    onReact={(msg) => {}}
                    onStar={handleStar}
                    onPin={handlePin}
                    onForward={handleForward}
                    onCopy={handleCopy}
                    onEdit={(msg) => setEditingMessage(msg)}
                    onInfo={(msg) => setInfoMessage(msg)}
                    onDelete={(msg) => setDeleteConfirmMessage(msg)}
                    onReparse={handleReparse}
                    onSelectMessages={() => {}}
                  >
                    <div
                      ref={(el) => { if (el) messageRefs.current[message.id] = el; }}
                      className={`flex ${
                        message.direction === "outbound" ? "justify-end" : "justify-start"
                      } mb-2 group ${isMatch ? 'ring-2 ring-primary rounded-lg' : ''}`}
                    >
                      <div className="flex items-start gap-2 relative group">
                        <AttachmentParseStatus messageId={message.id} />
                        
                        {/* Star indicator */}
                        {message.is_starred && (
                          <Star className="absolute -top-2 -left-2 h-4 w-4 fill-yellow-500 text-yellow-500 z-10" />
                        )}
                        
                        {/* Pin indicator */}
                        {message.is_pinned && (
                          <Pin className="absolute -top-2 -right-2 h-4 w-4 fill-primary text-primary z-10 rotate-45" />
                        )}
                        
                        {message.direction === "inbound" && (
                          <div className="flex-shrink-0 mt-1 flex flex-col items-center gap-1">
                            <ChannelIndicator 
                              channel={message.platform as any || "whatsapp"}
                              isActive={message.platform === "embed" ? isEmbedActive : undefined}
                            />
                            {!['whatsapp', 'email', 'sms', 'facebook', 'instagram', 'embed'].includes(message.platform) && (
                              <div className="text-[10px] text-muted-foreground capitalize">
                                {message.platform}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="relative max-w-[90%] lg:max-w-[75%]">
                          {/* Category badge */}
                          {message.category && message.category !== 'customer_service' && messageCategories[message.category] && (
                            <Badge 
                              className="absolute -top-2 -right-2 z-10 text-xs px-2 py-0.5"
                              style={{
                                backgroundColor: messageCategories[message.category].border_color,
                                color: messageCategories[message.category].text_color,
                              }}
                            >
                              {(() => {
                                const IconComponent = (Icons as any)[messageCategories[message.category].icon];
                                return IconComponent ? <IconComponent className="h-3 w-3 mr-1" /> : null;
                              })()}
                              {messageCategories[message.category].display_name}
                            </Badge>
                           )}
                           
                           <div
                             className={cn(
                               "w-full break-words [overflow-wrap:anywhere] rounded-lg px-4 py-3 transition-all",
                               message.direction === "outbound"
                                 ? "bg-primary text-primary-foreground"
                                 : message.category && messageCategories[message.category]
                                   ? "bg-transparent"
                                   : "bg-muted",
                               message.is_deleted && 'opacity-60 italic',
                               message.platform === 'email' && 'cursor-pointer hover:ring-2 hover:ring-primary/50',
                               // Highlight external placeholder messages
                               (message.content.includes('[Message sent from') && message.content.includes('external')) && 'bg-orange-50 dark:bg-orange-950/20 border-l-4 border-orange-500'
                             )}
                             style={
                               message.direction === "inbound" && message.category && messageCategories[message.category]
                                 ? {
                                     backgroundColor: messageCategories[message.category].background_color,
                                     color: messageCategories[message.category].text_color,
                                     borderLeft: `4px solid ${messageCategories[message.category].border_color}`,
                                   }
                                 : undefined
                             }
                             onDoubleClick={() => message.platform === 'email' && setEmailDetailMessage(message)}
                           >
                           {/* Replied message preview */}
                           {repliedToMessage && (
                             <div className="mb-2 pb-2 border-b border-current/20 opacity-70">
                               <div className="flex items-center gap-1 mb-1">
                                 <Reply className="w-3 h-3" />
                                 <span className="text-xs font-medium">
                                   {repliedToMessage.direction === 'inbound' ? 'Customer' : 'You'}
                                 </span>
                               </div>
                               <p className="text-xs truncate">
                                 {repliedToMessage.content}
                               </p>
                             </div>
                           )}

                           {/* External placeholder message warning */}
                           {message.content.includes('[Message sent from') && message.content.includes('external') ? (
                             <div className="flex items-start gap-2 text-sm">
                               <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                               <div>
                                 <div className="font-medium text-orange-700 dark:text-orange-400 mb-1">
                                   Message sent externally
                                 </div>
                                 <div className="text-xs text-muted-foreground">
                                   This message was sent outside OneBillChat (WhatsApp Business app or Meta Business Suite) and its content wasn't captured.
                                 </div>
                               </div>
                             </div>
                           ) : (
                             <>
                           {/* Email content with smart formatting */}
                           {message.platform === 'email' ? (
                              <>
                                <EmailMessageRenderer 
                                  content={message.content} 
                                  subject={message.subject}
                                  compact={false}
                                />
                                {message.message_attachments && message.message_attachments.length > 0 && (
                                  <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
                                    <Paperclip className="w-3 h-3" />
                                    <span>{message.message_attachments.length} attachment{message.message_attachments.length > 1 ? 's' : ''}</span>
                                  </div>
                                )}
                              </>
                            ) : (
                            <>
                              {message.metadata?.button_clicked ? (
                                <div className="inline-flex items-center gap-2 text-sm mb-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    {message.metadata.button_text}
                                  </span>
                                </div>
                              ) : (
                                <p 
                                  className="text-sm whitespace-pre-wrap leading-relaxed [word-break:break-word] mb-1"
                                  dangerouslySetInnerHTML={{ 
                                    __html: DOMPurify.sanitize(
                                      searchTerm ? highlightText(message.template_content || message.content) : (message.template_content || message.content),
                                      { ALLOWED_TAGS: ['mark', 'br'], ALLOWED_ATTR: ['class'] }
                                    ) 
                                  }}
                                />
                              )}
                                {/* Attachments for non-email */}
                                {(
                                  (message.message_attachments?.length ? message.message_attachments : attachmentsMap[message.id])
                                )?.map((attachment: any) => (
                                  <div key={attachment.id} className="inline-block">
                                    {renderAttachment(attachment, message.id)}
                                  </div>
                                ))}
                               </>
                           )}
                           </>
                           )}
                           
                             <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs opacity-70">
                                {new Date(message.created_at).toLocaleString([], {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {message.direction === "outbound" && (
                                <MessageStatusIndicator status={message.status} />
                              )}
                              {message.is_edited && (
                                <span className="text-xs opacity-60">Edited</span>
                              )}
                            </div>
                          </div>

                        {/* Reactions */}
                        {reactions.length > 0 && (
                          <div className="absolute -bottom-2 right-2 flex gap-1 bg-background border border-border rounded-full px-2 py-0.5 shadow-sm">
                            {reactions.map((reaction, idx) => (
                              <span key={idx} className="text-sm">
                                {reaction.emoji}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                          {message.direction === "outbound" && (
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold mt-1">
                              {message.platform === 'email' ? '@' : 'W'}
                            </div>
                          )}
                        </div>
                      </div>
                    </MessageContextMenu>
                  );
                })}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
      </div>
      {editingMessage && (
        <EditMessageDialog
          open={!!editingMessage}
          onOpenChange={(open) => !open && setEditingMessage(null)}
          messageId={editingMessage.id}
          currentContent={editingMessage.content}
          onSuccess={() => {
            if (onMessageUpdate) onMessageUpdate();
          }}
        />
      )}
      {emailDetailMessage && (
        <EmailDetailModal
          open={!!emailDetailMessage}
          onOpenChange={(open) => !open && setEmailDetailMessage(null)}
          message={emailDetailMessage}
        />
      )}
      
      {infoMessage && (
        <MessageInfoDialog
          open={!!infoMessage}
          onOpenChange={(open) => !open && setInfoMessage(null)}
          message={infoMessage}
        />
      )}
      
      <AlertDialog open={!!deleteConfirmMessage} onOpenChange={(open) => !open && setDeleteConfirmMessage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the message as deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});