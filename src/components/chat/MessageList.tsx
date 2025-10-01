import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, FileIcon, ImageIcon } from "lucide-react";
import { format } from "date-fns";
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
            className="max-w-xs rounded cursor-pointer hover:opacity-90"
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

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.direction === "outbound" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.direction === "outbound"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {format(new Date(message.created_at), "HH:mm")}
              </p>

              {/* Attachments */}
              {message.message_attachments &&
                message.message_attachments.map((attachment) =>
                  renderAttachment(attachment)
                )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
