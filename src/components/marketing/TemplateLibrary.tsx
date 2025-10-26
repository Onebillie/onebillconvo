import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Eye, Copy, Trash2, Search, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  industry: string | null;
  channels: string[];
  email_subject: string | null;
  email_content: string | null;
  sms_content: string | null;
  whatsapp_content: string | null;
  is_public: boolean;
  usage_count: number;
  tags: string[];
}

interface TemplateLibraryProps {
  onSelectTemplate?: (template: Template) => void;
  showSaveDialog?: boolean;
  currentContent?: {
    email_subject?: string;
    email_content?: string;
    sms_content?: string;
    whatsapp_content?: string;
    channels?: string[];
  };
  onSaveComplete?: () => void;
}

export function TemplateLibrary({
  onSelectTemplate,
  showSaveDialog = false,
  currentContent,
  onSaveComplete
}: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [saveDialogOpen, setSaveDialogOpen] = useState(showSaveDialog);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [templateIndustry, setTemplateIndustry] = useState('');

  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['marketing-templates', searchQuery, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('marketing_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Template[];
    }
  });

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

      const { data, error } = await supabase
        .from('marketing_templates')
        .insert({
          ...templateData,
          business_id: businessUser.business_id,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-templates'] });
      toast.success('Template saved successfully');
      setSaveDialogOpen(false);
      setTemplateName('');
      setTemplateDescription('');
      setTemplateCategory('');
      setTemplateIndustry('');
      onSaveComplete?.();
    },
    onError: (error) => {
      toast.error('Failed to save template: ' + error.message);
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('marketing_templates')
        .delete()
        .eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-templates'] });
      toast.success('Template deleted');
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

    saveTemplateMutation.mutate({
      name: templateName,
      description: templateDescription,
      category: templateCategory || null,
      industry: templateIndustry || null,
      channels: currentContent?.channels || ['email'],
      email_subject: currentContent?.email_subject || null,
      email_content: currentContent?.email_content || null,
      sms_content: currentContent?.sms_content || null,
      whatsapp_content: currentContent?.whatsapp_content || null,
    });
  };

  const myTemplates = templates?.filter(t => !t.is_public) || [];
  const publicTemplates = templates?.filter(t => t.is_public) || [];

  return (
    <div className="space-y-4">
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
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="promo">Promotional</SelectItem>
            <SelectItem value="invoice">Invoice</SelectItem>
            <SelectItem value="newsletter">Newsletter</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setSaveDialogOpen(true)}>
          <Save className="w-4 h-4 mr-2" />
          Save Current
        </Button>
      </div>

      {/* Templates Tabs */}
      <Tabs defaultValue="my-templates">
        <TabsList>
          <TabsTrigger value="my-templates">My Templates ({myTemplates.length})</TabsTrigger>
          <TabsTrigger value="public">Public Gallery ({publicTemplates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="my-templates" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
          ) : myTemplates.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground mb-4">No templates yet</p>
                <Button onClick={() => setSaveDialogOpen(true)}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Your First Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myTemplates.map((template) => (
                <Card key={template.id} className="hover:border-primary transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription className="text-xs line-clamp-2">
                          {template.description || 'No description'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {template.channels.map((channel) => (
                        <Badge key={channel} variant="secondary" className="text-xs">
                          {channel}
                        </Badge>
                      ))}
                      {template.category && (
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => onSelectTemplate?.(template)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Use
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(template.email_content || '');
                          toast.success('Content copied');
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTemplateMutation.mutate(template.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="public" className="space-y-4">
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-2">Public template gallery coming soon!</p>
            <p className="text-sm">Browse professionally designed templates from the community</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Template Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Save your current campaign content as a reusable template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="E.g., Summer Sale Email"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Brief description of this template"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={templateCategory} onValueChange={setTemplateCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promo">Promotional</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={templateIndustry} onValueChange={setTemplateIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="hospitality">Hospitality</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate} disabled={saveTemplateMutation.isPending}>
                {saveTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
