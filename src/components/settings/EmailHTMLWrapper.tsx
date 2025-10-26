import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AlertCircle, Code2, Unlock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function EmailHTMLWrapper() {
  const [loading, setLoading] = useState(false);
  const [htmlTemplate, setHtmlTemplate] = useState("");
  const [bundleWindow, setBundleWindow] = useState(2);
  const [settingsId, setSettingsId] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("business_settings")
      .select("id, email_html_template, email_bundle_window_minutes")
      .single();

    if (error) {
      console.error("Error fetching settings:", error);
      return;
    }

    if (data) {
      setSettingsId(data.id);
      setHtmlTemplate(data.email_html_template || "");
      setBundleWindow(data.email_bundle_window_minutes || 2);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("business_settings")
        .update({
          email_html_template: htmlTemplate,
          email_bundle_window_minutes: bundleWindow,
        })
        .eq("id", settingsId);

      if (error) throw error;

      toast.success("Email template settings saved successfully");
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetToDefault = () => {
    setHtmlTemplate(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .email-container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .email-header { background: #f4f4f4; padding: 20px; text-align: center; border-bottom: 3px solid #007bff; }
    .email-content { padding: 30px 20px; background: #ffffff; }
    .email-footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h2>{{company_name}}</h2>
    </div>
    <div class="email-content">
      {{content}}
    </div>
    <div class="email-footer">
      <p>{{signature}}</p>
      <p>This email was sent from {{company_name}}</p>
    </div>
  </div>
</body>
</html>`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="w-5 h-5" />
            Email HTML Template
          </CardTitle>
          <CardDescription>
            Configure the HTML template for outgoing emails. Use dynamic tags to personalize content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Available Dynamic Tags:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><code className="bg-muted px-1 py-0.5 rounded">{"{{content}}"}</code> - The message content from conversation</li>
                    <li><code className="bg-muted px-1 py-0.5 rounded">{"{{company_name}}"}</code> - Your company name from business settings</li>
                    <li><code className="bg-muted px-1 py-0.5 rounded">{"{{signature}}"}</code> - Your email signature from business settings</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="htmlTemplate">HTML Template</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetToDefault}
                >
                  Reset to Default
                </Button>
              </div>
              <Textarea
                id="htmlTemplate"
                value={htmlTemplate}
                onChange={(e) => setHtmlTemplate(e.target.value)}
                rows={20}
                className="font-mono text-xs"
                placeholder="Enter your HTML email template..."
              />
              <p className="text-sm text-muted-foreground">
                Write your complete HTML structure with inline styles. The {"{{content}}"} tag will be replaced with the actual message.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bundleWindow">Message Bundling Window (minutes)</Label>
              <Input
                id="bundleWindow"
                type="number"
                min={1}
                max={10}
                value={bundleWindow}
                onChange={(e) => setBundleWindow(parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                If multiple messages are sent within this time window, they will be bundled into one email to avoid spamming the customer. Recommended: 1-2 minutes.
              </p>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Template Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template Preview</CardTitle>
          <CardDescription>How your email will look to customers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-white">
            <iframe
              srcDoc={htmlTemplate
                .replace(/\{\{company_name\}\}/g, "Your Company")
                .replace(/\{\{content\}\}/g, "<p>This is a sample message from the conversation.</p><p>You can send multiple lines and they will all be included in the email.</p>")
                .replace(/\{\{signature\}\}/g, "Best regards,<br>Support Team")}
              className="w-full h-96 border-0"
              title="Email Preview"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}