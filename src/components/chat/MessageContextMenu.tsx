import { Message } from "@/types/chat";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Reply, Heart, Star, Pin, Forward, Copy, Pencil, Info, Trash2, CheckSquare } from "lucide-react";
import { ReactNode } from "react";

interface MessageContextMenuProps {
  message: Message;
  children: ReactNode;
  onReply?: (message: Message) => void;
  onReact?: (message: Message) => void;
  onStar?: (message: Message) => void;
  onPin?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onCopy?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onInfo?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onSelectMessages?: () => void;
}

export const MessageContextMenu = ({
  message,
  children,
  onReply,
  onReact,
  onStar,
  onPin,
  onForward,
  onCopy,
  onEdit,
  onInfo,
  onDelete,
  onSelectMessages,
}: MessageContextMenuProps) => {
  const canEdit = message.direction === "outbound" && message.platform !== "email";
  const canDelete = message.direction === "outbound";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56 bg-background border-border">
        <ContextMenuItem onClick={() => onReply?.(message)} className="cursor-pointer">
          <Reply className="mr-2 h-4 w-4" />
          Reply
        </ContextMenuItem>
        
        <ContextMenuItem onClick={() => onReact?.(message)} className="cursor-pointer">
          <Heart className="mr-2 h-4 w-4" />
          React
        </ContextMenuItem>
        
        <ContextMenuItem onClick={() => onStar?.(message)} className="cursor-pointer">
          <Star className={`mr-2 h-4 w-4 ${message.is_starred ? 'fill-primary' : ''}`} />
          {message.is_starred ? 'Unstar' : 'Star'}
        </ContextMenuItem>
        
        <ContextMenuItem onClick={() => onPin?.(message)} className="cursor-pointer">
          <Pin className={`mr-2 h-4 w-4 ${message.is_pinned ? 'fill-primary' : ''}`} />
          {message.is_pinned ? 'Unpin' : 'Pin'}
        </ContextMenuItem>
        
        <ContextMenuItem onClick={() => onForward?.(message)} className="cursor-pointer">
          <Forward className="mr-2 h-4 w-4" />
          Forward
        </ContextMenuItem>
        
        <ContextMenuItem onClick={() => onCopy?.(message)} className="cursor-pointer">
          <Copy className="mr-2 h-4 w-4" />
          Copy
        </ContextMenuItem>
        
        {canEdit && (
          <ContextMenuItem onClick={() => onEdit?.(message)} className="cursor-pointer">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </ContextMenuItem>
        )}
        
        <ContextMenuItem onClick={() => onInfo?.(message)} className="cursor-pointer bg-accent/50">
          <Info className="mr-2 h-4 w-4" />
          Info
        </ContextMenuItem>
        
        {canDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={() => onDelete?.(message)} 
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </ContextMenuItem>
          </>
        )}
        
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onSelectMessages} className="cursor-pointer">
          <CheckSquare className="mr-2 h-4 w-4" />
          Select messages
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
