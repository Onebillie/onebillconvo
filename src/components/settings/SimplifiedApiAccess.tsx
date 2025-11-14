import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, EyeOff, Key, RotateCw, Trash2, Send } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export const SimplifiedApiAccess = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showKey, setShowKey] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["new_message", "new_inmail"]);

  // Fetch API key
  const { data: apiKey, isLoading: loadingKey } = useQuery({
    queryKey: ["api-key"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: businessUsers } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

      if (!businessUsers) throw new Error("No business found");

      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("business_id", businessUsers.business_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch webhook settings
  const { data: webhookSettings } = useQuery({
    queryKey: ["webhook-settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: businessUsers } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

      if (!businessUsers) throw new Error("No business found");

      const { data, error } = await supabase
        .from("business_settings")
        .select("notification_webhook_url, notification_webhook_enabled, notification_webhook_secret, notification_events")
        .eq("business_id", businessUsers.business_id)
        .single();

      if (error) throw error;
      
      if (data) {
        setWebhookUrl(data.notification_webhook_url || "");
        setWebhookEnabled(data.notification_webhook_enabled || false);
        setWebhookSecret(data.notification_webhook_secret || "");
        setSelectedEvents(data.notification_events as string[] || ["new_message", "new_inmail"]);
      }
      
      return data;
    },
  });

  // Generate API key mutation
  const generateKeyMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: businessUsers } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

      if (!businessUsers) throw new Error("No business found");

      const keyHash = `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

      // Call edge function to create API key since RLS might block direct insert
      const response = await fetch(
        `https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-settings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": keyHash, // Use the new key as its own auth for creation
          },
          body: JSON.stringify({
            action: "create_key",
            business_id: businessUsers.business_id,
            key_hash: keyHash,
            permission_level: "admin",
          }),
        }
      );

      if (!response.ok) {
        // Fallback: try direct insert (will work if RLS allows)
        const { data, error } = await supabase
          .from("api_keys")
          .insert([{
            name: "Universal API Key",
            key_hash: keyHash,
            key_prefix: keyHash.substring(0, 12),
            permission_level: "admin",
            is_active: true,
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      return { key_hash: keyHash, created_at: new Date().toISOString() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-key"] });
      toast({ title: "API key generated successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to generate API key", description: error.message, variant: "destructive" });
    },
  });

  // Update webhook settings mutation
  const updateWebhookMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: businessUsers } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

      if (!businessUsers) throw new Error("No business found");

      const { error } = await supabase
        .from("business_settings")
        .update({
          notification_webhook_url: webhookUrl,
          notification_webhook_enabled: webhookEnabled,
          notification_webhook_secret: webhookSecret,
          notification_events: selectedEvents,
        })
        .eq("business_id", businessUsers.business_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-settings"] });
      toast({ title: "Webhook settings updated" });
    },
    onError: (error) => {
      toast({ title: "Failed to update webhook settings", description: error.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const baseUrl = window.location.origin;

  return (
    <div className="space-y-6">
      {/* Section A: API Key Management */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">API Key</h3>
          </div>

          {loadingKey ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : apiKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono">
                  {showKey ? apiKey.key_hash : `${apiKey.key_hash.substring(0, 12)}...`}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(apiKey.key_hash)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Created: {new Date(apiKey.created_at).toLocaleDateString()}
                {apiKey.last_used_at && ` • Last used: ${new Date(apiKey.last_used_at).toLocaleDateString()}`}
              </div>
            </div>
          ) : (
            <Button onClick={() => generateKeyMutation.mutate()} disabled={generateKeyMutation.isPending}>
              <Key className="h-4 w-4 mr-2" />
              Generate API Key
            </Button>
          )}

          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              ⚠️ Keep this key secure. It provides access to your business data.
            </p>
          </div>
        </div>
      </Card>

      {/* Section B: Embed Codes */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">&lt;/&gt;</span>
            <h3 className="text-lg font-semibold">Embed Codes for Developers</h3>
          </div>

          <Tabs defaultValue="customer" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="customer">Customer Profile</TabsTrigger>
              <TabsTrigger value="dashboard">Full Dashboard</TabsTrigger>
              <TabsTrigger value="inmail">InMail</TabsTrigger>
            </TabsList>

            <TabsContent value="customer" className="space-y-3 mt-4">
              <div className="space-y-2">
                <h4 className="font-medium">Customer Profile Embed (for CRM)</h4>
                <p className="text-sm text-muted-foreground">
                  Embed in your CRM customer profiles to show conversation history
                </p>
              </div>
              <div className="relative">
                <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`<iframe 
  src="${baseUrl}/embed/customer/{CUSTOMER_ID}?apiKey=${apiKey?.key_hash || 'YOUR_API_KEY'}"
  width="100%"
  height="800px"
  frameborder="0"
></iframe>`}
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(`<iframe src="${baseUrl}/embed/customer/{CUSTOMER_ID}?apiKey=${apiKey?.key_hash || 'YOUR_API_KEY'}" width="100%" height="800px" frameborder="0"></iframe>`)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Replace <code className="px-1 py-0.5 bg-muted rounded">{"{CUSTOMER_ID}"}</code> with the customer's phone number (with country code, e.g., 353871234567) or email address
              </p>
            </TabsContent>

            <TabsContent value="dashboard" className="space-y-3 mt-4">
              <div className="space-y-2">
                <h4 className="font-medium">Full Dashboard Embed (for Admin Panel)</h4>
                <p className="text-sm text-muted-foreground">
                  Embed complete dashboard in your admin panel
                </p>
              </div>
              <div className="relative">
                <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`<iframe 
  src="${baseUrl}/embed/inbox?apiKey=${apiKey?.key_hash || 'YOUR_API_KEY'}"
  width="100%"
  height="800px"
  frameborder="0"
></iframe>`}
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(`<iframe src="${baseUrl}/embed/inbox?apiKey=${apiKey?.key_hash || 'YOUR_API_KEY'}" width="100%" height="800px" frameborder="0"></iframe>`)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Shows all conversations, filters, and features exactly as in the main app
              </p>
            </TabsContent>

            <TabsContent value="inmail" className="space-y-3 mt-4">
              <div className="space-y-2">
                <h4 className="font-medium">Staff InMail Embed</h4>
                <p className="text-sm text-muted-foreground">
                  Embed staff inbox for internal messages and tasks
                </p>
              </div>
              <div className="relative">
                <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`<iframe 
  src="${baseUrl}/embed/inmail?apiKey=${apiKey?.key_hash || 'YOUR_API_KEY'}"
  width="100%"
  height="600px"
  frameborder="0"
></iframe>`}
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(`<iframe src="${baseUrl}/embed/inmail?apiKey=${apiKey?.key_hash || 'YOUR_API_KEY'}" width="100%" height="600px" frameborder="0"></iframe>`)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Staff must log in to see their assigned messages and tasks
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </Card>

      {/* Section C: Notification Webhooks */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔔</span>
            <h3 className="text-lg font-semibold">Notification Webhooks</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Your Webhook URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://your-app.com/api/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="webhook-enabled">Enable Notifications</Label>
              <Switch
                id="webhook-enabled"
                checked={webhookEnabled}
                onCheckedChange={setWebhookEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-secret">Webhook Secret (Optional)</Label>
              <Input
                id="webhook-secret"
                type="password"
                placeholder="For signature verification"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Webhook Events</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="event-message"
                    checked={selectedEvents.includes("new_message")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedEvents([...selectedEvents, "new_message"]);
                      } else {
                        setSelectedEvents(selectedEvents.filter(e => e !== "new_message"));
                      }
                    }}
                  />
                  <label htmlFor="event-message" className="text-sm">New Message Received</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="event-inmail"
                    checked={selectedEvents.includes("new_inmail")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedEvents([...selectedEvents, "new_inmail"]);
                      } else {
                        setSelectedEvents(selectedEvents.filter(e => e !== "new_inmail"));
                      }
                    }}
                  />
                  <label htmlFor="event-inmail" className="text-sm">New InMail Received</label>
                </div>
              </div>
            </div>

            <Button onClick={() => updateWebhookMutation.mutate()} disabled={updateWebhookMutation.isPending}>
              Save Webhook Settings
            </Button>
          </div>

          {/* Developer Integration Guide */}
          <div className="mt-6 space-y-4 border-t pt-4">
            <h4 className="font-medium">Developer Integration Guide</h4>
            
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Webhook Payload Format</h5>
              <pre className="p-3 bg-muted rounded-md text-xs overflow-x-auto">
{`{
  "event": "new_message" | "new_inmail",
  "has_notification": 1,
  "timestamp": "2025-11-14T10:30:00Z",
  "data": {
    "id": "msg_123",
    "customer_name": "John Doe",
    "preview": "First 50 chars...",
    "link": "https://yourapp.com/dashboard?conversation=123"
  }
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <h5 className="text-sm font-medium">Simple 1/0 Logic</h5>
              <pre className="p-3 bg-muted rounded-md text-xs overflow-x-auto">
{`// Your notification handler
function handleWebhook(payload) {
  if (payload.has_notification === 1) {
    // Show notification badge
    showNotificationBadge();
    
    // Optional: Show popup
    alert(\`New \${payload.event}: \${payload.data.preview}\`);
    
    // Open link when user clicks
    window.open(payload.data.link, '_blank');
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
