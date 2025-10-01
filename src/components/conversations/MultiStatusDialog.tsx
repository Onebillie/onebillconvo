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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, Plus, X } from "lucide-react";

interface StatusTag {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

interface MultiStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  currentStatuses?: string[];
  onStatusChange: () => void;
}

export const MultiStatusDialog = ({
  open,
  onOpenChange,
  conversationId,
  currentStatuses = [],
  onStatusChange,
}: MultiStatusDialogProps) => {
  const [statuses, setStatuses] = useState<StatusTag[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(currentStatuses);
  const [loading, setLoading] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#3b82f6");

  useEffect(() => {
    if (open) {
      fetchStatuses();
      fetchCurrentStatuses();
    }
  }, [open]);

  const fetchStatuses = async () => {
    const { data, error } = await supabase
      .from("conversation_status_tags")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching statuses:", error);
      return;
    }

    setStatuses(data || []);
  };

  const fetchCurrentStatuses = async () => {
    const { data, error } = await supabase
      .from("conversation_statuses")
      .select("status_tag_id")
      .eq("conversation_id", conversationId);

    if (error) {
      console.error("Error fetching current statuses:", error);
      return;
    }

    setSelectedStatuses(data?.map(s => s.status_tag_id) || []);
  };

  const toggleStatus = (statusId: string) => {
    setSelectedStatuses(prev =>
      prev.includes(statusId)
        ? prev.filter(id => id !== statusId)
        : [...prev, statusId]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Delete existing statuses
      await supabase
        .from("conversation_statuses")
        .delete()
        .eq("conversation_id", conversationId);

      // Insert new selected statuses
      if (selectedStatuses.length > 0) {
        const { error } = await supabase
          .from("conversation_statuses")
          .insert(
            selectedStatuses.map(statusId => ({
              conversation_id: conversationId,
              status_tag_id: statusId,
            }))
          );

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Statuses updated successfully",
      });

      onStatusChange();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating statuses:", error);
      toast({
        title: "Error",
        description: "Failed to update statuses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomStatus = async () => {
    if (!newStatusName.trim()) return;

    try {
      const { data, error } = await supabase
        .from("conversation_status_tags")
        .insert({
          name: newStatusName.trim(),
          color: newStatusColor,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Custom status created",
      });

      setStatuses(prev => [...prev, data]);
      setSelectedStatuses(prev => [...prev, data.id]);
      setNewStatusName("");
      setNewStatusColor("#3b82f6");
      setShowAddCustom(false);
    } catch (error) {
      console.error("Error creating status:", error);
      toast({
        title: "Error",
        description: "Failed to create custom status",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Statuses</DialogTitle>
          <DialogDescription>
            Select multiple statuses for this conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="grid gap-2">
            {statuses.map((status) => (
              <button
                key={status.id}
                onClick={() => toggleStatus(status.id)}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all hover:bg-muted ${
                  selectedStatuses.includes(status.id)
                    ? "border-primary bg-muted"
                    : "border-border"
                }`}
              >
                <Badge 
                  style={{ 
                    backgroundColor: status.color,
                    color: 'white'
                  }}
                >
                  {status.name}
                </Badge>
                {selectedStatuses.includes(status.id) && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </button>
            ))}
          </div>

          {showAddCustom ? (
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Add Custom Status</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddCustom(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input
                placeholder="Status name"
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
              />
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={newStatusColor}
                  onChange={(e) => setNewStatusColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Button onClick={handleAddCustomStatus} className="flex-1">
                  Create
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowAddCustom(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Status
            </Button>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
