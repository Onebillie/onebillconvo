import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Message } from "@/types/chat";
import { VoicePlayer } from "./VoicePlayer";
import { FilePreview } from "./FilePreview";
import { MessageStatusIndicator } from "./MessageStatusIndicator";
import { ChannelIndicator } from "./ChannelIndicator";
import { EditMessageDialog } from "./EditMessageDialog";
import { EmailMessageRenderer } from "./EmailMessageRenderer";
import { Pencil, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface MessageListProps {
  messages: Message[];
  onCreateTask?: (message: Message) => void;
  onMessageUpdate?: () => void;
}

export const MessageList = ({ messages, onCreateTask, onMessageUpdate }: MessageListProps) => {
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, any[]>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
  const renderAttachment = (attachment: any) => {
    const isVoiceNote = attachment.type?.startsWith("audio/");

    if (isVoiceNote) {
      return (
        <div key={attachment.id} className="mt-2">
          <VoicePlayer 
            audioUrl={attachment.url} 
            duration={attachment.duration_seconds}
          />
        </div>
      );
    }

    return <FilePreview key={attachment.id} attachment={attachment} />;
  };

  const formatDateSeparator = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return format(date, "EEE dd MMM");
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups: { [key: string]: Message[] }, message) => {
    const date = format(new Date(message.created_at), "yyyy-MM-dd");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-6" ref={scrollRef}>
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

                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.direction === "outbound" ? "justify-end" : "justify-start"
                    } mb-2 group`}
                    onContextMenu={(e) => {
                      if (onCreateTask) {
                        e.preventDefault();
                        onCreateTask(message);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2 relative group">
                      {message.direction === "outbound" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -left-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                          onClick={() => setEditingMessage(message)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      {message.direction === "inbound" && (
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold mt-1">
                          {message.platform === 'email' ? '@' : 'W'}
                        </div>
                      )}
                      <div className="relative max-w-[90%] lg:max-w-[75%]">
                        <div
                          className={`w-full break-words [overflow-wrap:anywhere] rounded-lg px-4 py-3 ${
                            message.direction === "outbound"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
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

                          {/* Email content with smart formatting */}
                          {message.platform === 'email' ? (
                            <EmailMessageRenderer 
                              content={message.content} 
                              subject={message.subject}
                            />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap leading-relaxed [word-break:break-word] mb-1">
                              {message.content}
                            </p>
                          )}
                          
                          {/* Attachments */}
                          {message.message_attachments &&
                            message.message_attachments.map((attachment) =>
                              renderAttachment(attachment)
                            )}
                          
                          <div className="flex items-center gap-2 mt-1">
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
    </ScrollArea>
  );
};
