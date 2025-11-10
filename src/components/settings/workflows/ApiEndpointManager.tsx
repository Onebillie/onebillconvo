import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Play } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ApiEndpoint {
  id: string;
  name: string;
  endpoint_url: string;
  http_method: string;
  headers: any;
  body_template: any;
  is_active: boolean;
}

export function ApiEndpointManager() {
  const { currentBusinessId } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<ApiEndpoint | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    endpoint_url: "",
    http_method: "POST",
    headers: "{}",
    body_template: "{}",
  });

  const { data: endpoints, isLoading } = useQuery({
    queryKey: ["api-endpoints", currentBusinessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_endpoints")
        .select("*")
        .eq("business_id", currentBusinessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ApiEndpoint[];
    },
    enabled: !!currentBusinessId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("api_endpoints").insert({
        business_id: currentBusinessId,
        ...data,
        headers: JSON.parse(data.headers || "{}"),
        body_template: JSON.parse(data.body_template || "{}"),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-endpoints"] });
      toast({ title: "API endpoint created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error creating endpoint", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from("api_endpoints")
        .update({
          ...data,
          headers: JSON.parse(data.headers || "{}"),
          body_template: JSON.parse(data.body_template || "{}"),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-endpoints"] });
      toast({ title: "API endpoint updated successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error updating endpoint", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_endpoints").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-endpoints"] });
      toast({ title: "API endpoint deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting endpoint", description: error.message, variant: "destructive" });
    },
  });

  const testEndpoint = async (endpoint: ApiEndpoint) => {
    try {
      toast({ title: "Testing endpoint...", description: "Sending test request" });
      const response = await fetch(endpoint.endpoint_url, {
        method: endpoint.http_method,
        headers: { 
          'Content-Type': 'application/json',
          ...endpoint.headers 
        },
        body: endpoint.http_method !== 'GET' ? JSON.stringify({
          test: true,
          message: "Test request from workflow builder"
        }) : undefined,
      });
      
      if (response.ok) {
        toast({ title: "Test successful", description: `Status: ${response.status} ${response.statusText}` });
      } else {
        toast({ 
          title: "Test failed", 
          description: `Status: ${response.status} ${response.statusText}`,
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      toast({ title: "Test error", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({ name: "", endpoint_url: "", http_method: "POST", headers: "{}", body_template: "{}" });
    setEditingEndpoint(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (endpoint: ApiEndpoint) => {
    setEditingEndpoint(endpoint);
    setFormData({
      name: endpoint.name,
      endpoint_url: endpoint.endpoint_url,
      http_method: endpoint.http_method,
      headers: JSON.stringify(endpoint.headers, null, 2),
      body_template: JSON.stringify(endpoint.body_template, null, 2),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingEndpoint) {
      updateMutation.mutate({ id: editingEndpoint.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this endpoint?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle>API Endpoints</CardTitle>
            <CardDescription>Configure external API endpoints for workflow actions</CardDescription>
          </div>
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Endpoint
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : !endpoints || endpoints.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No API endpoints configured yet. Create one to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {endpoints.map((endpoint) => (
                <TableRow key={endpoint.id}>
                  <TableCell className="font-medium">{endpoint.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{endpoint.http_method}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">
                    {endpoint.endpoint_url}
                  </TableCell>
                  <TableCell>
                    <Badge variant={endpoint.is_active ? "default" : "secondary"}>
                      {endpoint.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => testEndpoint(endpoint)}>
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(endpoint)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(endpoint.id)}>
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
              <DialogTitle>{editingEndpoint ? "Edit API Endpoint" : "Create API Endpoint"}</DialogTitle>
              <DialogDescription>Configure external API for workflow integration</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input
                  placeholder="e.g., OneBill Submit API"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1">
                  <Label>Method</Label>
                  <Select
                    value={formData.http_method}
                    onValueChange={(value) => setFormData({ ...formData, http_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label>Endpoint URL</Label>
                  <Input
                    placeholder="https://api.example.com/submit"
                    value={formData.endpoint_url}
                    onChange={(e) => setFormData({ ...formData, endpoint_url: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Headers (JSON)</Label>
                <Textarea
                  placeholder='{"Authorization": "Bearer {{secrets.API_KEY}}", "Content-Type": "application/json"}'
                  value={formData.headers}
                  onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
                  rows={4}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label>Body Template (JSON)</Label>
                <Textarea
                  placeholder='{"mprn": "{{parsed_data.mprn}}", "phone": "{{parsed_data.phone}}"}'
                  value={formData.body_template}
                  onChange={(e) => setFormData({ ...formData, body_template: e.target.value })}
                  rows={6}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use &#123;&#123;variable&#125;&#125; syntax for dynamic values
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingEndpoint ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
