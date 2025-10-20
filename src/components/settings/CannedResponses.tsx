import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  shortcut: string | null;
  category: string | null;
  is_active: boolean;
}

export const CannedResponses = () => {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<CannedResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    shortcut: "",
    category: "",
  });
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    fetchBusinessId();
    fetchResponses();
  }, []);

  const fetchBusinessId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setBusinessId(data.business_id);
    } catch (error: any) {
      console.error("Error fetching business:", error);
    }
  };

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from("canned_responses")
        .select("*")
        .eq("is_active", true)
        .order("title");

      if (error) throw error;
      setResponses(data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) {
      toast({
        title: "Error",
        description: "Business not found",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingResponse) {
        const { error } = await supabase
          .from("canned_responses")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingResponse.id);

        if (error) throw error;
        toast({ title: "Success", description: "Response updated" });
      } else {
        const { error } = await supabase
          .from("canned_responses")
          .insert([{
            ...formData,
            business_id: businessId,
          }]);

        if (error) throw error;
        toast({ title: "Success", description: "Response created" });
      }

      setDialogOpen(false);
      resetForm();
      fetchResponses();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (response: CannedResponse) => {
    setEditingResponse(response);
    setFormData({
      title: response.title,
      content: response.content,
      shortcut: response.shortcut || "",
      category: response.category || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this canned response?")) return;

    try {
      const { error } = await supabase
        .from("canned_responses")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Response deleted" });
      fetchResponses();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ title: "", content: "", shortcut: "", category: "" });
    setEditingResponse(null);
  };

  const filteredResponses = responses.filter(
    (r) =>
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.category && r.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Canned Responses</CardTitle>
            <CardDescription>Quick replies for common customer questions</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Response
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingResponse ? "Edit" : "Create"} Canned Response</DialogTitle>
                  <DialogDescription>
                    Add quick replies for common questions. Use shortcuts like "/greeting" in messages.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Greeting Message"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shortcut">Shortcut</Label>
                    <Input
                      id="shortcut"
                      value={formData.shortcut}
                      onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                      placeholder="e.g., /greeting"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Support, Sales"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Message Content *</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Hello! How can I help you today?"
                      rows={6}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">{editingResponse ? "Update" : "Create"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search responses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredResponses.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              {searchTerm ? "No responses found" : "No canned responses yet. Create one to get started!"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Shortcut</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResponses.map((response) => (
                  <TableRow key={response.id}>
                    <TableCell className="font-medium">{response.title}</TableCell>
                    <TableCell>
                      {response.shortcut && (
                        <Badge variant="outline">{response.shortcut}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {response.category && (
                        <Badge variant="secondary">{response.category}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md truncate text-muted-foreground">
                      {response.content}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(response)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(response.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
