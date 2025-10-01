import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, FileIcon, ImageIcon } from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { Message } from "@/types/chat";

interface MessageListProps {
  messages: Message[];
}

export const MessageList = ({ messages }: MessageListProps) => {
  const renderAttachment = (attachment: any) => {
    const isImage = attachment.type?.startsWith("image/");

    return (
      <div key={attachment.id} className="mt-2">
        {isImage ? (
          <img
            src={attachment.url}
            alt={attachment.filename}
            className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(attachment.url, "_blank")}
          />
        ) : (
          <div className="p-2 bg-background/10 rounded text-xs flex items-center space-x-2 cursor-pointer hover:bg-background/20">
            <FileIcon className="w-4 h-4" />
            <span>{attachment.filename}</span>
          </div>
        )}
      </div>
    );
  };

  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) {
      return "Today";
    } else if (isYesterday(date)) {
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
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-sm ${
                      message.direction === "outbound"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted rounded-tl-sm"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    
                    {/* Attachments */}
                    {message.message_attachments &&
                      message.message_attachments.map((attachment) =>
                        renderAttachment(attachment)
                      )}
                    
                    <p className="text-xs opacity-70 mt-1 text-right">
                      {format(new Date(message.created_at), "HH:mm")}
                    </p>
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
