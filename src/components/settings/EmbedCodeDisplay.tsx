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

  const handleCopy = async (code: string, type: 'inbox' | 'customer') => {
    try {
      await navigator.clipboard.writeText(code);
      if (type === 'inbox') {
        setCopiedInbox(true);
        setTimeout(() => setCopiedInbox(false), 2000);
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
          Embed your entire inbox or customer conversations into third-party CRMs and platforms
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
            The API key is visible in the iframe URL. Only embed this in secure, internal systems 
            (like CRMs, admin panels, or enterprise platforms). For public-facing embeds, use the 
            website widget instead (Settings → Embed Widget).
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="inbox" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inbox" className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              Full Inbox
            </TabsTrigger>
            <TabsTrigger value="customer" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Conversation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="space-y-4">
            <div className="space-y-2">
              <Label>Full Inbox Embed</Label>
              <p className="text-sm text-muted-foreground">
                Embed the full conversation inbox to allow staff to manage all conversations from within your CRM or platform.
              </p>
            </div>

            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs max-h-96 font-mono">
                <code>{getInboxEmbedCode()}</code>
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(getInboxEmbedCode(), 'inbox')}
              >
                {copiedInbox ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm text-blue-900">Features:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>View all conversations across all customers</li>
                <li>Contact list with search and filtering</li>
                <li>Real-time message updates</li>
                <li>Full conversation history</li>
                <li>Secure API key authentication</li>
              </ul>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-gray-900 mb-2">Common Use Cases:</h4>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>Internal CRM systems (Salesforce, HubSpot, Zendesk)</li>
                <li>Custom admin dashboards</li>
                <li>Support team portals</li>
                <li>Enterprise help desk integrations</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="customer" className="space-y-4">
            <div className="space-y-2">
              <Label>Customer-Specific Conversation</Label>
              <p className="text-sm text-muted-foreground">
                This embed shows conversations for a specific customer. Perfect for embedding in customer profile pages.
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Recommended: Use SSO Token API</AlertTitle>
              <AlertDescription>
                For customer-specific embeds, we recommend using the SSO Token API instead for better security. 
                See the "API Access → Integration Examples" section for implementation details.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="customer-id">Customer ID (for preview)</Label>
              <Input
                id="customer-id"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                placeholder="Enter customer ID"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Change this to preview the code with a different customer ID
              </p>
            </div>

            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs max-h-96 font-mono">
                <code>{getCustomerEmbedCode()}</code>
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(getCustomerEmbedCode(), 'customer')}
              >
                {copiedCustomer ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm text-blue-900">Features:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Customer-specific conversation view</li>
                <li>Aggregates all messages across conversations</li>
                <li>Real-time message updates</li>
                <li>Perfect for embedding in customer profiles</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-semibold text-sm text-amber-900 mb-2">⚠️ Important Notes:</h4>
          <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
            <li>The selected API key is automatically included in the embed code</li>
            <li>For customer embeds, replace <code className="bg-amber-100 px-1 rounded">CUSTOMER_ID</code> with the actual customer's ID</li>
            <li>The iframe loads directly - no additional JavaScript required</li>
            <li>API key provides full access - use only in trusted, internal environments</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
