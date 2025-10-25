import { memo, useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isYesterday } from "date-fns";
import { Conversation } from "@/types/chat";
import { Mail, MessageSquare, Edit3, AlertCircle } from "lucide-react";
import DOMPurify from 'dompurify';

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: (conversation: Conversation) => void;
  contextMenu?: (conversation: Conversation) => React.ReactNode;
}

const formatTimestamp = (dateString: string) => {
  try {
    const date = new Date(dateString);
    // Validate the date
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24 && isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "dd/MM/yyyy");
  } catch {
    return '';
  }
};

export const ConversationListItem = memo(({
  conversation,
  isSelected,
  onSelect,
  contextMenu,
}: ConversationListItemProps) => {
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initial check for draft
      const draft = sessionStorage.getItem(`message-draft-${conversation.id}`);
      setHasDraft(!!draft?.trim());
      
      // Listen for draft changes
      const handleDraftChange = (event: CustomEvent) => {
        if (event.detail.conversationId === conversation.id) {
          setHasDraft(event.detail.hasDraft);
        }
      };
      
      window.addEventListener('draft-changed', handleDraftChange as EventListener);
      
      return () => {
        window.removeEventListener('draft-changed', handleDraftChange as EventListener);
      };
    }
  }, [conversation.id]);

  return (
    <div
      className={`px-3 py-2.5 cursor-pointer transition-all border-b border-border/30 hover:shadow-sm relative ${
        isSelected
          ? "bg-accent/60 border-l-4 border-l-primary"
          : "hover:bg-accent/30"
      } ${conversation.priority && conversation.priority >= 5 ? 'bg-orange-50/50 dark:bg-orange-950/20' : ''}`}
      onClick={() => onSelect(conversation)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* High priority indicator */}
      {conversation.priority && conversation.priority >= 5 && (
        <div className="absolute top-1 right-1">
          <AlertCircle className="w-3 h-3 text-orange-500" />
        </div>
      )}
      
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

          {/* Message preview or draft indicator */}
          {hasDraft ? (
            <div className="flex items-center gap-1 mb-1">
              <Edit3 className="w-3 h-3 text-orange-500 flex-shrink-0" />
              <p className="text-[10px] text-orange-500 font-medium">Draft</p>
            </div>
          ) : conversation.last_message ? (
            <div className="flex items-center gap-1 mb-1">
            {conversation.last_message.platform === 'email' && (
              <Mail className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            )}
            {conversation.last_message.platform === 'whatsapp' && (
              <MessageSquare className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            )}
            {conversation.last_message.platform === 'embed' && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-blue-500/10 text-blue-600 border-blue-500/20">
                Website
              </Badge>
            )}
            <p className="text-[10px] text-muted-foreground truncate flex-1">
              {conversation.last_message.direction === 'outbound' && 'You: '}
              {DOMPurify.sanitize(
                conversation.last_message.platform === 'email' && conversation.last_message.subject 
                  ? conversation.last_message.subject
                  : conversation.last_message.content.substring(0, 50),
                { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }
              )}
              {conversation.last_message.content.length > 50 && '...'}
            </p>
            </div>
          ) : null}
          
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
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  return (
    prevProps.conversation.id === nextProps.conversation.id &&
    prevProps.conversation.updated_at === nextProps.conversation.updated_at &&
    prevProps.conversation.unread_count === nextProps.conversation.unread_count &&
    prevProps.isSelected === nextProps.isSelected
  );
});

ConversationListItem.displayName = "ConversationListItem";
