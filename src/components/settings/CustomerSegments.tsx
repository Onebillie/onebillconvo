import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Users, Trash2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Segment {
  id: string;
  name: string;
  description: string;
  filters: any;
  is_dynamic: boolean;
  customer_count: number;
  last_calculated_at: string | null;
  created_at: string;
}

export function CustomerSegments() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newSegment, setNewSegment] = useState({
    name: "",
    description: "",
    filters: {},
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    try {
      const { data, error } = await supabase
        .from("customer_segments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSegments(data || []);
    } catch (error) {
      console.error("Error fetching segments:", error);
      toast({
        title: "Error",
        description: "Failed to load customer segments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const user = await supabase.auth.getUser();
      const businessId = user.data.user?.user_metadata?.business_id;

      const { error } = await supabase.from("customer_segments").insert({
        business_id: businessId,
        name: newSegment.name,
        description: newSegment.description,
        filters: newSegment.filters,
        is_dynamic: true,
        created_by: user.data.user?.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Segment created successfully",
      });
      setShowDialog(false);
      setNewSegment({ name: "", description: "", filters: {} });
      fetchSegments();
    } catch (error) {
      console.error("Error creating segment:", error);
      toast({
        title: "Error",
        description: "Failed to create segment",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("customer_segments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Segment deleted successfully",
      });
      fetchSegments();
    } catch (error) {
      console.error("Error deleting segment:", error);
      toast({
        title: "Error",
        description: "Failed to delete segment",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Customer Segments</h3>
          <p className="text-sm text-muted-foreground">
            Create targeted groups of customers for marketing campaigns
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Segment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Customer Segment</DialogTitle>
              <DialogDescription>
                Define a group of customers based on specific criteria
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Segment Name</Label>
                <Input
                  value={newSegment.name}
                  onChange={(e) =>
                    setNewSegment({ ...newSegment, name: e.target.value })
                  }
                  placeholder="e.g., High Value Customers"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newSegment.description}
                  onChange={(e) =>
                    setNewSegment({ ...newSegment, description: e.target.value })
                  }
                  placeholder="Describe this segment..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Segment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {segments.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No segments yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first customer segment to start targeting specific groups
          </p>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Segment
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {segments.map((segment) => (
            <Card key={segment.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{segment.name}</h4>
                    {segment.is_dynamic && (
                      <Badge variant="secondary">Dynamic</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {segment.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {segment.customer_count || 0} customers
                    </span>
                    {segment.last_calculated_at && (
                      <span>
                        Last updated:{" "}
                        {new Date(segment.last_calculated_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(segment.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
