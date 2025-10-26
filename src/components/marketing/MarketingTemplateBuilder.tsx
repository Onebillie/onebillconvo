import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Mail, MessageSquare, Phone, Save, Eye, Sparkles, Tag, X } from "lucide-react";
import { RichContentEditor } from "./RichContentEditor";

interface MarketingTemplateBuilderProps {
  open: boolean;
  onClose: () => void;
  templateId?: string;
  onSave?: () => void;
}

const MERGE_TAGS = [
  { tag: "{{first_name}}", label: "First Name" },
  { tag: "{{customer_name}}", label: "Full Name" },
  { tag: "{{email}}", label: "Email" },
  { tag: "{{phone}}", label: "Phone" },
  { tag: "{{company_name}}", label: "Company" },
];

export function MarketingTemplateBuilder({ open, onClose, templateId, onSave }: MarketingTemplateBuilderProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "promotional" as string,
    channels: [] as string[],
    industry_tags: [] as string[],
    content_email: "",
    content_whatsapp: "",
    content_sms: "",
    email_subject: "",
    is_public: false,
  });
  const [tagInput, setTagInput] = useState("");

  const handleChannelToggle = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
  };

  const addIndustryTag = () => {
    if (tagInput.trim() && !formData.industry_tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        industry_tags: [...prev.industry_tags, tagInput.trim()]
      }));
      setTagInput("");
    }
  };

  const removeIndustryTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      industry_tags: prev.industry_tags.filter(t => t !== tag)
    }));
  };

  const handleSave = async (publish: boolean = false) => {
    if (!formData.name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (formData.channels.length === 0) {
      toast.error("Please select at least one channel");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: businessUser } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

      if (!businessUser) throw new Error("No business found");

      const templateData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        channels: formData.channels,
        industry_tags: formData.industry_tags,
        content_email: formData.content_email,
        content_whatsapp: formData.content_whatsapp,
        content_sms: formData.content_sms,
        email_subject: formData.email_subject,
        is_public: publish ? formData.is_public : false,
        business_id: businessUser.business_id,
      };

      if (templateId) {
        const { error } = await supabase
          .from("marketing_templates")
          .update(templateData)
          .eq("id", templateId);

        if (error) throw error;
        toast.success("Template updated successfully");
      } else {
        const { error } = await supabase
          .from("marketing_templates")
          .insert(templateData);

        if (error) throw error;
        toast.success(publish ? "Template published" : "Template saved as draft");
      }

      onSave?.();
      onClose();
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error(error.message || "Failed to save template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {templateId ? "Edit Template" : "Create Marketing Template"}
          </DialogTitle>
          <DialogDescription>
            Create professional templates for email, WhatsApp, and SMS campaigns
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Properties */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name *</Label>
                  <Input
                    placeholder="e.g., Flash Sale Alert"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="promotional">Promotional</SelectItem>
                      <SelectItem value="newsletter">Newsletter</SelectItem>
                      <SelectItem value="transactional">Transactional</SelectItem>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="reengagement">Re-engagement</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Brief description of this template"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Channels *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.channels.includes("email") ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleChannelToggle("email")}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                  <Button
                    type="button"
                    variant={formData.channels.includes("whatsapp") ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleChannelToggle("whatsapp")}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button
                    type="button"
                    variant={formData.channels.includes("sms") ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleChannelToggle("sms")}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    SMS
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Industry Tags</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., retail, saas, ecommerce"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addIndustryTag())}
                  />
                  <Button type="button" onClick={addIndustryTag} size="sm">
                    <Tag className="w-4 h-4" />
                  </Button>
                </div>
                {formData.industry_tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.industry_tags.map(tag => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => removeIndustryTag(tag)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Content Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Template Content</CardTitle>
              <CardDescription>
                Create content for each channel. Use merge tags like {MERGE_TAGS[0].tag} to personalize.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="email" disabled={!formData.channels.includes("email")}>
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="whatsapp" disabled={!formData.channels.includes("whatsapp")}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    WhatsApp
                  </TabsTrigger>
                  <TabsTrigger value="sms" disabled={!formData.channels.includes("sms")}>
                    <Phone className="w-4 h-4 mr-2" />
                    SMS
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Subject Line</Label>
                    <Input
                      placeholder="Email subject with {{merge_tags}}"
                      value={formData.email_subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, email_subject: e.target.value }))}
                    />
                  </div>
                  <RichContentEditor
                    value={formData.content_email}
                    onChange={(value) => setFormData(prev => ({ ...prev, content_email: value }))}
                    label="Email HTML Content"
                    channel="email"
                    showSubject={false}
                  />
                </TabsContent>

                <TabsContent value="whatsapp">
                  <RichContentEditor
                    value={formData.content_whatsapp}
                    onChange={(value) => setFormData(prev => ({ ...prev, content_whatsapp: value }))}
                    label="WhatsApp Message"
                    channel="whatsapp"
                  />
                </TabsContent>

                <TabsContent value="sms">
                  <RichContentEditor
                    value={formData.content_sms}
                    onChange={(value) => setFormData(prev => ({ ...prev, content_sms: value }))}
                    label="SMS Message"
                    channel="sms"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleSave(false)} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                Save as Draft
              </Button>
              <Button onClick={() => handleSave(true)} disabled={loading}>
                <Sparkles className="w-4 h-4 mr-2" />
                {loading ? "Saving..." : "Save & Publish"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
