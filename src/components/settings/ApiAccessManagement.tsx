import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const { currentBusinessId } = useAuth();
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

  // SDK Code Generators
  const getPHPCode = () => `<?php
// Install: composer require guzzlehttp/guzzle
require 'vendor/autoload.php';

function generateSSOToken($apiKey, $customerId, $scope = 'conversation') {
    $client = new \\GuzzleHttp\\Client();
    
    try {
        $response = $client->post('${projectUrl}/functions/v1/api-sso-generate-token', [
            'headers' => [
                'x-api-key' => $apiKey,
                'Content-Type' => 'application/json'
            ],
            'json' => [
                'customer_id' => $customerId,
                'scope' => $scope,
                'expires_in_minutes' => 60
            ]
        ]);
        
        $data = json_decode($response->getBody(), true);
        return $data;
    } catch (Exception $e) {
        error_log('SSO Token Error: ' . $e->getMessage());
        return null;
    }
}

// Usage Example
$apiKey = 'YOUR_API_KEY';
$customerId = 'CUSTOMER_ID';
$result = generateSSOToken($apiKey, $customerId);

if ($result) {
    echo '<iframe src="' . htmlspecialchars($result['embed_url']) . '" 
          width="100%" height="600" frameborder="0"></iframe>';
}
?>`;

  const getPythonCode = () => `# Install: pip install requests
import requests
from typing import Optional, Dict

def generate_sso_token(
    api_key: str, 
    customer_id: str, 
    scope: str = 'conversation',
    expires_in_minutes: int = 60
) -> Optional[Dict]:
    """Generate SSO token for embedding conversations"""
    
    url = '${projectUrl}/functions/v1/api-sso-generate-token'
    headers = {
        'x-api-key': api_key,
        'Content-Type': 'application/json'
    }
    payload = {
        'customer_id': customer_id,
        'scope': scope,
        'expires_in_minutes': expires_in_minutes
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'SSO Token Error: {e}')
        return None

# Usage Example
api_key = 'YOUR_API_KEY'
customer_id = 'CUSTOMER_ID'
result = generate_sso_token(api_key, customer_id)

if result:
    embed_url = result['embed_url']
    print(f'<iframe src="{embed_url}" width="100%" height="600"></iframe>')`;

  const getNodeCode = () => `// Install: npm install axios
const axios = require('axios');

async function generateSSOToken(apiKey, customerId, scope = 'conversation') {
  try {
    const response = await axios.post(
      '${projectUrl}/functions/v1/api-sso-generate-token',
      {
        customer_id: customerId,
        scope: scope,
        expires_in_minutes: 60
      },
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('SSO Token Error:', error.message);
    return null;
  }
}

// Usage Example
const apiKey = 'YOUR_API_KEY';
const customerId = 'CUSTOMER_ID';

generateSSOToken(apiKey, customerId).then(result => {
  if (result) {
    const embedHtml = \`
      <iframe 
        src="\${result.embed_url}" 
        width="100%" 
        height="600" 
        frameborder="0">
      </iframe>
    \`;
    console.log(embedHtml);
  }
});

// React Component Example
function CustomerChatEmbed({ customerId, apiKey }) {
  const [embedUrl, setEmbedUrl] = React.useState(null);
  
  React.useEffect(() => {
    generateSSOToken(apiKey, customerId).then(result => {
      if (result) setEmbedUrl(result.embed_url);
    });
  }, [customerId, apiKey]);
  
  if (!embedUrl) return <div>Loading...</div>;
  
  return (
    <iframe 
      src={embedUrl} 
      width="100%" 
      height="600" 
      frameBorder="0"
      style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}
    />
  );
}`;

  const getRubyCode = () => `# Install: gem install httparty
require 'httparty'
require 'json'

def generate_sso_token(api_key, customer_id, scope = 'conversation')
  url = '${projectUrl}/functions/v1/api-sso-generate-token'
  
  begin
    response = HTTParty.post(
      url,
      headers: {
        'x-api-key' => api_key,
        'Content-Type' => 'application/json'
      },
      body: {
        customer_id: customer_id,
        scope: scope,
        expires_in_minutes: 60
      }.to_json
    )
    
    return JSON.parse(response.body) if response.success?
    puts "Error: #{response.code} - #{response.body}"
    nil
  rescue StandardError => e
    puts "SSO Token Error: #{e.message}"
    nil
  end
end

# Usage Example
api_key = 'YOUR_API_KEY'
customer_id = 'CUSTOMER_ID'
result = generate_sso_token(api_key, customer_id)

if result
  puts "<iframe src='#{result['embed_url']}' width='100%' height='600'></iframe>"
end

# Rails Controller Example
class CustomersController < ApplicationController
  def chat_embed
    result = generate_sso_token(ENV['ALACARTE_API_KEY'], params[:customer_id])
    @embed_url = result['embed_url'] if result
  end
end`;

  const getCSharpCode = () => `// Install: dotnet add package Newtonsoft.Json
using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

public class SSOTokenGenerator
{
    private readonly string _apiKey;
    private readonly HttpClient _httpClient;
    
    public SSOTokenGenerator(string apiKey)
    {
        _apiKey = apiKey;
        _httpClient = new HttpClient();
    }
    
    public async Task<SSOTokenResponse> GenerateToken(
        string customerId, 
        string scope = "conversation",
        int expiresInMinutes = 60)
    {
        var url = "${projectUrl}/functions/v1/api-sso-generate-token";
        
        var payload = new
        {
            customer_id = customerId,
            scope = scope,
            expires_in_minutes = expiresInMinutes
        };
        
        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(
                JsonConvert.SerializeObject(payload),
                Encoding.UTF8,
                "application/json"
            )
        };
        request.Headers.Add("x-api-key", _apiKey);
        
        try
        {
            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            
            var content = await response.Content.ReadAsStringAsync();
            return JsonConvert.DeserializeObject<SSOTokenResponse>(content);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"SSO Token Error: {ex.Message}");
            return null;
        }
    }
}

public class SSOTokenResponse
{
    public string Token { get; set; }
    public string EmbedUrl { get; set; }
    public DateTime ExpiresAt { get; set; }
    public string Scope { get; set; }
}

// Usage Example
var generator = new SSOTokenGenerator("YOUR_API_KEY");
var result = await generator.GenerateToken("CUSTOMER_ID");

if (result != null)
{
    var embedHtml = $@"
        <iframe 
            src=""{result.EmbedUrl}"" 
            width=""100%"" 
            height=""600"" 
            frameborder=""0"">
        </iframe>";
    Console.WriteLine(embedHtml);
}`;

  const getCurlCode = () => `# Test SSO Token Generation
curl -X POST '${projectUrl}/functions/v1/api-sso-generate-token' \\
  -H 'x-api-key: YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "customer_id": "CUSTOMER_ID",
    "scope": "conversation",
    "expires_in_minutes": 60
  }'

# Example Response:
# {
#   "token": "uuid-uuid-uuid-uuid",
#   "embed_url": "${window.location.origin}/embed/conversation?token=...",
#   "expires_at": "2025-10-17T12:00:00Z",
#   "scope": "conversation",
#   "customer_id": "uuid"
# }

# Test Token Validation
curl -X GET '${projectUrl}/functions/v1/api-sso-validate-token?token=YOUR_TOKEN' \\
  -H 'Content-Type: application/json'`;

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
          <CardTitle>SSO Integration Setup</CardTitle>
          <CardDescription>
            Embed conversations directly into your CRM or application with secure Single Sign-On
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Start Guide */}
          <div className="border-l-4 border-primary pl-4">
            <h3 className="font-semibold text-lg mb-2">Quick Start Guide</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Generate an API key above (if you haven't already)</li>
              <li>Choose your tech stack and copy the SDK code below</li>
              <li>Replace YOUR_API_KEY with your actual API key</li>
              <li>Replace CUSTOMER_ID with your customer's ID</li>
              <li>The SDK will generate a secure token and embed URL automatically</li>
            </ol>
          </div>

          {/* SDK Snippets */}
          <div>
            <h3 className="font-semibold mb-4">SDK Code Snippets</h3>
            <div className="space-y-4">
              {/* PHP */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-medium">PHP</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getPHPCode())}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
                  <code>{getPHPCode()}</code>
                </pre>
              </div>

              {/* Python */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-medium">Python</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getPythonCode())}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
                  <code>{getPythonCode()}</code>
                </pre>
              </div>

              {/* Node.js */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-medium">Node.js / JavaScript</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getNodeCode())}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
                  <code>{getNodeCode()}</code>
                </pre>
              </div>

              {/* Ruby */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-medium">Ruby</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getRubyCode())}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
                  <code>{getRubyCode()}</code>
                </pre>
              </div>

              {/* C# / .NET */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-medium">C# / .NET</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getCSharpCode())}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
                  <code>{getCSharpCode()}</code>
                </pre>
              </div>

              {/* cURL */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-medium">cURL (Testing)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getCurlCode())}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
                  <code>{getCurlCode()}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* API Reference */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">API Reference</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Generate Token Endpoint</h4>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex items-start gap-2">
                    <Badge>POST</Badge>
                    <code className="text-sm flex-1">{projectUrl}/functions/v1/api-sso-generate-token</code>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium mb-1">Headers:</p>
                    <code className="block bg-background p-2 rounded">x-api-key: YOUR_API_KEY</code>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium mb-1">Request Body:</p>
                    <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
{`{
  "customer_id": "uuid",           // Required for "conversation" scope
  "scope": "conversation",         // or "inbox" for full inbox view
  "expires_in_minutes": 60,        // Optional, default 60
  "metadata": {                    // Optional custom data
    "user_id": "your-user-123",
    "source": "crm"
  }
}`}
                    </pre>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium mb-1">Response:</p>
                    <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
{`{
  "token": "uuid-uuid-uuid-uuid",
  "embed_url": "${window.location.origin}/embed/conversation?token=...",
  "expires_at": "2025-10-17T12:00:00Z",
  "scope": "conversation",
  "customer_id": "uuid"
}`}
                    </pre>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Scope Options</h4>
                <div className="grid gap-3">
                  <div className="border rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline">conversation</Badge>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Single Customer View</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Embeds a specific customer's conversation. Perfect for CRM customer profiles.
                          Requires <code className="text-xs bg-muted px-1 rounded">customer_id</code> in the request.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline">inbox</Badge>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Full Inbox View</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Embeds the complete conversation list with chat interface. Ideal for support dashboards.
                          No <code className="text-xs bg-muted px-1 rounded">customer_id</code> needed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Security Features</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Tokens are cryptographically secure and unique</li>
                  <li>Tokens expire automatically (default 60 minutes)</li>
                  <li>Each token is tied to your business account</li>
                  <li>Tokens are validated server-side on every request</li>
                  <li>Frozen accounts are automatically blocked</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
