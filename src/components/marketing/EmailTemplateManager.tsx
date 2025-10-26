import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Save, Eye, Copy, Trash2, Search, MoreVertical, Edit, Download, Code2, Sparkles } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  email_content: string;
  email_subject: string;
  created_at: string;
}

export function EmailTemplateManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('promotional');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');

  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['email-templates', searchQuery, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('marketing_templates')
        .select('*')
        .contains('channels', ['email'])
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmailTemplate[];
    }
  });

  // Fetch settings HTML template
  const { data: settingsTemplate } = useQuery({
    queryKey: ['settings-email-template'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_settings')
        .select('email_html_template')
        .single();
      
      if (error) throw error;
      return data.email_html_template;
    }
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: businessUser } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      if (!businessUser) throw new Error('No business found');

      if (editingTemplate) {
        const { data, error } = await supabase
          .from('marketing_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('marketing_templates')
          .insert({
            ...templateData,
            business_id: businessUser.business_id,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success(editingTemplate ? 'Template updated' : 'Template created');
      handleDialogClose();
    },
    onError: (error) => {
      toast.error('Failed to save template: ' + error.message);
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('marketing_templates')
        .delete()
        .eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template deleted');
      setDeletingTemplateId(null);
    },
    onError: (error) => {
      toast.error('Failed to delete template: ' + error.message);
    }
  });

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (!emailSubject.trim()) {
      toast.error('Please enter an email subject');
      return;
    }

    if (!emailContent.trim()) {
      toast.error('Please enter email content');
      return;
    }

    saveTemplateMutation.mutate({
      name: templateName,
      description: templateDescription,
      category: templateCategory,
      channels: ['email'],
      email_subject: emailSubject,
      email_content: emailContent,
    });
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setTemplateCategory(template.category || 'promotional');
    setEmailSubject(template.email_subject);
    setEmailContent(template.email_content);
    setTemplateDialogOpen(true);
  };

  const handleDialogClose = () => {
    setTemplateDialogOpen(false);
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateDescription('');
    setTemplateCategory('promotional');
    setEmailSubject('');
    setEmailContent('');
  };

  const handleImportFromSettings = () => {
    if (settingsTemplate) {
      setEmailContent(settingsTemplate);
      toast.success('Template imported from settings');
    } else {
      toast.error('No template found in settings');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Templates</h2>
          <p className="text-muted-foreground">
            Create and manage reusable email templates for campaigns
          </p>
        </div>
        <Button onClick={() => setTemplateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="promotional">Promotional</SelectItem>
            <SelectItem value="newsletter">Newsletter</SelectItem>
            <SelectItem value="transactional">Transactional</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="reengagement">Re-engagement</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
      ) : templates && templates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-base line-clamp-1">{template.name}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2">
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
                      <DropdownMenuItem onClick={() => setPreviewTemplate(template)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        navigator.clipboard.writeText(template.email_content);
                        toast.success('Content copied');
                      }}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Content
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setDeletingTemplateId(template.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {template.category && (
                    <Badge variant="secondary" className="text-xs">
                      {template.category}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  <strong>Subject:</strong> {template.email_subject}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No email templates yet</p>
            <Button onClick={() => setTemplateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              {editingTemplate ? 'Edit Template' : 'Create Email Template'}
            </DialogTitle>
            <DialogDescription>
              Design professional email templates with HTML or import from settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Available Merge Tags:</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <code className="bg-muted px-2 py-1 rounded">{"{{first_name}}"}</code>
                    <code className="bg-muted px-2 py-1 rounded">{"{{customer_name}}"}</code>
                    <code className="bg-muted px-2 py-1 rounded">{"{{email}}"}</code>
                    <code className="bg-muted px-2 py-1 rounded">{"{{phone}}"}</code>
                    <code className="bg-muted px-2 py-1 rounded">{"{{company_name}}"}</code>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="E.g., Welcome Email"
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={templateCategory} onValueChange={setTemplateCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="transactional">Transactional</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="reengagement">Re-engagement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Brief description"
              />
            </div>

            <div className="space-y-2">
              <Label>Email Subject *</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Subject line with {{merge_tags}}"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Email HTML Content *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleImportFromSettings}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Import from Settings
                </Button>
              </div>
              <Textarea
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                rows={15}
                className="font-mono text-xs"
                placeholder="Enter HTML content..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleDialogClose}>
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate} disabled={saveTemplateMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {saveTemplateMutation.isPending ? 'Saving...' : editingTemplate ? 'Update' : 'Create Template'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Template Preview: {previewTemplate?.name}</DialogTitle>
            <DialogDescription>
              Subject: {previewTemplate?.email_subject}
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-background overflow-auto max-h-[60vh]">
            <iframe
              srcDoc={previewTemplate?.email_content}
              className="w-full h-96 border-0"
              title="Email Preview"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTemplateId} onOpenChange={() => setDeletingTemplateId(null)}>
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
              onClick={() => deletingTemplateId && deleteTemplateMutation.mutate(deletingTemplateId)}
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