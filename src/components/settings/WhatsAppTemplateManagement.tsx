import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, RefreshCw, Download } from "lucide-react";

interface TemplateFormData {
  name: string;
  category: string;
  language: string;
  header_type?: string;
  header_text?: string;
  body_text: string;
  footer_text?: string;
  buttons: Array<{ type: string; text: string; url?: string; phone_number?: string; }>;
}

interface MetaTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components: Array<{
    type: string;
    text?: string;
    format?: string;
  }>;
}

export const WhatsAppTemplateManagement = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buttons, setButtons] = useState<Array<{ type: string; text: string; url?: string; phone_number?: string; }>>([]);
  const [metaTemplates, setMetaTemplates] = useState<MetaTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { register, handleSubmit, reset, watch, setValue } = useForm<TemplateFormData>({
    defaultValues: {
      category: "MARKETING",
      language: "en",
      header_type: "TEXT",
    }
  });

  const addButton = () => {
    setButtons([...buttons, { type: "QUICK_REPLY", text: "" }]);
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const updateButton = (index: number, field: string, value: string) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setButtons(newButtons);
  };

  useEffect(() => {
    fetchMetaTemplates();
  }, []);

  const fetchMetaTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-templates");
      
      if (error) throw error;
      
      setMetaTemplates(data.templates || []);
      toast.success(`Loaded ${data.templates?.length || 0} templates from Meta`);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast.error(error.message || "Failed to fetch templates from Meta");
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const syncTemplateToDatabase = async (template: MetaTemplate) => {
    setIsSyncing(true);
    try {
      // Extract body text from components
      const bodyComponent = template.components.find(c => c.type === 'BODY');
      const content = bodyComponent?.text || '';

      // Check if template already exists
      const { data: existing } = await supabase
        .from('message_templates')
        .select('id')
        .eq('name', template.name)
        .eq('platform', 'whatsapp')
        .single();

      if (existing) {
        toast.info(`Template "${template.name}" already synced`);
        return;
      }

      // Insert into message_templates with metadata for template sending
      const { error } = await supabase
        .from('message_templates')
        .insert({
          name: template.name,
          content,
          platform: 'whatsapp',
          category: template.category.toLowerCase(),
          is_active: template.status === 'APPROVED',
          metadata: {
            meta_template_name: template.name,
            template_language: template.language,
          },
        });

      if (error) throw error;

      toast.success(`Synced "${template.name}" to local templates`);
    } catch (error: any) {
      console.error("Error syncing template:", error);
      toast.error(error.message || "Failed to sync template");
    } finally {
      setIsSyncing(false);
    }
  };

  const syncAllTemplates = async () => {
    setIsSyncing(true);
    try {
      const approvedTemplates = metaTemplates.filter(t => t.status === 'APPROVED');
      
      for (const template of approvedTemplates) {
        await syncTemplateToDatabase(template);
      }
      
      toast.success(`Synced ${approvedTemplates.length} templates`);
    } catch (error: any) {
      console.error("Error syncing all templates:", error);
      toast.error("Failed to sync all templates");
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'default';
      case 'PENDING': return 'secondary';
      case 'REJECTED': return 'destructive';
      default: return 'outline';
    }
  };

  const onSubmit = async (data: TemplateFormData) => {
    setIsSubmitting(true);
    try {
      const components = [];

      // Add header component if provided
      if (data.header_text && data.header_type) {
        components.push({
          type: "HEADER",
          format: data.header_type,
          text: data.header_text,
        });
      }

      // Add body component (required)
      components.push({
        type: "BODY",
        text: data.body_text,
      });

      // Add footer component if provided
      if (data.footer_text) {
        components.push({
          type: "FOOTER",
          text: data.footer_text,
        });
      }

      // Add buttons component if any buttons exist
      if (buttons.length > 0) {
        const formattedButtons = buttons.map(btn => {
          if (btn.type === 'URL') {
            return {
              type: btn.type,
              text: btn.text,
              url: btn.url || ''
            };
          } else if (btn.type === 'PHONE_NUMBER') {
            return {
              type: btn.type,
              text: btn.text,
              phone_number: btn.phone_number || ''
            };
          } else {
            return {
              type: btn.type,
              text: btn.text
            };
          }
        });
        
        components.push({
          type: "BUTTONS",
          buttons: formattedButtons,
        });
      }

      const { error } = await supabase.functions.invoke("whatsapp-submit-template", {
        body: {
          name: data.name,
          category: data.category,
          language: data.language,
          components,
        },
      });

      if (error) throw error;

      toast.success("Template submitted to Meta for approval");
      reset();
      setButtons([]);
      // Refresh the templates list after a delay to allow Meta to process
      setTimeout(() => fetchMetaTemplates(), 2000);
    } catch (error: any) {
      console.error("Error submitting template:", error);
      toast.error(error.message || "Failed to submit template");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Business Templates</CardTitle>
          <CardDescription>
            Manage your WhatsApp message templates from Meta Business Manager
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="existing" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">Existing Templates</TabsTrigger>
              <TabsTrigger value="create">Create New</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {metaTemplates.length} templates from Meta Business Manager
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchMetaTemplates}
                    disabled={isLoadingTemplates}
                  >
                    {isLoadingTemplates ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Refresh
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={syncAllTemplates}
                    disabled={isSyncing || metaTemplates.length === 0}
                  >
                    {isSyncing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Sync All Approved
                  </Button>
                </div>
              </div>

              {isLoadingTemplates ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : metaTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No templates found. Create your first template below.
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Language</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Content Preview</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metaTemplates.map((template) => {
                        const bodyComponent = template.components.find(c => c.type === 'BODY');
                        return (
                          <TableRow key={template.id}>
                            <TableCell className="font-medium">{template.name}</TableCell>
                            <TableCell>{template.language}</TableCell>
                            <TableCell className="capitalize">{template.category.toLowerCase()}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusColor(template.status)}>
                                {template.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                              {bodyComponent?.text || 'No content'}
                            </TableCell>
                            <TableCell className="text-right">
                              {template.status === 'APPROVED' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => syncTemplateToDatabase(template)}
                                  disabled={isSyncing}
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Sync
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                {...register("name", { required: true })}
                placeholder="welcome_message"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select onValueChange={(value) => setValue("category", value)} defaultValue="MARKETING">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="UTILITY">Utility</SelectItem>
                  <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select onValueChange={(value) => setValue("language", value)} defaultValue="en">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="header_type">Header Type (Optional)</Label>
              <Select onValueChange={(value) => setValue("header_type", value)} defaultValue="TEXT">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT">Text</SelectItem>
                  <SelectItem value="IMAGE">Image</SelectItem>
                  <SelectItem value="VIDEO">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="header_text">Header Text (Optional)</Label>
            <Input
              id="header_text"
              {...register("header_text")}
              placeholder="Welcome to our service!"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body_text">Body Text (Required)</Label>
            <Textarea
              id="body_text"
              {...register("body_text", { required: true })}
              placeholder="Hello {{1}}, thank you for contacting us..."
              rows={4}
            />
            <p className="text-sm text-muted-foreground">
              Use {"{{1}}"}, {"{{2}}"} for variables
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="footer_text">Footer Text (Optional)</Label>
            <Input
              id="footer_text"
              {...register("footer_text")}
              placeholder="Reply STOP to unsubscribe"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Buttons (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addButton}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Button
              </Button>
            </div>
            
            {buttons.map((button, index) => (
              <div key={index} className="space-y-2">
                <div className="flex gap-2">
                  <Select
                    value={button.type}
                    onValueChange={(value) => updateButton(index, "type", value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="QUICK_REPLY">Quick Reply</SelectItem>
                      <SelectItem value="URL">URL</SelectItem>
                      <SelectItem value="PHONE_NUMBER">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={button.text}
                    onChange={(e) => updateButton(index, "text", e.target.value)}
                    placeholder="Button text"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeButton(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {button.type === 'URL' && (
                  <Input
                    value={button.url || ''}
                    onChange={(e) => updateButton(index, "url", e.target.value)}
                    placeholder="https://example.com"
                    className="ml-[196px]"
                  />
                )}
                {button.type === 'PHONE_NUMBER' && (
                  <Input
                    value={button.phone_number || ''}
                    onChange={(e) => updateButton(index, "phone_number", e.target.value)}
                    placeholder="+1234567890"
                    className="ml-[196px]"
                  />
                )}
              </div>
            ))}
          </div>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit to Meta for Approval
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
