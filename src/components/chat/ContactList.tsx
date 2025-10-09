import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isYesterday } from "date-fns";
import { Conversation } from "@/types/chat";
import { Check, CheckCheck, Mail, MessageSquare } from "lucide-react";

interface ContactListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  contextMenu?: (conversation: Conversation) => React.ReactNode;
}

export const ContactList = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  contextMenu,
}: ContactListProps) => {
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24 && isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "dd/MM/yyyy");
  };

  return (
    <div className="space-y-0">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          className={`px-3 py-2.5 cursor-pointer transition-all border-b border-border/30 hover:shadow-sm ${
            selectedConversation?.id === conversation.id
              ? "bg-accent/60 border-l-4 border-l-primary"
              : "hover:bg-accent/30"
          }`}
          onClick={() => onSelectConversation(conversation)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="flex items-start gap-2 md:gap-3">
            <Avatar className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0">
              <AvatarImage src={conversation.customer.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {conversation.customer.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-1 md:gap-2 mb-0.5">
              <h3 className="text-xs md:text-sm font-semibold truncate">
                {conversation.customer.name}
              </h3>
              <span className="text-[10px] md:text-xs text-muted-foreground flex-shrink-0">
                {formatTimestamp(conversation.updated_at)}
              </span>
            </div>
              
              <div className="flex items-center gap-1 md:gap-2 mb-1">
                <p className="text-[10px] md:text-xs text-muted-foreground truncate flex-1">
                  {conversation.customer.phone}
                </p>
                {conversation.assigned_to && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
                    {conversation.assigned_user?.full_name?.split(' ')[0] || 'Assigned'}
                  </Badge>
                )}
              </div>

              {/* Message preview */}
              {conversation.last_message && (
                <div className="flex items-center gap-1 mb-1">
                  {conversation.last_message.platform === 'email' && (
                    <Mail className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  )}
                  {conversation.last_message.platform === 'whatsapp' && (
                    <MessageSquare className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  )}
                  <p className="text-[10px] text-muted-foreground truncate flex-1">
                    {conversation.last_message.direction === 'outbound' && 'You: '}
                    {conversation.last_message.platform === 'email' && conversation.last_message.subject 
                      ? conversation.last_message.subject
                      : conversation.last_message.content.substring(0, 50)}
                    {conversation.last_message.content.length > 50 && '...'}
                  </p>
                </div>
              )}
              
              {/* Status tags row */}
              {conversation.status_tags && conversation.status_tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {conversation.status_tags.map((tag: any) => (
                    <Badge 
                      key={tag.id} 
                      variant="outline" 
                      className="text-[10px] px-1.5 py-0 h-4"
                      style={{ 
                        backgroundColor: `${tag.color}20`,
                        borderColor: tag.color,
                        color: tag.color 
                      }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Right side: Unread count and context menu */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              {conversation.unread_count && conversation.unread_count > 0 ? (
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-[10px] text-primary-foreground font-medium">
                    {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
                  </span>
                </div>
              ) : (
                <div className="w-6 h-6" />
              )}
              {contextMenu && (
                <div onClick={(e) => e.stopPropagation()}>
                  {contextMenu(conversation)}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
