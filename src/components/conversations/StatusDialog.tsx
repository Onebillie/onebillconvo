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
import { Check } from "lucide-react";

interface StatusTag {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

interface StatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  currentStatusId?: string;
  onStatusChange: () => void;
}

export const StatusDialog = ({
  open,
  onOpenChange,
  conversationId,
  currentStatusId,
  onStatusChange,
}: StatusDialogProps) => {
  const [statuses, setStatuses] = useState<StatusTag[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>(currentStatusId || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchStatuses();
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

  const handleChangeStatus = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ status_tag_id: selectedStatus || null })
        .eq("id", conversationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Status updated successfully",
      });

      onStatusChange();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
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
          <DialogTitle>Change Status</DialogTitle>
          <DialogDescription>
            Select a status for this conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            {statuses.map((status) => (
              <button
                key={status.id}
                onClick={() => setSelectedStatus(status.id)}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all hover:bg-muted ${
                  selectedStatus === status.id
                    ? "border-primary bg-muted"
                    : "border-border"
                }`}
              >
                <Badge style={{ backgroundColor: status.color }}>
                  {status.name}
                </Badge>
                {selectedStatus === status.id && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </button>
            ))}
            <button
              onClick={() => setSelectedStatus("")}
              className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all hover:bg-muted ${
                selectedStatus === ""
                  ? "border-primary bg-muted"
                  : "border-border"
              }`}
            >
              <span className="text-sm text-muted-foreground">No Status</span>
              {selectedStatus === "" && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </button>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeStatus} disabled={loading}>
              {loading ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
