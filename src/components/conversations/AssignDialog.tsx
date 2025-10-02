import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface AssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  currentAssignedTo?: string;
  onAssignmentChange: () => void;
}

export const AssignDialog = ({
  open,
  onOpenChange,
  conversationId,
  currentAssignedTo,
  onAssignmentChange,
}: AssignDialogProps) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>(currentAssignedTo || "unassigned");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTeamMembers();
    }
  }, [open]);

  const fetchTeamMembers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, is_active")
      .eq("is_active", true)
      .order("role")
      .order("full_name");

    if (error) {
      console.error("Error fetching team members:", error);
      return;
    }

    setTeamMembers(data || []);
  };

  const handleAssign = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ 
          assigned_to: selectedMember === "unassigned" ? null : selectedMember,
          updated_at: new Date().toISOString()
        })
        .eq("id", conversationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: selectedMember === "unassigned"
          ? "Assignment removed"
          : "Conversation assigned successfully",
      });

      onAssignmentChange();
      onOpenChange(false);
    } catch (error) {
      console.error("Error assigning conversation:", error);
      toast({
        title: "Error",
        description: "Failed to assign conversation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Conversation</DialogTitle>
          <DialogDescription>
            Assign this conversation to a team member
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Select value={selectedMember} onValueChange={setSelectedMember}>
            <SelectTrigger>
              <SelectValue placeholder="Select team member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.full_name} ({member.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={loading}>
              {loading ? "Assigning..." : "Assign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
