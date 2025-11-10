import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface DocumentType {
  id: string;
  name: string;
  description: string | null;
  ai_detection_keywords: string[];
  required_fields: any[];
  is_active: boolean;
}

export function DocumentTypeManager() {
  const { currentBusinessId } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<DocumentType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    ai_detection_keywords: "",
    required_fields: "[]",
  });

  const { data: documentTypes, isLoading } = useQuery({
    queryKey: ["document-types", currentBusinessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_types")
        .select("*")
        .eq("business_id", currentBusinessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DocumentType[];
    },
    enabled: !!currentBusinessId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("document_types").insert({
        business_id: currentBusinessId,
        ...data,
        ai_detection_keywords: data.ai_detection_keywords.split(",").map((k: string) => k.trim()),
        required_fields: JSON.parse(data.required_fields || "[]"),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
      toast({ title: "Document type created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error creating document type", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from("document_types")
        .update({
          ...data,
          ai_detection_keywords: data.ai_detection_keywords.split(",").map((k: string) => k.trim()),
          required_fields: JSON.parse(data.required_fields || "[]"),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
      toast({ title: "Document type updated successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error updating document type", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("document_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
      toast({ title: "Document type deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting document type", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", ai_detection_keywords: "", required_fields: "[]" });
    setEditingType(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (type: DocumentType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description || "",
      ai_detection_keywords: type.ai_detection_keywords.join(", "),
      required_fields: JSON.stringify(type.required_fields, null, 2),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this document type?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Document Types</CardTitle>
            <CardDescription>
              Define document types for AI classification and field extraction
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Type
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : !documentTypes || documentTypes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No document types configured yet. Create one to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Keywords</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{type.description}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {type.ai_detection_keywords.slice(0, 3).map((kw, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                      {type.ai_detection_keywords.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{type.ai_detection_keywords.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={type.is_active ? "default" : "secondary"}>
                      {type.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(type)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(type.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingType ? "Edit Document Type" : "Create Document Type"}</DialogTitle>
              <DialogDescription>
                Configure how AI should recognize and extract data from this document type
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input
                  placeholder="e.g., Electricity Bill, Invoice, Passport"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Brief description of this document type"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label>AI Detection Keywords (comma-separated)</Label>
                <Input
                  placeholder="electricity, bill, ESB, kilowatt, kWh, MPRN"
                  value={formData.ai_detection_keywords}
                  onChange={(e) => setFormData({ ...formData, ai_detection_keywords: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Keywords help AI recognize this document type
                </p>
              </div>
              <div>
                <Label>Required Fields (JSON)</Label>
                <Textarea
                  placeholder='[{"name": "mprn", "type": "string", "isPII": false}]'
                  value={formData.required_fields}
                  onChange={(e) => setFormData({ ...formData, required_fields: e.target.value })}
                  rows={6}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Define fields to extract: name, type, isPII, description
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingType ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
