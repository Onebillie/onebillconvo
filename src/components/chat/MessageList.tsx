import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Message } from "@/types/chat";
import { VoicePlayer } from "./VoicePlayer";
import { FilePreview } from "./FilePreview";
import { MessageStatusIndicator } from "./MessageStatusIndicator";
import { ChannelIndicator } from "./ChannelIndicator";

interface MessageListProps {
  messages: Message[];
  onCreateTask?: (message: Message) => void;
}

export const MessageList = ({ messages, onCreateTask }: MessageListProps) => {
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
      <div className="space-y-6">
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
              {dateMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.direction === "outbound" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`relative max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-sm transition-all cursor-pointer ${
                      message.direction === "outbound"
                        ? "bg-primary text-primary-foreground rounded-tr-sm hover:shadow-md"
                        : "bg-muted rounded-tl-sm hover:shadow-md"
                    }`}
                    onContextMenu={(e) => {
                      if (onCreateTask) {
                        e.preventDefault();
                        onCreateTask(message);
                      }
                    }}
                  >
                    {/* Channel indicator */}
                    {(message as any).channel && (
                      <div className="absolute -top-2 -right-2">
                        <ChannelIndicator channel={(message as any).channel} />
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    
                    {/* Attachments */}
                    {message.message_attachments &&
                      message.message_attachments.map((attachment) =>
                        renderAttachment(attachment)
                      )}
                    
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs opacity-70">
                        {format(new Date(message.created_at), "HH:mm")}
                      </span>
                      {message.direction === "outbound" && (
                        <MessageStatusIndicator 
                          status={(message as any).status || 'sent'} 
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
