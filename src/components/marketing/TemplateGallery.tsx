import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Star, Copy, Mail, MessageSquare, Phone, Eye, Sparkles } from "lucide-react";

interface TemplateGalleryProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate?: (template: any) => void;
}

export function TemplateGallery({ open, onClose, onSelectTemplate }: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["marketing-templates", searchQuery, categoryFilter, industryFilter, channelFilter],
    queryFn: async () => {
      let query = supabase
        .from("marketing_templates")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      if (channelFilter !== "all") {
        query = query.contains("channels", [channelFilter]);
      }

      if (industryFilter !== "all") {
        query = query.contains("industry_tags", [industryFilter]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: myTemplates } = useQuery({
    queryKey: ["my-templates"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: businessUser } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

      if (!businessUser) return [];

      const { data, error } = await supabase
        .from("marketing_templates")
        .select("*")
        .eq("business_id", businessUser.business_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const handleCloneTemplate = async (template: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: businessUser } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

      if (!businessUser) throw new Error("No business found");

      const { error } = await supabase
        .from("marketing_templates")
        .insert({
          name: `${template.name} (Copy)`,
          description: template.description,
          category: template.category,
          channels: template.channels,
          industry_tags: template.industry_tags,
          content_email: template.content_email,
          content_whatsapp: template.content_whatsapp,
          content_sms: template.content_sms,
          email_subject: template.email_subject,
          business_id: businessUser.business_id,
          is_public: false,
        });

      if (error) throw error;

      toast.success("Template cloned to your library");
    } catch (error: any) {
      console.error("Error cloning template:", error);
      toast.error(error.message || "Failed to clone template");
    }
  };

  const handleUseTemplate = (template: any) => {
    onSelectTemplate?.(template);
    onClose();
  };

  const getChannelIcons = (channels: string[]) => {
    return channels.map(channel => {
      switch (channel) {
        case "email":
          return <Mail key={channel} className="w-4 h-4" />;
        case "whatsapp":
          return <MessageSquare key={channel} className="w-4 h-4" />;
        case "sms":
          return <Phone key={channel} className="w-4 h-4" />;
        default:
          return null;
      }
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      promotional: "bg-orange-100 text-orange-800",
      newsletter: "bg-blue-100 text-blue-800",
      transactional: "bg-green-100 text-green-800",
      onboarding: "bg-purple-100 text-purple-800",
      reengagement: "bg-pink-100 text-pink-800",
      referral: "bg-yellow-100 text-yellow-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const renderTemplateCard = (template: any) => (
    <Card key={template.id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <CardDescription className="mt-1">{template.description}</CardDescription>
          </div>
          {template.is_featured && (
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge className={getCategoryColor(template.category)}>
            {template.category}
          </Badge>
          <div className="flex gap-1">
            {getChannelIcons(template.channels || [])}
          </div>
          {template.industry_tags?.slice(0, 2).map((tag: string) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {(template.industry_tags?.length || 0) > 2 && (
            <Badge variant="outline" className="text-xs">
              +{template.industry_tags.length - 2}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPreviewTemplate(template)}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCloneTemplate(template)}
            className="flex-1"
          >
            <Copy className="w-4 h-4 mr-2" />
            Clone
          </Button>
          <Button
            size="sm"
            onClick={() => handleUseTemplate(template)}
            className="flex-1"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Use
          </Button>
        </div>
        {template.clone_count > 0 && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Used {template.clone_count} times
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Template Gallery
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="promotional">Promotional</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                  <SelectItem value="transactional">Transactional</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="reengagement">Re-engagement</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                </SelectContent>
              </Select>
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="gallery" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="gallery">Public Gallery</TabsTrigger>
                <TabsTrigger value="my-templates">My Templates</TabsTrigger>
              </TabsList>

              <TabsContent value="gallery" className="mt-4">
                {isLoading ? (
                  <div className="text-center py-12">Loading templates...</div>
                ) : templates && templates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map(renderTemplateCard)}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No templates found matching your criteria
                  </div>
                )}
              </TabsContent>

              <TabsContent value="my-templates" className="mt-4">
                {myTemplates && myTemplates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myTemplates.map(renderTemplateCard)}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    You haven't created any templates yet
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{previewTemplate.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {previewTemplate.content_email && (
                <div>
                  <h3 className="font-semibold mb-2">Email Preview</h3>
                  <div className="border rounded p-4 bg-white">
                    <iframe
                      srcDoc={previewTemplate.content_email}
                      className="w-full h-96 border-0"
                      title="Email Preview"
                    />
                  </div>
                </div>
              )}
              {previewTemplate.content_whatsapp && (
                <div>
                  <h3 className="font-semibold mb-2">WhatsApp Preview</h3>
                  <div className="border rounded p-4 bg-green-50 whitespace-pre-wrap">
                    {previewTemplate.content_whatsapp}
                  </div>
                </div>
              )}
              {previewTemplate.content_sms && (
                <div>
                  <h3 className="font-semibold mb-2">SMS Preview</h3>
                  <div className="border rounded p-4 bg-blue-50 whitespace-pre-wrap">
                    {previewTemplate.content_sms}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
