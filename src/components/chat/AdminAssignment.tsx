import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { UserCog } from "lucide-react";

interface AdminAssignmentProps {
  conversationId: string;
  currentAssignee?: string;
  onAssignmentChange: () => void;
}

const ADMIN_OPTIONS = [
  { value: "unassigned", label: "Unassigned" },
  { value: "john", label: "John" },
  { value: "sarah", label: "Sarah" },
  { value: "mike", label: "Mike" },
  { value: "emma", label: "Emma" },
];

export const AdminAssignment = ({
  conversationId,
  currentAssignee,
  onAssignmentChange,
}: AdminAssignmentProps) => {
  const [updating, setUpdating] = useState(false);

  const handleAssignmentChange = async (value: string) => {
    setUpdating(true);
    try {
      const { error } = await (supabase as any)
        .from("conversations")
        .update({ 
          assigned_to: value === "unassigned" ? null : value 
        })
        .eq("id", conversationId);

      if (error) throw error;

      toast({
        title: "Assignment updated",
        description: `Conversation assigned to ${value === "unassigned" ? "no one" : value}`,
      });
      
      onAssignmentChange();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update assignment",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="admin-assignment" className="text-xs flex items-center gap-1">
        <UserCog className="w-3 h-3" />
        Assigned To
      </Label>
      <Select
        value={currentAssignee || "unassigned"}
        onValueChange={handleAssignmentChange}
        disabled={updating}
      >
        <SelectTrigger id="admin-assignment" className="h-8 text-xs">
          <SelectValue placeholder="Select admin" />
        </SelectTrigger>
        <SelectContent>
          {ADMIN_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
