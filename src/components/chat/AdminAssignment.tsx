import { useState, useEffect } from "react";
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
import { UserCog, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransferDialog } from "@/components/conversations/TransferDialog";

interface AdminAssignmentProps {
  conversationId: string;
  currentAssignee?: string;
  onAssignmentChange: () => void;
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: "agent" | "admin" | "superadmin";
  department?: string;
}


export const AdminAssignment = ({
  conversationId,
  currentAssignee,
  onAssignmentChange,
}: AdminAssignmentProps) => {
  const [updating, setUpdating] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, email, is_active, department")
        .eq("is_active", true)
        .order("department")
        .order("full_name");

      if (error) {
        console.error("Error fetching team/admin members:", error);
        return;
      }
      setMembers(data || []);
    };
    fetchMembers();
  }, []);


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
    <>
      <div className="space-y-2">
        <Label htmlFor="admin-assignment" className="text-xs flex items-center gap-1">
          <UserCog className="w-3 h-3" />
          Assigned To
        </Label>
        <div className="flex gap-2">
          <Select
            value={(currentAssignee && members.some((m) => m.id === currentAssignee)) ? (currentAssignee as string) : "unassigned"}
            onValueChange={handleAssignmentChange}
            disabled={updating}
          >
            <SelectTrigger id="admin-assignment" className="h-8 text-xs flex-1">
              <SelectValue placeholder="Select assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
              {members.map((m) => {
                const firstName = m.full_name.split(' ')[0];
                const displayText = m.department 
                  ? `${firstName} (${m.department})`
                  : firstName;
                
                return (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {displayText}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {currentAssignee && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setTransferDialogOpen(true)}
              title="Transfer conversation"
            >
              <Repeat className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      <TransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        conversationId={conversationId}
        currentAssignee={currentAssignee}
        onTransferComplete={onAssignmentChange}
      />
    </>
  );
};
