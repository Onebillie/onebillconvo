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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Repeat } from "lucide-react";

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  department?: string;
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
  const [isTransfer, setIsTransfer] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTeamMembers();
    }
  }, [open]);

  const fetchTeamMembers = async () => {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, is_active, department")
      .eq("is_active", true)
      .order("department")
      .order("full_name");

    if (error) {
      console.error("Error fetching team members:", error);
      return;
    }

    setTeamMembers(profiles || []);
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
          <DialogTitle className="flex items-center gap-2">
            {isTransfer ? 'Transfer' : 'Assign'} Conversation
            {isTransfer && <Repeat className="w-4 h-4" />}
          </DialogTitle>
          <DialogDescription>
            {isTransfer 
              ? 'Transfer this conversation to another team member'
              : 'Assign this conversation to a team member'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {currentAssignedTo && (
            <div className="flex items-center gap-2">
              <Switch
                id="transfer-mode"
                checked={isTransfer}
                onCheckedChange={setIsTransfer}
              />
              <Label htmlFor="transfer-mode" className="cursor-pointer">
                Transfer mode (will notify recipient)
              </Label>
            </div>
          )}
          <Select value={selectedMember} onValueChange={setSelectedMember}>
            <SelectTrigger>
              <SelectValue placeholder="Select team member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {teamMembers.map((member) => {
                const firstName = member.full_name.split(' ')[0];
                
                return (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <span>{firstName}</span>
                      {member.department && (
                        <Badge variant="secondary" className="text-xs">
                          {member.department}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
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
