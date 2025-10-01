import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: string;
  customerId?: string;
  messageId?: string;
  messageContent?: string;
  onTaskCreated: () => void;
}

interface TeamMember {
  id: string;
  full_name: string;
}

export const TaskDialog = ({
  open,
  onOpenChange,
  conversationId,
  customerId,
  messageId,
  messageContent,
  onTaskCreated,
}: TaskDialogProps) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: messageContent || "",
    assignedTo: "unassigned",
    dueDate: new Date(),
    priority: "medium",
  });

  useEffect(() => {
    if (open) {
      fetchTeamMembers();
      if (messageContent) {
        setFormData(prev => ({
          ...prev,
          description: messageContent,
          title: messageContent.substring(0, 50) + (messageContent.length > 50 ? "..." : ""),
        }));
      }
    }
  }, [open, messageContent]);

  const fetchTeamMembers = async () => {
    const { data, error } = await supabase
      .from("team_members")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name");

    if (error) {
      console.error("Error fetching team members:", error);
      return;
    }

    setTeamMembers(data || []);
  };

  const handleCreateTask = async () => {
    if (!formData.title || !formData.dueDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("tasks").insert({
        title: formData.title,
        description: formData.description,
        message_id: messageId,
        conversation_id: conversationId,
        customer_id: customerId,
        assigned_to: formData.assignedTo === "unassigned" ? null : formData.assignedTo,
        due_date: formData.dueDate.toISOString(),
        priority: formData.priority,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task created successfully",
      });

      onTaskCreated();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        assignedTo: "unassigned",
        dueDate: new Date(),
        priority: "medium",
      });
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>
            Schedule a task from this conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Task title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Task description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Due Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.dueDate ? format(formData.dueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.dueDate}
                  onSelect={(date) => date && setFormData({ ...formData, dueDate: date })}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assign To</Label>
            <Select value={formData.assignedTo} onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask} disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
