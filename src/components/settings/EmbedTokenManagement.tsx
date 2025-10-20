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
  RefreshCw
} from "lucide-react";
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
      const domains = newTokenData.domains
        .split(',')
        .map(d => d.trim())
        .filter(d => d.length > 0);

      const { error } = await supabase
        .from('embed_tokens')
        .insert({
          business_id: businessUsers.business_id,
          token,
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

  const showEmbedCode = (token: string) => {
    const code = `<!-- Add this to your website's <head> or before </body> -->
<script src="${window.location.origin}/embed-widget.js"></script>
<script>
  AlacarteChatWidget.init({
    token: '${token}',
    customer: {
      name: 'User Name',      // Optional
      email: 'user@email.com', // Optional
      phone: '+1234567890'     // Optional
    },
    customData: {
      // Add any custom data you want to track
      userId: 'user123',
      plan: 'premium'
    }
  });
</script>`;
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
                        onClick={() => showEmbedCode(token.token)}
                      >
                        <Code className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteToken(token)}
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
            <DialogTitle>Embed Code</DialogTitle>
            <DialogDescription>
              Copy this code and paste it into your website
            </DialogDescription>
          </DialogHeader>
          
          {embedCode && (
            <div className="space-y-4">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                <code>{embedCode}</code>
              </pre>
              <Button 
                onClick={() => copyToClipboard(embedCode, "Embed code")}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Code
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
