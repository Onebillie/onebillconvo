import { MoreVertical, UserPlus, Tag, Calendar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ConversationContextMenuProps {
  onAssign: () => void;
  onChangeStatus: () => void;
  onCreateTask: () => void;
}

export const ConversationContextMenu = ({
  onAssign,
  onChangeStatus,
  onCreateTask,
}: ConversationContextMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssign(); }}>
          <UserPlus className="mr-2 h-4 w-4" />
          Assign to Staff
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onChangeStatus(); }}>
          <Tag className="mr-2 h-4 w-4" />
          Change Status
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateTask(); }}>
          <Calendar className="mr-2 h-4 w-4" />
          Create Task
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
