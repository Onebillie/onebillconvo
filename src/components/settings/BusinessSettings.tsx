import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, Bell, Webhook, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useDraft } from "@/hooks/useDraft";
import { useAuth } from "@/contexts/AuthContext";
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard";

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
  email_signature?: string;
  message_webhook_url?: string;
  message_webhook_enabled?: boolean;
  message_webhook_secret?: string;
}

export const BusinessSettings = () => {
  const [loading, setLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showSecret, setShowSecret] = useState(false);
  const { permission, subscribeToPush, unsubscribeFromPush } = usePushNotifications();
  const { currentBusinessId } = useAuth();
  const initialFormData: BusinessInfo = {
    id: "",
    company_name: "",
    company_logo: "",
    whatsapp_status: "",
    whatsapp_about: "",
    support_email: "",
    from_email: "",
    reply_to_email: "",
    email_subject_template: "",
    email_signature: "",
    message_webhook_url: "",
    message_webhook_enabled: false,
    message_webhook_secret: "",
  };
  const [formData, setFormData, clearDraft] = useDraft<BusinessInfo>(
    "settings:business",
    initialFormData
  );
  const [initialData, setInitialData] = useState<BusinessInfo | null>(null);

  const hasUnsavedChanges = initialData 
    ? JSON.stringify(formData) !== JSON.stringify(initialData)
    : false;

  const mounts = useRef(0);
  useEffect(() => {
    mounts.current += 1;
    console.debug('BusinessSettings mounts:', mounts.current);
  }, []);

  useEffect(() => {
    fetchBusinessSettings();

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const fetchBusinessSettings = async () => {
    if (!currentBusinessId) {
      console.warn("No business ID available");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("business_settings")
        .select("*")
        .eq("business_id", currentBusinessId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching business settings:", error);
        toast({
          title: "Error",
          description: "Failed to load business settings",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setFormData((prev) => ({ ...prev, ...data }));
        setInitialData(data);
      } else {
        // No settings exist for this business yet - create default record
        const { data: insertData, error: insertError } = await supabase
          .from("business_settings")
          .insert({
            business_id: currentBusinessId,
            company_name: "",
            whatsapp_status: "Available 24/7",
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating default settings:", insertError);
        } else if (insertData) {
          setFormData((prev) => ({ ...prev, ...insertData }));
          setInitialData(insertData);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      toast({
        title: "Already installed",
        description: "App is already installed or install prompt not available",
      });
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast({ title: "Success", description: "App installed successfully" });
    }
    setDeferredPrompt(null);
  };

  const handleNotifications = async () => {
    if (permission === 'granted') {
      await unsubscribeFromPush();
      toast({ title: "Notifications disabled" });
    } else {
      await subscribeToPush();
    }
  };

  const generateSecret = () => {
    const secret = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
    setFormData({ ...formData, message_webhook_secret: secret });
    toast({ title: "Secret generated", description: "Remember to save settings" });
  };

  const testWebhook = async () => {
    if (!formData.message_webhook_url) {
      toast({
        title: "Error",
        description: "Please enter a webhook URL first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const testPayload = {
        event: 'message.received',
        timestamp: new Date().toISOString(),
        business_id: currentBusinessId,
        data: {
          message: {
            id: 'test-message-id',
            content: 'This is a test message',
            platform: 'test',
            direction: 'inbound',
            created_at: new Date().toISOString()
          },
          customer: {
            id: 'test-customer-id',
            name: 'Test Customer',
            email: 'test@example.com'
          },
          attachments: []
        }
      };

      const response = await fetch(formData.message_webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        toast({ title: "Success", description: "Test webhook sent successfully" });
      } else {
        toast({
          title: "Warning",
          description: `Webhook returned ${response.status}`,
          variant: "destructive",
        });
      }
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentBusinessId) {
      toast({
        title: "Error",
        description: "No business selected",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("business_settings")
        .upsert({
          business_id: currentBusinessId,
          company_name: formData.company_name,
          company_logo: formData.company_logo,
          whatsapp_status: formData.whatsapp_status,
          whatsapp_about: formData.whatsapp_about,
          support_email: formData.support_email,
          from_email: formData.from_email,
          reply_to_email: formData.reply_to_email,
          email_subject_template: formData.email_subject_template,
          email_signature: formData.email_signature,
          message_webhook_url: formData.message_webhook_url,
          message_webhook_enabled: formData.message_webhook_enabled,
          message_webhook_secret: formData.message_webhook_secret,
        }, {
          onConflict: "business_id"
        });

      if (error) throw error;

      clearDraft();
      setInitialData(formData);
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
    <>
      <UnsavedChangesGuard hasUnsavedChanges={hasUnsavedChanges} />
      <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Mobile App Features</CardTitle>
          <CardDescription>Install as app and enable notifications</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={handleInstallPWA} variant="outline" disabled={!deferredPrompt}>
            <Download className="mr-2 h-4 w-4" />
            Add to Home Screen
          </Button>
          <Button onClick={handleNotifications} variant="outline">
            <Bell className="mr-2 h-4 w-4" />
            {permission === 'granted' ? 'Disable' : 'Activate'} Notifications
          </Button>
        </CardContent>
      </Card>

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
            <Label>Email Signature</Label>
            <Textarea
              value={formData.email_signature || ""}
              onChange={(e) => setFormData({ ...formData, email_signature: e.target.value })}
              placeholder="Best regards,&#10;Your Company Team&#10;support@example.com"
              rows={4}
            />
            <p className="text-sm text-muted-foreground">
              This signature will be added to all outgoing emails
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            CRM Integration
          </CardTitle>
          <CardDescription>
            Forward all incoming messages and attachments to your CRM system in real-time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook Endpoint URL</Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://your-crm.com/webhooks/messages"
              value={formData.message_webhook_url || ""}
              onChange={(e) => setFormData({ ...formData, message_webhook_url: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">
              All inbound messages will be sent to this endpoint with attachments and customer data
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="webhook-enabled">Enable Real-time Message Forwarding</Label>
              <p className="text-sm text-muted-foreground">
                Automatically send new messages to your webhook endpoint
              </p>
            </div>
            <Switch
              id="webhook-enabled"
              checked={formData.message_webhook_enabled || false}
              onCheckedChange={(checked) => setFormData({ ...formData, message_webhook_enabled: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-secret">Webhook Secret (for signature verification)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="webhook-secret"
                  type={showSecret ? "text" : "password"}
                  value={formData.message_webhook_secret || ""}
                  readOnly
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button type="button" onClick={generateSecret} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Used to sign webhook payloads with HMAC-SHA256 for verification
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="button" onClick={testWebhook} variant="outline" disabled={loading || !formData.message_webhook_url}>
              Test Webhook
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Webhook Settings"}
            </Button>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">Integration Endpoints:</p>
            <code className="text-xs block">POST /api-customers-sync - Create/update customers</code>
            <code className="text-xs block">Webhook: message.received - New messages with attachments</code>
            <p className="text-xs text-muted-foreground mt-2">
              See CRM_INTEGRATION_GUIDE.md for complete documentation
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
};
