import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, Code2, User, Inbox, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const EmbedCodeDisplay = () => {
  const [copiedInbox, setCopiedInbox] = useState(false);
  const [copiedAdmin, setCopiedAdmin] = useState(false);
  const [copiedCustomer, setCopiedCustomer] = useState(false);
  const [customerId, setCustomerId] = useState('CUSTOMER_ID');
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [selectedApiKey, setSelectedApiKey] = useState('');
  const [loading, setLoading] = useState(true);

  const projectUrl = window.location.origin;

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq('is_active', true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
      if (data && data.length > 0) {
        setSelectedApiKey(data[0].key_hash);
      }
    } catch (error: any) {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  const getInboxEmbedCode = () => {
    const apiKey = selectedApiKey || 'YOUR_API_KEY';
    return `<!-- Full Inbox Embed for CRM Integration -->
<iframe 
  id="alacarte-inbox-embed"
  src="${projectUrl}/embed/inbox?apiKey=${apiKey}"
  width="100%" 
  height="600"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
></iframe>`;
  };

  const getAdminDashboardCode = () => {
    const apiKey = selectedApiKey || 'YOUR_API_KEY';
    return `<!-- Full Admin Dashboard Embed -->
<iframe 
  id="alacarte-admin-embed"
  src="${projectUrl}/embed/dashboard?apiKey=${apiKey}"
  width="100%" 
  height="800"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
></iframe>`;
  };

  const getCustomerEmbedCode = () => {
    const apiKey = selectedApiKey || 'YOUR_API_KEY';
    return `<!-- Customer-Specific Conversation Embed -->
<iframe 
  id="alacarte-customer-embed"
  src="${projectUrl}/embed/conversation?apiKey=${apiKey}&customerId=${customerId}"
  width="100%" 
  height="600"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
></iframe>`;
  };

  const handleCopy = async (code: string, type: 'inbox' | 'admin' | 'customer') => {
    try {
      await navigator.clipboard.writeText(code);
      if (type === 'inbox') {
        setCopiedInbox(true);
        setTimeout(() => setCopiedInbox(false), 2000);
      } else if (type === 'admin') {
        setCopiedAdmin(true);
        setTimeout(() => setCopiedAdmin(false), 2000);
      } else {
        setCopiedCustomer(true);
        setTimeout(() => setCopiedCustomer(false), 2000);
      }
      toast.success('Code copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (apiKeys.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No API Keys Found</AlertTitle>
        <AlertDescription>
          You need to create an API key first before you can generate embed code. 
          Please create an API key in the "API Access" section above.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-primary" />
          <CardTitle>Embed Code for CRM Integration</CardTitle>
        </div>
        <CardDescription>
          Embed your inbox or full admin dashboard into third-party CRMs and platforms
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="apiKeySelect">Select API Key</Label>
          <Select value={selectedApiKey} onValueChange={setSelectedApiKey}>
            <SelectTrigger id="apiKeySelect">
              <SelectValue placeholder="Select an API key" />
            </SelectTrigger>
            <SelectContent>
              {apiKeys.map((key) => (
                <SelectItem key={key.id} value={key.key_hash}>
                  {key.name} ({key.key_prefix}...)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            This API key will be included in the embed code for authentication
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Security Note</AlertTitle>
          <AlertDescription>
            Your API key will be visible in the embed code. Only embed on trusted domains.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="admin" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inbox">
              <Inbox className="w-4 h-4 mr-2" />
              Simple Inbox
            </TabsTrigger>
            <TabsTrigger value="admin">
              <Code2 className="w-4 h-4 mr-2" />
              Admin Dashboard
            </TabsTrigger>
            <TabsTrigger value="customer">
              <User className="w-4 h-4 mr-2" />
              Customer View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="space-y-4">
            <div className="space-y-2">
              <Label>Full Inbox (Read-Only)</Label>
              <p className="text-sm text-muted-foreground">
                Display all conversations in a simple read-only view.
              </p>
            </div>

            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                <code>{getInboxEmbedCode()}</code>
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(getInboxEmbedCode(), 'inbox')}
              >
                {copiedInbox ? <><Check className="h-4 w-4 mr-2" />Copied</> : <><Copy className="h-4 w-4 mr-2" />Copy</>}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="admin" className="space-y-4">
            <div className="space-y-2">
              <Label>Full Admin Dashboard</Label>
              <p className="text-sm text-muted-foreground">
                Complete admin interface with all features based on API key permissions.
              </p>
            </div>

            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                <code>{getAdminDashboardCode()}</code>
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(getAdminDashboardCode(), 'admin')}
              >
                {copiedAdmin ? <><Check className="h-4 w-4 mr-2" />Copied</> : <><Copy className="h-4 w-4 mr-2" />Copy</>}
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm text-blue-900">Admin Features (requires admin permission):</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>View all conversations and messages</li>
                <li>Send messages to customers</li>
                <li>Assign conversations to team members</li>
                <li>Change conversation status</li>
                <li>View customer details and notes</li>
                <li>Real-time updates</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="customer" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerId">Customer ID</Label>
              <Input
                id="customerId"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                placeholder="Enter customer ID"
              />
            </div>

            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                <code>{getCustomerEmbedCode()}</code>
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(getCustomerEmbedCode(), 'customer')}
              >
                {copiedCustomer ? <><Check className="h-4 w-4 mr-2" />Copied</> : <><Copy className="h-4 w-4 mr-2" />Copy</>}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
