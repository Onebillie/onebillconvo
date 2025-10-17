import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, Plus, Trash2, Key } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

export function ApiAccessManagement() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error: any) {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }

    try {
      const apiKey = `sk_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
      const keyPrefix = apiKey.substring(0, 12);

      const { error } = await supabase.from("api_keys").insert({
        name: newKeyName,
        key_hash: apiKey,
        key_prefix: keyPrefix,
      });

      if (error) throw error;

      setNewApiKey(apiKey);
      setShowNewKey(true);
      setNewKeyName("");
      toast.success("API key created successfully");
      fetchApiKeys();
    } catch (error: any) {
      toast.error("Failed to create API key");
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
      toast.success("API key deleted");
      fetchApiKeys();
    } catch (error: any) {
      toast.error("Failed to delete API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const projectUrl = "https://jrtlrnfdqfkjlkpfirzr.supabase.co";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Access Management</CardTitle>
          <CardDescription>
            Manage API keys for external integrations and CRM access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="keyName">Key Name</Label>
              <Input
                id="keyName"
                placeholder="Production CRM"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={generateApiKey}>
                <Plus className="w-4 h-4 mr-2" />
                Generate Key
              </Button>
            </div>
          </div>

          {newApiKey && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  New API Key Generated
                </CardTitle>
                <CardDescription>
                  Copy this key now. You won't be able to see it again.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    type={showNewKey ? "text" : "password"}
                    value={newApiKey}
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowNewKey(!showNewKey)}
                  >
                    {showNewKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(newApiKey)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : apiKeys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No API keys created yet
                    </TableCell>
                  </TableRow>
                ) : (
                  apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell className="font-mono text-sm">{key.key_prefix}...</TableCell>
                      <TableCell>
                        <Badge variant={key.is_active ? "default" : "secondary"}>
                          {key.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(key.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {key.last_used_at
                          ? new Date(key.last_used_at).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteApiKey(key.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>Use these endpoints to integrate with your CRM</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Authentication</h4>
            <p className="text-sm text-muted-foreground">
              Include your API key in the <code className="bg-muted px-1 py-0.5 rounded">x-api-key</code> header
            </p>
          </div>

          <div className="space-y-4">
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Get Conversations</h4>
                <Badge>GET</Badge>
              </div>
              <code className="text-sm block bg-muted p-2 rounded">
                {projectUrl}/functions/v1/api-conversations
              </code>
              <p className="text-sm text-muted-foreground">
                Add <code>?id=conversation_id</code> to get a specific conversation
              </p>
            </div>

            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Get Customers</h4>
                <Badge>GET</Badge>
              </div>
              <code className="text-sm block bg-muted p-2 rounded">
                {projectUrl}/functions/v1/api-customers
              </code>
              <p className="text-sm text-muted-foreground">
                Query params: <code>?id=customer_id</code>, <code>?email=email</code>, or <code>?phone=phone</code>
              </p>
            </div>

            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Send Message</h4>
                <Badge variant="secondary">POST</Badge>
              </div>
              <code className="text-sm block bg-muted p-2 rounded">
                {projectUrl}/functions/v1/api-send-message
              </code>
              <pre className="text-sm bg-muted p-2 rounded mt-2">
{`{
  "customerId": "uuid",
  "channel": "whatsapp|email",
  "content": "message text",
  "subject": "email subject"
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SSO Integration (Embed)</CardTitle>
          <CardDescription>
            Embed conversations directly into your CRM or application with secure Single Sign-On
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Generate SSO Token</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a secure token to embed individual customer conversations or a full inbox view.
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <code className="text-sm">
                POST {projectUrl}/functions/v1/api-sso-generate-token<br/>
                Headers: x-api-key: YOUR_API_KEY<br/>
                Body: {`{`}<br/>
                &nbsp;&nbsp;"customer_id": "uuid",  // Required for conversation scope<br/>
                &nbsp;&nbsp;"scope": "conversation",  // or "inbox"<br/>
                &nbsp;&nbsp;"expires_in_minutes": 60  // Optional, default 60<br/>
                {`}`}
              </code>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Response</h3>
            <div className="bg-muted p-4 rounded-lg">
              <code className="text-sm">
                {`{`}<br/>
                &nbsp;&nbsp;"token": "uuid-uuid",<br/>
                &nbsp;&nbsp;"embed_url": "{window.location.origin}/embed/conversation?token=...",<br/>
                &nbsp;&nbsp;"expires_at": "2025-01-01T12:00:00Z",<br/>
                &nbsp;&nbsp;"scope": "conversation"<br/>
                {`}`}
              </code>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Embedding Options</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li><strong>Customer View:</strong> Use scope="conversation" to embed a specific customer's chat</li>
              <li><strong>Inbox View:</strong> Use scope="inbox" to embed the full conversation list and chat interface</li>
              <li>Tokens expire after the specified duration (default 60 minutes)</li>
              <li>Each token is tied to your business and validates access automatically</li>
            </ul>
          </div>

          <div>
            <Label>Example iFrame Embed</Label>
            <div className="relative mt-2">
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
{`<iframe
  src="${window.location.origin}/embed/conversation?token=YOUR_SSO_TOKEN"
  width="100%"
  height="600"
  frameborder="0"
  style="border: 1px solid #e2e8f0; border-radius: 8px;"
></iframe>`}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(`<iframe src="${window.location.origin}/embed/conversation?token=YOUR_SSO_TOKEN" width="100%" height="600" frameborder="0" style="border: 1px solid #e2e8f0; border-radius: 8px;"></iframe>`)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
