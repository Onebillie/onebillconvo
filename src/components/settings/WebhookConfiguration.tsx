import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Webhook, Save, TestTube, Copy, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export function WebhookConfiguration() {
  const { currentBusinessId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const [customerWebhookUrl, setCustomerWebhookUrl] = useState("");
  const [customerWebhookEnabled, setCustomerWebhookEnabled] = useState(false);
  const [customerWebhookSecret, setCustomerWebhookSecret] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchWebhookSettings();
  }, [currentBusinessId]);

  const fetchWebhookSettings = async () => {
    if (!currentBusinessId) return;

    try {
      const { data, error } = await supabase
        .from("business_settings")
        .select("customer_webhook_url, customer_webhook_enabled, customer_webhook_secret")
        .eq("business_id", currentBusinessId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setCustomerWebhookUrl(data.customer_webhook_url || "");
        setCustomerWebhookEnabled(data.customer_webhook_enabled || false);
        setCustomerWebhookSecret(data.customer_webhook_secret || "");
      }
    } catch (error: any) {
      toast.error("Failed to load webhook settings");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const saveWebhookSettings = async () => {
    if (!currentBusinessId) {
      toast.error("No business context found");
      return;
    }

    if (customerWebhookEnabled && !customerWebhookUrl) {
      toast.error("Webhook URL is required when enabled");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("business_settings")
        .update({
          customer_webhook_url: customerWebhookUrl,
          customer_webhook_enabled: customerWebhookEnabled,
          customer_webhook_secret: customerWebhookSecret || null,
        })
        .eq("business_id", currentBusinessId);

      if (error) throw error;

      toast.success("Webhook settings saved successfully");
    } catch (error: any) {
      toast.error("Failed to save webhook settings");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const generateSecret = () => {
    const secret = `whsec_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    setCustomerWebhookSecret(secret);
    toast.success("Secret generated");
  };

  const testWebhook = async () => {
    if (!customerWebhookUrl) {
      toast.error("Please enter a webhook URL");
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Create a test payload
      const testPayload = {
        event: "customer.test",
        timestamp: new Date().toISOString(),
        business_id: currentBusinessId,
        data: {
          customer: {
            id: "test-customer-id",
            name: "Test Customer",
            email: "test@example.com",
            phone: "+353871234567",
            created_at: new Date().toISOString(),
          },
          deduplication_check: {
            email: "test@example.com",
            phone: "+353871234567",
          },
        },
      };

      // Send test webhook
      const response = await fetch(customerWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Timestamp": new Date().toISOString(),
          "User-Agent": "AlacarteChat-Webhook/1.0",
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        setTestResult({
          success: true,
          message: `Webhook responded with ${response.status}. Test successful!`,
        });
        toast.success("Test webhook sent successfully");
      } else {
        setTestResult({
          success: false,
          message: `Webhook responded with ${response.status}. Check your endpoint.`,
        });
        toast.error("Webhook test failed");
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: `Failed to reach webhook URL: ${error.message}`,
      });
      toast.error("Failed to send test webhook");
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const examplePayload = {
    event: "customer.created",
    timestamp: "2025-11-07T12:00:00Z",
    business_id: "your-business-id",
    data: {
      customer: {
        id: "uuid",
        external_id: "CRM-12345",
        name: "John Doe",
        email: "john@example.com",
        phone: "+353871234567",
        first_name: "John",
        last_name: "Doe",
        created_at: "2025-11-07T12:00:00Z",
      },
      conversation: {
        id: "uuid",
        status: "open",
        created_at: "2025-11-07T12:00:00Z",
      },
      deduplication_check: {
        email: "john@example.com",
        phone: "+353871234567",
        external_id: "CRM-12345",
      },
    },
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Webhook className="h-4 w-4" />
        <AlertTitle>Customer Lifecycle Webhooks</AlertTitle>
        <AlertDescription>
          Get notified in real-time when customers are created or updated in À La Carte Chat. 
          Perfect for syncing with external CRMs and preventing duplicate records.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="configuration" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Settings</CardTitle>
              <CardDescription>
                Configure your webhook endpoint to receive customer lifecycle events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="webhook-enabled" className="text-base">
                    Enable Customer Webhooks
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive real-time notifications when customers are created or updated
                  </p>
                </div>
                <Switch
                  id="webhook-enabled"
                  checked={customerWebhookEnabled}
                  onCheckedChange={setCustomerWebhookEnabled}
                />
              </div>

              {/* Webhook URL */}
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  placeholder="https://your-crm.com/webhooks/alacartechat"
                  value={customerWebhookUrl}
                  onChange={(e) => setCustomerWebhookUrl(e.target.value)}
                  disabled={!customerWebhookEnabled}
                />
                <p className="text-xs text-muted-foreground">
                  The endpoint that will receive POST requests with customer data
                </p>
              </div>

              {/* Webhook Secret */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="webhook-secret">Webhook Secret (Optional)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateSecret}
                    disabled={!customerWebhookEnabled}
                  >
                    Generate Secret
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="webhook-secret"
                    type="password"
                    placeholder="whsec_..."
                    value={customerWebhookSecret}
                    onChange={(e) => setCustomerWebhookSecret(e.target.value)}
                    disabled={!customerWebhookEnabled}
                  />
                  {customerWebhookSecret && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(customerWebhookSecret)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Used to verify webhook requests via HMAC-SHA256 signature
                </p>
              </div>

              {/* Test Result */}
              {testResult && (
                <Alert variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{testResult.message}</AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={saveWebhookSettings} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
                <Button
                  variant="outline"
                  onClick={testWebhook}
                  disabled={!customerWebhookUrl || testing}
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  {testing ? "Testing..." : "Test Webhook"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentation">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Events</CardTitle>
              <CardDescription>
                Your webhook endpoint will receive the following events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Events */}
              <div className="space-y-3">
                <div>
                  <Badge>customer.created</Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sent when a new customer is created in À La Carte Chat
                  </p>
                </div>
                <div>
                  <Badge>customer.updated</Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sent when customer information is updated
                  </p>
                </div>
              </div>

              {/* Example Payload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Example Payload</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(examplePayload, null, 2))}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
                  <code>{JSON.stringify(examplePayload, null, 2)}</code>
                </pre>
              </div>

              {/* Signature Verification */}
              <div className="space-y-2">
                <Label>Signature Verification</Label>
                <p className="text-sm text-muted-foreground">
                  Webhooks include an <code className="bg-muted px-1 py-0.5 rounded">X-Webhook-Signature</code> header with an HMAC-SHA256 signature.
                  Verify it by computing: <code className="bg-muted px-1 py-0.5 rounded">HMAC-SHA256(timestamp + payload, secret)</code>
                </p>
              </div>

              {/* Best Practices */}
              <Alert>
                <AlertTitle>Best Practices</AlertTitle>
                <AlertDescription className="space-y-2">
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Respond with 200 OK quickly (within 5 seconds)</li>
                    <li>Process webhook data asynchronously if needed</li>
                    <li>Always verify the signature to prevent spoofing</li>
                    <li>Use the deduplication_check data to match customers</li>
                    <li>Handle retries gracefully (webhooks retry on failure)</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
