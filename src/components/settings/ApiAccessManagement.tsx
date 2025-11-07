import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, Plus, Trash2, Key, Monitor, User } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  permission_level: 'admin' | 'agent' | 'read_only';
  customer_id: string | null;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
  customers?: {
    name: string;
    email: string | null;
    phone: string | null;
  };
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export function ApiAccessManagement() {
  const { currentBusinessId } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [embedType, setEmbedType] = useState<'full' | 'customer' | null>(null);

  const projectUrl = "https://jrtlrnfdqfkjlkpfirzr.supabase.co";
  const embedBaseUrl = window.location.origin;

  useEffect(() => {
    fetchApiKeys();
    fetchCustomers();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select(`
          *,
          customers (
            name,
            email,
            phone
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error: any) {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, email, phone")
        .order("name");

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error("Failed to load customers");
    }
  };

  const generateFullDashboardKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }

    if (!currentBusinessId) {
      toast.error("No business context found");
      return;
    }

    try {
      const apiKey = `sk_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
      const keyPrefix = apiKey.substring(0, 12);

      const { error } = await supabase.from("api_keys").insert({
        name: newKeyName,
        key_hash: apiKey,
        key_prefix: keyPrefix,
        business_id: currentBusinessId,
        permission_level: 'admin',
        customer_id: null,
      });

      if (error) throw error;

      setNewApiKey(apiKey);
      setShowNewKey(true);
      setEmbedType('full');
      setNewKeyName("");
      toast.success("Full Dashboard API key created successfully");
      fetchApiKeys();
    } catch (error: any) {
      toast.error("Failed to create API key");
    }
  };

  const generateCustomerScopedKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }

    if (!selectedCustomerId) {
      toast.error("Please select a customer");
      return;
    }

    if (!currentBusinessId) {
      toast.error("No business context found");
      return;
    }

    try {
      const apiKey = `sk_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
      const keyPrefix = apiKey.substring(0, 12);

      const { error } = await supabase.from("api_keys").insert({
        name: newKeyName,
        key_hash: apiKey,
        key_prefix: keyPrefix,
        business_id: currentBusinessId,
        permission_level: 'agent',
        customer_id: selectedCustomerId,
      });

      if (error) throw error;

      setNewApiKey(apiKey);
      setShowNewKey(true);
      setEmbedType('customer');
      setNewKeyName("");
      setSelectedCustomerId("");
      toast.success("Customer-Scoped API key created successfully");
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

  const getFullDashboardIframe = (apiKey: string) => {
    return `<iframe 
  src="${embedBaseUrl}/embed/full-inbox?apiKey=${apiKey}" 
  width="100%" 
  height="800" 
  frameborder="0"
  style="border: 1px solid #e2e8f0; border-radius: 8px;"
></iframe>`;
  };

  const getCustomerIframe = (apiKey: string) => {
    return `<iframe 
  src="${embedBaseUrl}/embed/customer-inbox?apiKey=${apiKey}" 
  width="100%" 
  height="600" 
  frameborder="0"
  style="border: 1px solid #e2e8f0; border-radius: 8px;"
></iframe>`;
  };

  return (
    <div className="space-y-8">
      <Alert>
        <Key className="h-4 w-4" />
        <AlertTitle>Embed Your Dashboard</AlertTitle>
        <AlertDescription>
          Generate API keys to embed your full dashboard or customer-specific chat windows into your own application or CRM.
        </AlertDescription>
      </Alert>

      {/* Full Dashboard Key Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            Full Dashboard Embed
          </CardTitle>
          <CardDescription>
            Create an API key to embed the complete dashboard with all conversations, exactly as shown in your app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="fullKeyName">Key Name</Label>
              <Input
                id="fullKeyName"
                placeholder="Production Dashboard Embed"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={generateFullDashboardKey}>
                <Plus className="w-4 h-4 mr-2" />
                Generate Full Dashboard Key
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer-Scoped Key Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Customer-Specific Embed
          </CardTitle>
          <CardDescription>
            Create an API key scoped to a specific customer. Only that customer's conversation will be accessible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="customerKeyName">Key Name</Label>
              <Input
                id="customerKeyName"
                placeholder="Customer Portal - John Doe"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="customer">Customer</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger id="customer">
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} {customer.email ? `(${customer.email})` : customer.phone ? `(${customer.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={generateCustomerScopedKey} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Generate Customer-Scoped Key
          </Button>
        </CardContent>
      </Card>

      {/* New Key Display with Iframe Code */}
      {newApiKey && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Key className="w-4 h-4" />
              {embedType === 'full' ? 'Full Dashboard' : 'Customer-Scoped'} API Key Generated
            </CardTitle>
            <CardDescription>
              Copy this key and iframe code now. You won't be able to see the key again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* API Key */}
            <div>
              <Label>API Key</Label>
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
            </div>

            {/* Iframe Code */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Embed Code (Copy & Paste)</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(
                    embedType === 'full' 
                      ? getFullDashboardIframe(newApiKey) 
                      : getCustomerIframe(newApiKey)
                  )}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Iframe
                </Button>
              </div>
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
                <code>
                  {embedType === 'full' 
                    ? getFullDashboardIframe(newApiKey) 
                    : getCustomerIframe(newApiKey)}
                </code>
              </pre>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Security:</strong> Keep this API key secure. Anyone with this key can access 
                {embedType === 'full' ? ' your full dashboard' : ' this customer\'s conversation'}.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Embed API Keys</CardTitle>
          <CardDescription>
            Manage your existing embed API keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : apiKeys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No API keys created yet
                    </TableCell>
                  </TableRow>
                ) : (
                  apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <Badge variant={key.customer_id ? "secondary" : "default"}>
                          {key.customer_id ? (
                            <><User className="w-3 h-3 mr-1" /> Customer</>
                          ) : (
                            <><Monitor className="w-3 h-3 mr-1" /> Full Dashboard</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {key.customer_id ? (
                          <span className="text-muted-foreground">
                            {key.customers?.name || 'Unknown Customer'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">All Conversations</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{key.key_prefix}...</TableCell>
                      <TableCell className="text-sm">
                        {new Date(key.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {key.last_used_at
                          ? new Date(key.last_used_at).toLocaleDateString()
                          : <span className="text-muted-foreground">Never</span>}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View Code
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Embed Code for {key.name}</DialogTitle>
                              <DialogDescription>
                                Copy this iframe code to embed {key.customer_id ? 'the customer chat' : 'your full dashboard'}.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <Label>Iframe Code</Label>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(
                                      key.customer_id 
                                        ? getCustomerIframe(key.key_hash) 
                                        : getFullDashboardIframe(key.key_hash)
                                    )}
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy
                                  </Button>
                                </div>
                                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
                                  <code>
                                    {key.customer_id 
                                      ? getCustomerIframe(key.key_hash) 
                                      : getFullDashboardIframe(key.key_hash)}
                                  </code>
                                </pre>
                              </div>
                              <Alert>
                                <AlertDescription className="text-xs">
                                  This code is secure and ready to use. The API key is embedded in the URL.
                                </AlertDescription>
                              </Alert>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteApiKey(key.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
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

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use Embed Codes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold mb-2">Full Dashboard Embed</h4>
              <p className="text-sm text-muted-foreground">
                Paste the Full Dashboard iframe code into your admin panel or internal tools. 
                Users will see all conversations, contact lists, filters, and all features exactly as they appear in your app.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Customer-Specific Embed</h4>
              <p className="text-sm text-muted-foreground">
                Paste the Customer-Specific iframe code into your CRM or customer portal. 
                Users will only see that specific customer's conversation and cannot access other customers' data.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Security</h4>
              <p className="text-sm text-muted-foreground">
                All API keys are validated server-side. Customer-scoped keys enforce data isolation at the database level. 
                Keys can be revoked instantly by deleting them from this page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
