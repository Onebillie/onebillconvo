import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ApiDocs = () => {
  const [copiedEndpoint, setCopiedEndpoint] = useState<string>("");
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const API_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  const SUPABASE_URL = "https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1";

  const copyToClipboard = (text: string, endpoint: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(endpoint);
    setTimeout(() => setCopiedEndpoint(""), 2000);
    toast({
      title: "Copied!",
      description: "Code snippet copied to clipboard",
    });
  };

  const endpoints = [
    {
      category: "Authentication",
      items: [
        {
          name: "API Key Authentication",
          method: "ALL",
          endpoint: "/",
          description: "All API requests require authentication using an API key in the header. Generate your API key in Settings → API Access.",
          request: `curl -H "x-api-key: YOUR_API_KEY" \\
  ${API_BASE_URL}/customers`,
          response: null,
        },
        {
          name: "Rate Limits",
          method: "INFO",
          endpoint: "/",
          description: "API rate limit: 1000 requests per hour per API key. Exceeding this will return 429 Too Many Requests.",
          request: null,
          response: `{
  "error": "Rate limit exceeded",
  "retry_after": 3600
}`,
        },
      ],
    },
    {
      category: "Webhooks",
      items: [
        {
          name: "Configure Webhooks",
          method: "POST",
          endpoint: "/settings",
          description: "Set up webhook URLs to receive real-time notifications for new messages, conversation status changes, and more. Configure in Settings → Webhook Configuration or via API.",
          request: `curl -X POST \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "webhook_url": "https://your-domain.com/webhook",
    "events": ["message.received", "conversation.status_changed"]
  }' \\
  ${API_BASE_URL}/settings`,
          response: `{
  "success": true,
  "webhook_url": "https://your-domain.com/webhook",
  "events": ["message.received", "conversation.status_changed"]
}`,
        },
        {
          name: "Webhook Events",
          method: "INFO",
          endpoint: "/webhooks",
          description: "Available webhook events: message.received, message.sent, conversation.created, conversation.status_changed, conversation.assigned, task.created, task.completed",
          request: null,
          response: `// Example webhook payload
{
  "event": "message.received",
  "timestamp": "2025-10-20T12:00:00Z",
  "data": {
    "message_id": "uuid",
    "conversation_id": "uuid",
    "customer_id": "uuid",
    "platform": "whatsapp",
    "content": "Hello!",
    "from": "+1234567890"
  }
}`,
        },
      ],
    },
    {
      category: "SSO Integration",
      items: [
        {
          name: "Generate SSO Token",
          method: "POST",
          endpoint: "/sso/generate-token",
          description: "Generate a single sign-on token to embed À La Carte Chat in your customer portal. Token is valid for 1 hour.",
          request: `curl -X POST \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_id": "uuid",
    "return_url": "https://your-app.com/dashboard"
  }' \\
  ${SUPABASE_URL}/api-sso-generate-token`,
          response: `{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2025-10-20T13:00:00Z",
  "embed_url": "https://alacartechat.com/embed/inbox?token=..."
}`,
        },
        {
          name: "Validate SSO Token",
          method: "POST",
          endpoint: "/sso/validate-token",
          description: "Validate an SSO token before use (optional - tokens are auto-validated on embed).",
          request: `curl -X POST \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }' \\
  ${SUPABASE_URL}/api-sso-validate-token`,
          response: `{
  "valid": true,
  "customer_id": "uuid",
  "expires_at": "2025-10-20T13:00:00Z"
}`,
        },
      ],
    },
    {
      category: "Customers",
      items: [
        {
          name: "Get All Customers",
          method: "GET",
          endpoint: "/customers",
          description: "Retrieve all customers with their conversations and messages. Supports pagination with ?limit=50&offset=0 parameters.",
          request: `curl -H "x-api-key: YOUR_API_KEY" \\
  "${API_BASE_URL}/customers?limit=50&offset=0"`,
          response: `{
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "whatsapp_phone": "+1234567890",
      "created_at": "2025-01-01T00:00:00Z",
      "conversations": [...]
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 245,
    "has_more": true
  }
}`,
        },
        {
          name: "Get Customer by ID",
          method: "GET",
          endpoint: "/customers?id={customerId}",
          description: "Retrieve a specific customer by their ID",
          request: `curl -H "x-api-key: YOUR_API_KEY" \\
  ${API_BASE_URL}/customers?id=CUSTOMER_ID`,
          response: `{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "conversations": [...]
}`,
        },
        {
          name: "Get Customer by Email",
          method: "GET",
          endpoint: "/customers?email={email}",
          description: "Retrieve a customer by email address",
          request: `curl -H "x-api-key: YOUR_API_KEY" \\
  ${API_BASE_URL}/customers?email=john@example.com`,
          response: `{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com"
}`,
        },
        {
          name: "Create Customer",
          method: "POST",
          endpoint: "/customers/create",
          description: "Create a new customer",
          request: `curl -X POST \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+1234567890",
    "business_id": "YOUR_BUSINESS_ID"
  }' \\
  ${API_BASE_URL}/customers/create`,
          response: `{
  "id": "uuid",
  "name": "Jane Smith",
  "created_at": "2025-01-01T00:00:00Z"
}`,
        },
        {
          name: "Update Customer",
          method: "PUT",
          endpoint: "/customers/update",
          description: "Update customer details",
          request: `curl -X PUT \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "id": "CUSTOMER_ID",
    "name": "Updated Name",
    "notes": "VIP customer"
  }' \\
  ${API_BASE_URL}/customers/update`,
          response: `{
  "success": true,
  "customer": {...}
}`,
        },
        {
          name: "Delete Customer",
          method: "DELETE",
          endpoint: "/customers/delete",
          description: "Delete a customer (soft delete)",
          request: `curl -X DELETE \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"id": "CUSTOMER_ID"}' \\
  ${API_BASE_URL}/customers/delete`,
          response: `{"success": true}`,
        },
      ],
    },
    {
      category: "Messages",
      items: [
        {
          name: "Send Message",
          method: "POST",
          endpoint: "/send-message",
          description: "Send a message via WhatsApp, Email, SMS, Facebook Messenger, or Instagram DM. The channel field determines the delivery method.",
          request: `curl -X POST \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customerId": "CUSTOMER_ID",
    "channel": "whatsapp",
    "content": "Hello from API!",
    "subject": "Optional email subject"
  }' \\
  ${SUPABASE_URL}/api-send-message`,
          response: `{
  "success": true,
  "conversationId": "uuid",
  "message": "Message sent successfully"
}`,
          additionalInfo: `Supported channels:
- "whatsapp" - Requires customer.phone
- "email" - Requires customer.email (use subject field for email subject)
- "sms" - Requires customer.phone  
- "facebook" - Requires customer.facebook_psid
- "instagram" - Requires customer.instagram_id`,
        },
        {
          name: "Get Messages",
          method: "GET",
          endpoint: "/messages?conversationId={id}",
          description: "Retrieve messages for a conversation",
          request: `curl -H "x-api-key: YOUR_API_KEY" \\
  ${API_BASE_URL}/messages?conversationId=CONVERSATION_ID`,
          response: `[
  {
    "id": "uuid",
    "content": "Hello!",
    "direction": "inbound",
    "channel": "whatsapp",
    "created_at": "2025-01-01T00:00:00Z",
    "attachments": []
  }
]`,
        },
      ],
    },
    {
      category: "Conversations",
      items: [
        {
          name: "Get All Conversations",
          method: "GET",
          endpoint: "/conversations",
          description: "Retrieve all conversations with messages",
          request: `curl -H "x-api-key: YOUR_API_KEY" \\
  ${API_BASE_URL}/conversations`,
          response: `[
  {
    "id": "uuid",
    "status": "active",
    "customer": {...},
    "messages": [...]
  }
]`,
        },
        {
          name: "Get Conversation by ID",
          method: "GET",
          endpoint: "/conversations?id={conversationId}",
          description: "Retrieve a specific conversation",
          request: `curl -H "x-api-key: YOUR_API_KEY" \\
  ${API_BASE_URL}/conversations?id=CONVERSATION_ID`,
          response: `{
  "id": "uuid",
  "customer": {...},
  "messages": [...]
}`,
        },
        {
          name: "Update Conversation Status",
          method: "PUT",
          endpoint: "/conversations/status",
          description: "Update conversation status (active, closed, archived)",
          request: `curl -X PUT \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "conversationId": "CONVERSATION_ID",
    "status": "closed"
  }' \\
  ${API_BASE_URL}/conversations/status`,
          response: `{"success": true}`,
        },
      ],
    },
    {
      category: "Templates",
      items: [
        {
          name: "Get All Templates",
          method: "GET",
          endpoint: "/templates",
          description: "Retrieve all message templates",
          request: `curl -H "x-api-key: YOUR_API_KEY" \\
  ${API_BASE_URL}/templates`,
          response: `[
  {
    "id": "uuid",
    "name": "Welcome Message",
    "content": "Hello {{name}}!",
    "variables": ["name"],
    "platform": "whatsapp"
  }
]`,
        },
        {
          name: "Create Template",
          method: "POST",
          endpoint: "/templates/create",
          description: "Create a new message template",
          request: `curl -X POST \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Appointment Reminder",
    "content": "Hi {{name}}, reminder for {{date}}",
    "platform": "email",
    "business_id": "YOUR_BUSINESS_ID"
  }' \\
  ${API_BASE_URL}/templates/create`,
          response: `{
  "id": "uuid",
  "name": "Appointment Reminder"
}`,
        },
      ],
    },
    {
      category: "Settings",
      items: [
        {
          name: "Get Business Settings",
          method: "GET",
          endpoint: "/settings",
          description: "Retrieve business settings",
          request: `curl -H "x-api-key: YOUR_API_KEY" \\
  ${API_BASE_URL}/settings`,
          response: `{
  "company_name": "My Business",
  "email_signature": "Best regards",
  "support_email": "support@example.com"
}`,
        },
        {
          name: "Update Business Settings",
          method: "PUT",
          endpoint: "/settings/update",
          description: "Update business settings",
          request: `curl -X PUT \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "company_name": "Updated Name",
    "support_email": "new@example.com"
  }' \\
  ${API_BASE_URL}/settings/update`,
          response: `{"success": true}`,
        },
      ],
    },
    {
      category: "Notifications & Push",
      items: [
        {
          name: "Send Push Notification",
          method: "POST",
          endpoint: "/notifications/push",
          description: "Send a push notification to a user",
          request: `curl -X POST \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "USER_ID",
    "title": "New Message",
    "body": "You have a new message",
    "url": "/app/conversations/123"
  }' \\
  ${API_BASE_URL}/notifications/push`,
          response: `{"success": true}`,
        },
        {
          name: "Get Push Subscriptions",
          method: "GET",
          endpoint: "/notifications/subscriptions",
          description: "Get all push subscriptions for a user",
          request: `curl -H "x-api-key: YOUR_API_KEY" \\
  ${API_BASE_URL}/notifications/subscriptions?userId=USER_ID`,
          response: `[
  {
    "endpoint": "...",
    "created_at": "2025-01-01T00:00:00Z"
  }
]`,
        },
      ],
    },
    {
      category: "Admin Management",
      items: [
        {
          name: "Get Team Members",
          method: "GET",
          endpoint: "/admin/team",
          description: "Get all team members",
          request: `curl -H "x-api-key: YOUR_API_KEY" \\
  ${API_BASE_URL}/admin/team`,
          response: `[
  {
    "id": "uuid",
    "full_name": "Admin User",
    "email": "admin@example.com",
    "role": "admin",
    "is_active": true
  }
]`,
        },
        {
          name: "Add Team Member",
          method: "POST",
          endpoint: "/admin/team/add",
          description: "Add a new team member",
          request: `curl -X POST \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "newuser@example.com",
    "full_name": "New User",
    "role": "agent"
  }' \\
  ${API_BASE_URL}/admin/team/add`,
          response: `{
  "id": "uuid",
  "email": "newuser@example.com"
}`,
        },
        {
          name: "Update Team Member Role",
          method: "PUT",
          endpoint: "/admin/team/role",
          description: "Update team member role",
          request: `curl -X PUT \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "USER_ID",
    "role": "admin"
  }' \\
  ${API_BASE_URL}/admin/team/role`,
          response: `{"success": true}`,
        },
        {
          name: "Remove Team Member",
          method: "DELETE",
          endpoint: "/admin/team/remove",
          description: "Remove a team member",
          request: `curl -X DELETE \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"userId": "USER_ID"}' \\
  ${API_BASE_URL}/admin/team/remove`,
          response: `{"success": true}`,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-xl font-semibold">À La Carte Chat API</span>
          </div>
          <Button onClick={() => navigate("/auth")}>
            Sign In
          </Button>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">A La Carte Chat API Documentation</h1>
          <p className="text-muted-foreground text-lg">
            Comprehensive API reference for integrating with A La Carte Chat
          </p>
        </div>

        <Card className="mb-8 p-6">
          <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Base URL</h3>
              <div className="bg-muted p-3 rounded-md font-mono text-sm">
                {API_BASE_URL}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Alternative (Supabase direct): {SUPABASE_URL}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Authentication</h3>
              <p className="text-muted-foreground mb-2">
                All API requests require an API key. Include your API key in the request header:
              </p>
              <div className="bg-muted p-3 rounded-md font-mono text-sm">
                x-api-key: YOUR_API_KEY
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Rate Limiting</h3>
              <p className="text-muted-foreground">
                API requests are limited to 1000 requests per hour per API key by default.
                Contact support to increase your limit.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Custom Domain Setup</h3>
              <p className="text-muted-foreground mb-2">
                To use api.alacartechat.com instead of the Supabase URL:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Configure a CNAME record pointing to your Supabase project</li>
                <li>Update your API calls to use https://api.alacartechat.com/v1</li>
                <li>All existing endpoints remain the same</li>
              </ol>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="customers" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          {endpoints.map((category) => (
            <TabsContent
              key={category.category.toLowerCase()}
              value={category.category.toLowerCase()}
              className="space-y-4"
            >
              {category.items.map((endpoint, idx) => (
                <Card key={idx} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={
                          endpoint.method === "GET" ? "default" :
                          endpoint.method === "POST" ? "secondary" :
                          endpoint.method === "PUT" ? "outline" :
                          "destructive"
                        }>
                          {endpoint.method}
                        </Badge>
                        <code className="text-sm font-mono">{endpoint.endpoint}</code>
                      </div>
                      <h3 className="text-xl font-semibold">{endpoint.name}</h3>
                      <p className="text-muted-foreground mt-1">{endpoint.description}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {endpoint.request && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Request</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(endpoint.request, endpoint.endpoint)}
                          >
                            {copiedEndpoint === endpoint.endpoint ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                          <code>{endpoint.request}</code>
                        </pre>
                      </div>
                    )}

                    {endpoint.response && (
                      <div>
                        <h4 className="font-medium mb-2">Response</h4>
                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                          <code>{endpoint.response}</code>
                        </pre>
                      </div>
                    )}

                    {(endpoint as any).additionalInfo && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-2">Additional Information</h4>
                        <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {(endpoint as any).additionalInfo}
                        </pre>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>

        <Card className="mt-8 p-6">
          <h2 className="text-2xl font-semibold mb-4">PWA Installation Guide</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>A La Carte Chat can be installed as a Progressive Web App (PWA) for a native app experience:</p>
            
            <div>
              <h3 className="font-medium text-foreground mb-2">iOS (Safari)</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open alacartechat.com in Safari</li>
                <li>Tap the Share button</li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Tap "Add" to install</li>
              </ol>
            </div>

            <div>
              <h3 className="font-medium text-foreground mb-2">Android (Chrome)</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open alacartechat.com in Chrome</li>
                <li>Tap the menu (three dots)</li>
                <li>Tap "Add to Home screen"</li>
                <li>Tap "Add" to install</li>
              </ol>
            </div>

            <div>
              <h3 className="font-medium text-foreground mb-2">Desktop (Chrome/Edge)</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open alacartechat.com in Chrome or Edge</li>
                <li>Click the install icon in the address bar</li>
                <li>Click "Install" to add to your applications</li>
              </ol>
            </div>
          </div>
        </Card>

        <Card className="mt-8 p-6">
          <h2 className="text-2xl font-semibold mb-4">Error Codes</h2>
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b">
              <code className="font-mono">401</code>
              <span>Unauthorized - Invalid API key</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <code className="font-mono">403</code>
              <span>Forbidden - Insufficient permissions</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <code className="font-mono">404</code>
              <span>Not Found - Resource doesn't exist</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <code className="font-mono">429</code>
              <span>Too Many Requests - Rate limit exceeded</span>
            </div>
            <div className="flex justify-between py-2">
              <code className="font-mono">500</code>
              <span>Internal Server Error - Contact support</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ApiDocs;
