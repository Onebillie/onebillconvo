import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isYesterday } from "date-fns";
import { Conversation } from "@/types/chat";
import { Check, CheckCheck } from "lucide-react";

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
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return format(date, "dd/MM/yyyy");
    }
  };

  return (
    <div className="space-y-0">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          className={`px-4 py-3 cursor-pointer transition-all border-b border-border/40 ${
            selectedConversation?.id === conversation.id
              ? "bg-accent/50"
              : "hover:bg-accent/20"
          }`}
          onClick={() => onSelectConversation(conversation)}
        >
          <div className="flex items-start space-x-3 flex-1">
            <div className="relative">
              <Avatar className="w-10 h-10 md:w-12 md:h-12">
                <AvatarImage src={conversation.customer.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {conversation.customer.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {conversation.unread_count && conversation.unread_count > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-[10px] text-primary-foreground font-medium">
                    {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="text-sm font-semibold truncate">
                  {conversation.customer.name}
                </h3>
                <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                  {formatTimestamp(conversation.updated_at)}
                </span>
              </div>
              
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground truncate flex-1">
                  {conversation.customer.phone}
                </p>
                {conversation.assigned_to && (
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    Assigned
                  </Badge>
                )}
              </div>
              {/* Status tags row */}
              <div className="flex flex-wrap gap-1 mt-1">
                {conversation.status_tags?.map((tag: any) => (
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
            </div>
          </div>
          {contextMenu && (
            <div onClick={(e) => e.stopPropagation()}>
              {contextMenu(conversation)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
