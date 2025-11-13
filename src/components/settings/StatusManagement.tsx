import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StatusTag {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export const StatusManagement = () => {
  const [statuses, setStatuses] = useState<StatusTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusTag | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#3b82f6",
    icon: "",
    auto_create_task: false,
    default_priority: "medium",
    priority_score: 5,
    task_title_template: "",
    task_description_template: "",
    default_assignee_role: "",
  });

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    const { data, error } = await supabase
      .from("conversation_status_tags")
      .select("*")
      .order("priority_score", { ascending: false });

    if (error) {
      console.error("Error fetching statuses:", error);
      return;
    }

    setStatuses(data || []);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingStatus) {
        const { error } = await supabase
          .from("conversation_status_tags")
          .update({
            name: formData.name,
            color: formData.color,
            icon: formData.icon,
            auto_create_task: formData.auto_create_task,
            default_priority: formData.default_priority,
            priority_score: formData.priority_score,
            task_title_template: formData.task_title_template || null,
            task_description_template: formData.task_description_template || null,
            default_assignee_role: formData.default_assignee_role || null,
          })
          .eq("id", editingStatus.id);

        if (error) throw error;

        toast({ title: "Success", description: "Status updated successfully" });
      } else {
        const { error } = await supabase
          .from("conversation_status_tags")
          .insert({
            name: formData.name,
            color: formData.color,
            icon: formData.icon || null,
            auto_create_task: formData.auto_create_task,
            default_priority: formData.default_priority,
            priority_score: formData.priority_score,
            task_title_template: formData.task_title_template || null,
            task_description_template: formData.task_description_template || null,
            default_assignee_role: formData.default_assignee_role || null,
          });

        if (error) throw error;

        toast({ title: "Success", description: "Status created successfully" });
      }

      setDialogOpen(false);
      setEditingStatus(null);
      setFormData({
        name: "",
        color: "#3b82f6",
        icon: "",
        auto_create_task: false,
        default_priority: "medium",
        priority_score: 5,
        task_title_template: "",
        task_description_template: "",
        default_assignee_role: "",
      });
      fetchStatuses();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStatus = async (id: string) => {
    const { error } = await supabase
      .from("conversation_status_tags")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete status",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Success", description: "Status deleted successfully" });
    fetchStatuses();
  };

  const handleEditStatus = (status: any) => {
    setEditingStatus(status);
    setFormData({
      name: status.name,
      color: status.color,
      icon: status.icon || "",
      auto_create_task: status.auto_create_task || false,
      default_priority: status.default_priority || "medium",
      priority_score: status.priority_score || 5,
      task_title_template: status.task_title_template || "",
      task_description_template: status.task_description_template || "",
      default_assignee_role: status.default_assignee_role || "",
    });
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Status Tags</CardTitle>
            <CardDescription>Manage conversation status tags</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingStatus(null);
              setFormData({
                name: "",
                color: "#3b82f6",
                icon: "",
                auto_create_task: false,
                default_priority: 'medium',
                priority_score: 5,
                task_title_template: '',
                task_description_template: '',
                default_assignee_role: '',
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Status
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingStatus ? "Edit Status" : "Create Status"}
                </DialogTitle>
                <DialogDescription>
                  {editingStatus ? "Update the status tag" : "Create a new status tag"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveStatus} className="space-y-4">
                <div className="space-y-2">
                  <Label>Status Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., In Progress, Resolved"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Icon (optional)</Label>
                  <Input
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="e.g., check, clock"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority Ranking (1-100)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.priority_score}
                    onChange={(e) => setFormData({ ...formData, priority_score: parseInt(e.target.value) || 50 })}
                    placeholder="50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher numbers (100) appear at top, lower (1) at bottom. Within same priority, oldest messages appear first.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save Status"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statuses.map((status) => (
              <TableRow key={status.id}>
                <TableCell className="font-medium">{status.name}</TableCell>
                <TableCell className="text-muted-foreground">{(status as any).priority_score || 50}</TableCell>
                <TableCell>
                  <Badge style={{ backgroundColor: status.color }}>
                    {status.name}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditStatus(status)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteStatus(status.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
