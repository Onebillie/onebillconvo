import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, Code2, User, Inbox } from 'lucide-react';
import { toast } from 'sonner';

export const EmbedCodeDisplay = () => {
  const [copiedInbox, setCopiedInbox] = useState(false);
  const [copiedCustomer, setCopiedCustomer] = useState(false);
  const [customerId, setCustomerId] = useState('CUSTOMER_ID');

  const projectUrl = window.location.origin;

  const getInboxEmbedCode = () => {
    return `<!-- Full Inbox Embed -->
<iframe 
  id="alacarte-inbox-embed"
  src="${projectUrl}/embed/inbox?apiKey=YOUR_API_KEY"
  width="100%" 
  height="600"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
></iframe>`;
  };

  const getCustomerEmbedCode = () => {
    return `<!-- Customer-Specific Conversation Embed -->
<iframe 
  id="alacarte-customer-embed"
  src="${projectUrl}/embed/conversation?apiKey=YOUR_API_KEY&customerId=${customerId}"
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-primary" />
          <CardTitle>Embed Code Snippets</CardTitle>
        </div>
        <CardDescription>
          Embed AlacarteChat conversations into your own applications
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                This embed shows all conversations in your inbox with a contact list on the left side.
                Perfect for internal dashboards or agent interfaces.
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
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="customer" className="space-y-4">
            <div className="space-y-2">
              <Label>Customer-Specific Conversation</Label>
              <p className="text-sm text-muted-foreground">
                This embed shows conversations for a specific customer. All messages from all
                conversations with this customer will aggregate in one view.
              </p>
            </div>

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
                <li>Secure token-based authentication</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-sm text-amber-900 mb-2">⚠️ Important Notes:</h4>
            <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
              <li>Replace <code className="bg-amber-100 px-1 rounded">YOUR_API_KEY</code> with your actual API key from Settings → API Access</li>
              <li>For customer embeds, replace <code className="bg-amber-100 px-1 rounded">CUSTOMER_ID</code> with the actual customer's ID</li>
              <li>The iframe loads directly - no additional JavaScript required</li>
              <li>All embeds are secured with API key authentication</li>
            </ul>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-sm text-gray-900 mb-2">📖 Use Cases:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <p className="font-medium mb-1">Full Inbox:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Internal agent dashboards</li>
                  <li>CRM integrations</li>
                  <li>Admin panels</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">Customer Conversation:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Customer profile pages</li>
                  <li>Support ticket views</li>
                  <li>Order management systems</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
