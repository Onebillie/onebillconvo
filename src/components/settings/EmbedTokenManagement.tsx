import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Code, 
  Copy, 
  Eye, 
  EyeOff, 
  Loader2, 
  Plus, 
  Trash2,
  Globe,
  RefreshCw,
  ExternalLink,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EmbedToken {
  id: string;
  token: string;
  site_id?: string;
  name: string;
  allowed_domains: string[];
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  usage_count: number;
}

export function EmbedTokenManagement() {
  const { toast } = useToast();
  const [tokens, setTokens] = useState<EmbedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewToken, setShowNewToken] = useState(false);
  const [newTokenData, setNewTokenData] = useState({ name: '', domains: '' });
  const [revealedTokens, setRevealedTokens] = useState<Set<string>>(new Set());
  const [deleteToken, setDeleteToken] = useState<EmbedToken | null>(null);
  const [embedCode, setEmbedCode] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [testToken, setTestToken] = useState<EmbedToken | null>(null);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: businessUsers } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      if (!businessUsers) return;

      const { data, error } = await supabase
        .from('embed_tokens')
        .select('*')
        .eq('business_id', businessUsers.business_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTokens(data || []);
    } catch (error) {
      console.error('Error fetching tokens:', error);
      toast({
        title: "Error",
        description: "Failed to load embed tokens",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateToken = () => {
    return 'ect_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleCreateToken = async () => {
    if (!newTokenData.name.trim()) {
      toast({
        title: "Error",
        description: "Token name is required",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: businessUsers } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      if (!businessUsers) return;

      const token = generateToken();
      const siteId = generateToken(); // Generate site_id
      const domains = newTokenData.domains
        .split(',')
        .map(d => d.trim())
        .filter(d => d.length > 0);

      // Create token with generated site_id (TypeScript types may be outdated but DB has this column)
      const { error } = await supabase
        .from('embed_tokens')
        .insert({
          business_id: businessUsers.business_id,
          token,
          site_id: siteId as any,  // Force type, DB schema has this
          name: newTokenData.name,
          allowed_domains: domains.length > 0 ? domains : null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Embed token created successfully"
      });

      setNewTokenData({ name: '', domains: '' });
      setShowNewToken(false);
      fetchTokens();
    } catch (error) {
      console.error('Error creating token:', error);
      toast({
        title: "Error",
        description: "Failed to create embed token",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteToken = async () => {
    if (!deleteToken) return;

    try {
      const { error } = await supabase
        .from('embed_tokens')
        .delete()
        .eq('id', deleteToken.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Embed token deleted"
      });

      setDeleteToken(null);
      fetchTokens();
    } catch (error) {
      console.error('Error deleting token:', error);
      toast({
        title: "Error",
        description: "Failed to delete token",
        variant: "destructive"
      });
    }
  };

  const toggleTokenVisibility = (tokenId: string) => {
    setRevealedTokens(prev => {
      const next = new Set(prev);
      if (next.has(tokenId)) {
        next.delete(tokenId);
      } else {
        next.add(tokenId);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`
    });
  };

  const showEmbedCode = (token: EmbedToken) => {
    const siteId = token.site_id || token.token;
    const code = `<!-- AlacarteChat Widget - Installation Instructions -->

<!-- STEP 1: Add this script to your website -->
<!-- Place this in your <head> section or just before </body> -->
<script src="${window.location.origin}/embed-widget.js"></script>

<!-- STEP 2: Initialize the widget -->
<script>
  AlacarteChatWidget.init({
    siteId: '${siteId}',  // ✅ DO NOT CHANGE - Links to your account
    apiUrl: 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1',
    
    // ⚙️ OPTIONAL: Customer Identification
    // Only use if customers are logged into YOUR website/app
    // Remove this section completely if not needed
    customer: {
      name: 'John Doe',           // Your customer's actual name
      email: 'john@example.com',  // Your customer's actual email
      phone: '+1234567890'        // Your customer's actual phone
    },
    
    // ⚙️ OPTIONAL: Custom Tracking Data
    // Add any extra data you want to track
    // Remove this section completely if not needed
    customData: {
      userId: 'user123',      // Your internal user ID
      accountType: 'premium', // Customer plan/tier
      source: 'website'       // Traffic source
    }
  });
</script>

<!-- 
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 QUICK START (Minimal Setup)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For anonymous visitors, use this simplified version:

<script src="${window.location.origin}/embed-widget.js"></script>
<script>
  AlacarteChatWidget.init({
    siteId: '${siteId}',
    apiUrl: 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1'
  });
</script>

✨ That's it! The chat bubble will appear automatically.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 WHAT HAPPENS NEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ A floating chat bubble appears on your website
✅ Customers can send/receive messages instantly
✅ All messages appear in YOUR AlacarteChat inbox
✅ Completely isolated - only YOUR customers' messages
✅ Works on mobile and desktop

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 CUSTOMER IDENTIFICATION (Advanced)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If your website has user authentication, pass customer data:

// Example with PHP
<script>
  AlacarteChatWidget.init({
    siteId: '${siteId}',
    apiUrl: 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1',
    customer: {
      name: '<?php echo $user->name; ?>',
      email: '<?php echo $user->email; ?>',
      phone: '<?php echo $user->phone; ?>'
    }
  });
</script>

// Example with JavaScript variables
<script>
  AlacarteChatWidget.init({
    siteId: '${siteId}',
    apiUrl: 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1',
    customer: {
      name: window.currentUser.name,
      email: window.currentUser.email,
      phone: window.currentUser.phone
    }
  });
</script>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 PLATFORM-SPECIFIC GUIDES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WordPress:
1. Go to Appearance → Theme Editor
2. Open footer.php or use a plugin like "Insert Headers and Footers"
3. Paste the code before </body>

Shopify:
1. Go to Online Store → Themes → Actions → Edit Code
2. Open theme.liquid
3. Paste the code before </body>

Wix:
1. Go to Settings → Custom Code
2. Add New Code → Paste in the code
3. Set to load on "All Pages" in the <body>

HTML Website:
1. Open your HTML file
2. Paste the code just before </body> tag
3. Upload to your server

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❓ TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Widget not appearing?
✓ Check browser console for errors (F12)
✓ Ensure both <script> tags are present
✓ Verify siteId matches exactly (no spaces)
✓ Clear browser cache and refresh

Chat not working?
✓ Check your internet connection
✓ Verify the apiUrl is correct
✓ Try in incognito/private browsing mode

Still having issues?
✓ Contact support with your siteId
✓ Include any browser console errors
-->`;
    setEmbedCode(code);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Embed Tokens
              </CardTitle>
              <CardDescription>
                Generate tokens to embed chat widgets on your websites
              </CardDescription>
            </div>
            <Button onClick={() => setShowNewToken(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Token
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No embed tokens yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tokens.map(token => (
                <div key={token.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{token.name}</h4>
                        <Badge variant={token.is_active ? "default" : "secondary"}>
                          {token.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1 font-mono">
                          {revealedTokens.has(token.id) 
                            ? token.token 
                            : '•'.repeat(40)
                          }
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTokenVisibility(token.id)}
                        >
                          {revealedTokens.has(token.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(token.token, "Token")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>

                      {token.allowed_domains && token.allowed_domains.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Globe className="h-3 w-3" />
                          Allowed: {token.allowed_domains.join(', ')}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <span>Usage: {token.usage_count}</span>
                        {token.last_used_at && (
                          <span>
                            Last used: {new Date(token.last_used_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTestToken(token)}
                        title="Test widget"
                      >
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => showEmbedCode(token)}
                        title="View embed code"
                      >
                        <Code className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteToken(token)}
                        title="Delete token"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showNewToken} onOpenChange={setShowNewToken}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Embed Token</DialogTitle>
            <DialogDescription>
              Generate a new token to embed the chat widget on your website
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="token-name">Token Name *</Label>
              <Input
                id="token-name"
                placeholder="e.g., Main Website"
                value={newTokenData.name}
                onChange={(e) => setNewTokenData({ ...newTokenData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allowed-domains">Allowed Domains (Optional)</Label>
              <Input
                id="allowed-domains"
                placeholder="example.com, app.example.com"
                value={newTokenData.domains}
                onChange={(e) => setNewTokenData({ ...newTokenData, domains: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to allow all domains, or enter comma-separated domains
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowNewToken(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateToken} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Token
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!embedCode} onOpenChange={() => setEmbedCode(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Embed Code - Ready to Use!
            </DialogTitle>
            <DialogDescription>
              Copy and paste this code into your website. The chat bubble will appear automatically.
            </DialogDescription>
          </DialogHeader>
          
          {embedCode && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-green-900 dark:text-green-100">
                      Quick Start: Just copy & paste!
                    </p>
                    <ul className="space-y-1 text-green-800 dark:text-green-200">
                      <li>✅ Works immediately with no configuration</li>
                      <li>✅ Shows a floating chat bubble on your site</li>
                      <li>✅ All messages come to YOUR AlacarteChat inbox</li>
                      <li>✅ Completely secure and isolated to your business</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Collapsible open={showGuide} onOpenChange={setShowGuide}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Platform Setup Guide
                    </span>
                    {showGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        WordPress
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Appearance → Theme Editor → footer.php<br/>
                        Or use "Insert Headers and Footers" plugin
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Shopify
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Online Store → Themes → Edit Code<br/>
                        Open theme.liquid, paste before &lt;/body&gt;
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Wix
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Settings → Custom Code → Add New Code<br/>
                        Load on "All Pages" in &lt;body&gt;
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        HTML Website
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Open your HTML file<br/>
                        Paste before &lt;/body&gt; tag
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs max-h-96 border">
                  <code>{embedCode}</code>
                </pre>
              </div>
              
              <Button 
                onClick={() => copyToClipboard(embedCode, "Embed code")}
                className="w-full"
                size="lg"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Complete Code
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!testToken} onOpenChange={() => setTestToken(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              Test Widget Preview
            </DialogTitle>
            <DialogDescription>
              This shows how the chat widget will appear on your website
            </DialogDescription>
          </DialogHeader>
          
          {testToken && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-8 relative min-h-[400px] border-2 border-dashed">
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Globe className="h-12 w-12 mx-auto opacity-20" />
                    <p className="text-sm">Your website content</p>
                  </div>
                </div>
                <div className="absolute bottom-4 right-4">
                  <div className="relative">
                    <button className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Chat bubble appears in bottom-right corner
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Customers click to start chatting
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Messages appear in your inbox instantly
                </p>
              </div>

              <Button 
                onClick={() => {
                  setTestToken(null);
                  showEmbedCode(testToken);
                }}
                className="w-full"
              >
                Get Embed Code
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteToken} onOpenChange={() => setDeleteToken(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Embed Token?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke access for any websites using this token. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteToken}>
              Delete Token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
