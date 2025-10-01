import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BusinessInfo {
  id: string;
  company_name?: string;
  company_logo?: string;
  whatsapp_status?: string;
  whatsapp_about?: string;
  support_email?: string;
  from_email?: string;
  reply_to_email?: string;
  email_subject_template?: string;
}

export const BusinessSettings = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BusinessInfo>({
    id: "",
    company_name: "",
    company_logo: "",
    whatsapp_status: "",
    whatsapp_about: "",
    support_email: "",
    from_email: "",
    reply_to_email: "",
    email_subject_template: "",
  });

  useEffect(() => {
    fetchBusinessSettings();
  }, []);

  const fetchBusinessSettings = async () => {
    const { data, error } = await supabase
      .from("business_settings")
      .select("*")
      .single();

    if (error) {
      console.error("Error fetching business settings:", error);
      return;
    }

    if (data) {
      setFormData(data);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("business_settings")
        .update({
          company_name: formData.company_name,
          company_logo: formData.company_logo,
          whatsapp_status: formData.whatsapp_status,
          whatsapp_about: formData.whatsapp_about,
          support_email: formData.support_email,
          from_email: formData.from_email,
          reply_to_email: formData.reply_to_email,
          email_subject_template: formData.email_subject_template,
        })
        .eq("id", formData.id);

      if (error) throw error;

      toast({ title: "Success", description: "Business settings updated successfully" });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Settings</CardTitle>
        <CardDescription>Manage your business information and WhatsApp settings</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input
              value={formData.company_name || ""}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="Your Company Name"
            />
          </div>

          <div className="space-y-2">
            <Label>Company Logo URL</Label>
            <Input
              value={formData.company_logo || ""}
              onChange={(e) => setFormData({ ...formData, company_logo: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div className="space-y-2">
            <Label>Support Email (for Resend verification)</Label>
            <Input
              type="email"
              value={formData.support_email || ""}
              onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
              placeholder="support@yourcompany.com"
            />
            <p className="text-sm text-muted-foreground">
              Verify this domain at resend.com/domains
            </p>
          </div>

          <div className="space-y-2">
            <Label>From Email</Label>
            <Input
              type="email"
              value={formData.from_email || ""}
              onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
              placeholder="noreply@yourcompany.com"
            />
            <p className="text-sm text-muted-foreground">
              Email address shown in the "From" field
            </p>
          </div>

          <div className="space-y-2">
            <Label>Reply-To Email</Label>
            <Input
              type="email"
              value={formData.reply_to_email || ""}
              onChange={(e) => setFormData({ ...formData, reply_to_email: e.target.value })}
              placeholder="support@yourcompany.com"
            />
            <p className="text-sm text-muted-foreground">
              Email address where customer replies will be sent
            </p>
          </div>

          <div className="space-y-2">
            <Label>Email Subject Template</Label>
            <Input
              value={formData.email_subject_template || ""}
              onChange={(e) => setFormData({ ...formData, email_subject_template: e.target.value })}
              placeholder="Message from {{company_name}}"
            />
            <p className="text-sm text-muted-foreground">
              Use {'{{company_name}}'} as placeholder
            </p>
          </div>

          <div className="space-y-2">
            <Label>WhatsApp Status</Label>
            <Input
              value={formData.whatsapp_status || ""}
              onChange={(e) => setFormData({ ...formData, whatsapp_status: e.target.value })}
              placeholder="Available 24/7"
            />
          </div>

          <div className="space-y-2">
            <Label>WhatsApp About</Label>
            <Textarea
              value={formData.whatsapp_about || ""}
              onChange={(e) => setFormData({ ...formData, whatsapp_about: e.target.value })}
              placeholder="Describe your business..."
              rows={4}
            />
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
