import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Plus, MoreVertical, Edit, Copy, Trash2, Download, Upload, 
  Star, Eye, Search, FileText
} from "lucide-react";
import { format } from "date-fns";

export function TemplateManager() {
  const queryClient = useQueryClient();
  const { currentBusinessId } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [previewDialog, setPreviewDialog] = useState<any>(null);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    subject: "",
    html_content: "",
    category: "general",
  });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['email-templates', searchQuery, currentBusinessId],
    queryFn: async () => {
      if (!currentBusinessId) return [];

      let query = supabase
        .from('marketing_email_templates')
        .select('*')
        .eq('business_id', currentBusinessId)
        .order('updated_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentBusinessId,
  });

  // Create/Update template
  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!currentBusinessId) {
        throw new Error('No business selected');
      }
      if (!formData.name || !formData.subject || !formData.html_content) {
        throw new Error('Name, subject, and content are required');
      }

      const templateData = {
        ...formData,
        business_id: currentBusinessId,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('marketing_email_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('marketing_email_templates')
          .insert(templateData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success(editingTemplate ? 'Template updated' : 'Template created');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save template');
    }
  });

  // Delete template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('marketing_email_templates')
        .delete()
        .eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template deleted');
      setDeletingTemplate(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete template');
    }
  });

  // Toggle favorite
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('marketing_email_templates')
        .update({ is_favorite: !isFavorite })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    }
  });

  // Duplicate template
  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      if (!currentBusinessId) {
        throw new Error('No business selected');
      }

      const { error } = await supabase
        .from('marketing_email_templates')
        .insert({
          business_id: currentBusinessId,
          name: `${template.name} (Copy)`,
          description: template.description,
          subject: template.subject,
          html_content: template.html_content,
          category: template.category,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template duplicated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to duplicate template');
    }
  });

  // Download template as JSON
  const downloadTemplate = (template: any) => {
    const dataStr = JSON.stringify(template, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.name.replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  // Upload template from JSON
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const templateData = JSON.parse(text);
      
      setFormData({
        name: templateData.name || "",
        description: templateData.description || "",
        subject: templateData.subject || "",
        html_content: templateData.html_content || "",
        category: templateData.category || "general",
      });
      setShowDialog(true);
      toast.success('Template loaded from file');
    } catch (error) {
      toast.error('Failed to parse template file');
    }
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      subject: template.subject,
      html_content: template.html_content,
      category: template.category,
    });
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingTemplate(null);
    setFormData({
      name: "",
      description: "",
      subject: "",
      html_content: "",
      category: "general",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Templates</h2>
          <p className="text-muted-foreground">
            Manage reusable email templates for your campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <label htmlFor="upload-template" className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Upload
              <input
                id="upload-template"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </Button>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading templates...
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first email template to get started
            </p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="relative group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="line-clamp-1">{template.name}</CardTitle>
                      {template.is_favorite && (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      )}
                    </div>
                    <CardDescription className="line-clamp-2">
                      {template.description || 'No description'}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPreviewDialog(template)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(template)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateTemplateMutation.mutate(template)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => toggleFavoriteMutation.mutate({ 
                          id: template.id, 
                          isFavorite: template.is_favorite 
                        })}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        {template.is_favorite ? 'Unfavorite' : 'Favorite'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => downloadTemplate(template)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setDeletingTemplate(template.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{template.category}</Badge>
                  {template.usage_count > 0 && (
                    <Badge variant="secondary">Used {template.usage_count}x</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Subject: {template.subject}
                </div>
                <div className="text-xs text-muted-foreground">
                  Updated {format(new Date(template.updated_at), 'PP')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>
              Create a reusable email template for your campaigns
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Summer Sale Template"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., promotional, newsletter"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this template"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Your compelling subject line"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">HTML Content *</Label>
              <Textarea
                id="content"
                value={formData.html_content}
                onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                placeholder="<h1>Hello!</h1><p>Your email content...</p>"
                className="min-h-[300px] font-mono text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button 
                onClick={() => saveTemplateMutation.mutate()}
                disabled={saveTemplateMutation.isPending}
              >
                {editingTemplate ? 'Update' : 'Create'} Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewDialog} onOpenChange={() => setPreviewDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewDialog?.name}</DialogTitle>
            <DialogDescription>Subject: {previewDialog?.subject}</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 max-h-[70vh] overflow-y-auto">
            <div dangerouslySetInnerHTML={{ __html: previewDialog?.html_content || '' }} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTemplate && deleteTemplateMutation.mutate(deletingTemplate)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}