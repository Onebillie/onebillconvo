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
  CheckCircle,
  Wand2
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EmbedWidgetWizard } from "./EmbedWidgetWizard";
import { WidgetCodeDialog } from "./WidgetCodeDialog";
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
  const [embedCode, setEmbedCode] = useState<{ token: EmbedToken; platform: string } | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'wordpress' | 'shopify' | 'wix' | 'html'>('html');
  const [testToken, setTestToken] = useState<EmbedToken | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardTokenId, setWizardTokenId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [codeDialogToken, setCodeDialogToken] = useState<EmbedToken | null>(null);
  const [templateSelector, setTemplateSelector] = useState<EmbedToken | null>(null);

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
      
      setBusinessId(businessUsers.business_id);

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

  const getCodeForPlatform = (token: EmbedToken, platform: string): string => {
    const siteId = token.site_id || token.token;
    const baseCode = `<script src="${window.location.origin}/embed-widget.js"></script>
<script>
  AlacarteChatWidget.init({
    siteId: '${siteId}',
    apiUrl: 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1'
  });
</script>`;

    switch (platform) {
      case 'wordpress':
        return `<!-- For WordPress: Add to footer.php before </body> or use "Insert Headers and Footers" plugin -->
${baseCode}`;
      case 'shopify':
        return `<!-- For Shopify: Add to theme.liquid before </body> -->
${baseCode}`;
      case 'wix':
        return `<!-- For Wix: Add via Settings → Custom Code → Add New Code (load on all pages in body) -->
${baseCode}`;
      case 'html':
      default:
        return `<!-- Paste this code before the </body> tag in your HTML file -->
${baseCode}`;
    }
  };

  const getInstructionsForPlatform = (platform: string): { steps: string[]; description: string } => {
    switch (platform) {
      case 'wordpress':
        return {
          description: 'Add the widget to your WordPress site',
          steps: [
            'Go to Appearance → Theme Editor',
            'Open footer.php file',
            'Paste the code before </body> tag',
            'Or use "Insert Headers and Footers" plugin'
          ]
        };
      case 'shopify':
        return {
          description: 'Add the widget to your Shopify store',
          steps: [
            'Go to Online Store → Themes',
            'Click Actions → Edit Code',
            'Open theme.liquid file',
            'Paste the code before </body> tag'
          ]
        };
      case 'wix':
        return {
          description: 'Add the widget to your Wix site',
          steps: [
            'Go to Settings → Custom Code',
            'Click "Add New Code"',
            'Paste the code',
            'Set to load on "All Pages" in <body>'
          ]
        };
      case 'html':
      default:
        return {
          description: 'Add the widget to your HTML website',
          steps: [
            'Open your HTML file in a text editor',
            'Find the </body> tag',
            'Paste the code just before </body>',
            'Save and upload to your server'
          ]
        };
    }
  };

  const showEmbedCode = (token: EmbedToken) => {
    setSelectedPlatform('html');
    setEmbedCode({ token, platform: 'html' });
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
                        onClick={() => setCodeDialogToken(token)}
                        title="Get widget code"
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Embed Code - Ready to Use
            </DialogTitle>
            <DialogDescription>
              Choose your platform and copy the code
            </DialogDescription>
          </DialogHeader>
          
          {embedCode && (
            <div className="space-y-4">
              {/* Platform Selector */}
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant={selectedPlatform === 'html' ? 'default' : 'outline'}
                  onClick={() => setSelectedPlatform('html')}
                  className="flex flex-col h-auto py-3"
                >
                  <Code className="h-5 w-5 mb-1" />
                  <span className="text-xs">HTML</span>
                </Button>
                <Button
                  variant={selectedPlatform === 'wordpress' ? 'default' : 'outline'}
                  onClick={() => setSelectedPlatform('wordpress')}
                  className="flex flex-col h-auto py-3"
                >
                  <Globe className="h-5 w-5 mb-1" />
                  <span className="text-xs">WordPress</span>
                </Button>
                <Button
                  variant={selectedPlatform === 'shopify' ? 'default' : 'outline'}
                  onClick={() => setSelectedPlatform('shopify')}
                  className="flex flex-col h-auto py-3"
                >
                  <Globe className="h-5 w-5 mb-1" />
                  <span className="text-xs">Shopify</span>
                </Button>
                <Button
                  variant={selectedPlatform === 'wix' ? 'default' : 'outline'}
                  onClick={() => setSelectedPlatform('wix')}
                  className="flex flex-col h-auto py-3"
                >
                  <Globe className="h-5 w-5 mb-1" />
                  <span className="text-xs">Wix</span>
                </Button>
              </div>

              {/* Instructions */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">
                  {getInstructionsForPlatform(selectedPlatform).description}
                </h4>
                <ol className="text-sm text-muted-foreground space-y-1">
                  {getInstructionsForPlatform(selectedPlatform).steps.map((step, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="font-medium">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Code Preview */}
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs border max-h-64">
                  <code>{getCodeForPlatform(embedCode.token, selectedPlatform)}</code>
                </pre>
              </div>
              
              {/* Copy Button */}
              <Button 
                onClick={() => copyToClipboard(
                  getCodeForPlatform(embedCode.token, selectedPlatform),
                  "Code"
                )}
                className="w-full"
                size="lg"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Code
              </Button>

              {/* Quick Info */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Works immediately - no configuration needed
                </p>
                <p className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Secure and isolated to your business only
                </p>
              </div>
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

      {codeDialogToken && businessId && (
        <WidgetCodeDialog
          open={!!codeDialogToken}
          onClose={() => setCodeDialogToken(null)}
          token={codeDialogToken}
          businessId={businessId}
          onCustomize={() => {
            setWizardTokenId(codeDialogToken.id);
            setCodeDialogToken(null);
            setWizardOpen(true);
          }}
        />
      )}

      {wizardOpen && wizardTokenId && businessId && (
        <EmbedWidgetWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          businessId={businessId}
          embedTokenId={wizardTokenId}
          onSave={() => {
            setWizardOpen(false);
            fetchTokens();
          }}
        />
      )}
    </>
  );
}
