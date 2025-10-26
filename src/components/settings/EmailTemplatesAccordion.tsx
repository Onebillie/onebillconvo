import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Sparkles, BookOpen, Plus } from "lucide-react";
import { MarketingTemplateBuilder } from "@/components/marketing/MarketingTemplateBuilder";
import { TemplateGallery } from "@/components/marketing/TemplateGallery";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function EmailTemplatesAccordion() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["template-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { templates: 0, campaigns: 0 };

      const { data: businessUser } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

      if (!businessUser) return { templates: 0, campaigns: 0 };

      const { count: templateCount } = await supabase
        .from("marketing_templates")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessUser.business_id);

      const { count: campaignCount } = await supabase
        .from("marketing_campaigns")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessUser.business_id);

      return {
        templates: templateCount || 0,
        campaigns: campaignCount || 0,
      };
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email & Marketing Templates
              </CardTitle>
              <CardDescription>
                Create professional templates for your marketing campaigns
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowGallery(true)}>
                <BookOpen className="w-4 h-4 mr-2" />
                Browse Templates
              </Button>
              <Button onClick={() => setShowBuilder(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">{stats?.templates || 0}</div>
              <div className="text-sm text-muted-foreground">Templates Created</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">{stats?.campaigns || 0}</div>
              <div className="text-sm text-muted-foreground">Campaigns Sent</div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold">Professional Templates</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose from 20+ pre-built templates or create your own custom designs.
                  Templates include merge tags, responsive layouts, and multi-channel support.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <MarketingTemplateBuilder
        open={showBuilder}
        onClose={() => setShowBuilder(false)}
        onSave={() => {
          setShowBuilder(false);
        }}
      />

      <TemplateGallery
        open={showGallery}
        onClose={() => setShowGallery(false)}
      />
    </>
  );
}
