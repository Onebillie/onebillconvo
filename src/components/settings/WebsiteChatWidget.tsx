import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, RefreshCw, Code } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const WebsiteChatWidget = () => {
  const { user, currentBusinessId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [embedToken, setEmbedToken] = useState<any>(null);
  const [showToken, setShowToken] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  
  const [customization, setCustomization] = useState({
    primary_color: '#6366f1',
    widget_position: 'bottom-right',
    greeting_message: 'Hi! How can we help you today?',
  });

  useEffect(() => {
    loadData();
  }, [user, currentBusinessId]);

  const loadData = async () => {
    if (!user || !currentBusinessId) return;

    try {
      // Load existing token
      const { data: tokens } = await supabase
        .from('embed_tokens')
        .select('*, embed_sites!inner(site_id)')
        .eq('business_id', currentBusinessId)
        .eq('is_active', true)
        .limit(1);

      if (tokens && tokens.length > 0) {
        setEmbedToken(tokens[0]);

        // Load customization for this token
        const { data: custom } = await supabase
          .from('widget_customization')
          .select('*')
          .eq('business_id', currentBusinessId)
          .single();

        if (custom) {
          setCustomization({
            primary_color: custom.primary_color || '#6366f1',
            widget_position: custom.widget_position || 'bottom-right',
            greeting_message: custom.greeting_message || 'Hi! How can we help you today?',
          });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateToken = async () => {
    if (!user || !currentBusinessId) return;

    try {
      const tokenString = `token_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
      const siteId = `site_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;

      const { data: newToken, error: tokenError } = await supabase
        .from('embed_tokens')
        .insert({
          business_id: currentBusinessId,
          token: tokenString,
          name: 'Website Widget',
          is_active: true,
        })
        .select()
        .single();

      if (tokenError) throw tokenError;

      const { error: siteError } = await supabase
        .from('embed_sites')
        .insert({
          business_id: currentBusinessId,
          embed_token_id: newToken.id,
          site_id: siteId,
          name: 'Website Widget'
        });

      if (siteError) throw siteError;

      toast.success('Widget token generated!');
      loadData();
    } catch (error) {
      console.error('Error generating token:', error);
      toast.error('Failed to generate token');
    }
  };

  const saveCustomization = async () => {
    if (!user || !currentBusinessId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('widget_customization')
        .upsert({
          embed_token_id: embedToken.id,
          business_id: currentBusinessId,
          ...customization,
        });

      if (error) throw error;

      toast.success('Settings saved! Changes will appear on your website automatically.');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getEmbedCode = () => {
    if (!embedToken?.embed_sites || embedToken.embed_sites.length === 0) {
      return '<!-- Please generate a widget token first -->';
    }

    const siteId = embedToken.embed_sites[0].site_id;
    const origin = window.location.origin;
    
    return `<!-- AlacarteChat Widget -->
<script src="${origin}/embed-widget.js"></script>
<script>
  AlacarteChatWidget.init({
    siteId: '${siteId}',
    apiUrl: 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1'
  });
</script>`;
  };

  const copyCode = async () => {
    const code = getEmbedCode();
    if (code.includes('Please generate')) {
      toast.error('Generate a widget token first');
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied to clipboard!');
    } catch {
      toast.error('Failed to copy code');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Generate Token */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">1. Generate Widget Token</h3>
        {!embedToken ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              First, generate a secure token for your website widget.
            </p>
            <Button onClick={generateToken}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate Token
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label>Your Token</Label>
                <div className="flex gap-2 mt-1">
                  <Input 
                    value={showToken ? embedToken.token : '••••••••••••••••'}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-sm text-green-600">✓ Token active</p>
          </div>
        )}
      </Card>

      {/* Step 2: Customize */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">2. Customize Appearance</h3>
        <div className="space-y-4">
          <div>
            <Label>Primary Color</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="color"
                value={customization.primary_color}
                onChange={(e) => setCustomization({ ...customization, primary_color: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                value={customization.primary_color}
                onChange={(e) => setCustomization({ ...customization, primary_color: e.target.value })}
                placeholder="#6366f1"
              />
            </div>
          </div>

          <div>
            <Label>Widget Position</Label>
            <Select
              value={customization.widget_position}
              onValueChange={(value) => setCustomization({ ...customization, widget_position: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-right">Bottom Right</SelectItem>
                <SelectItem value="bottom-left">Bottom Left</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Greeting Message</Label>
            <Textarea
              value={customization.greeting_message}
              onChange={(e) => setCustomization({ ...customization, greeting_message: e.target.value })}
              placeholder="Hi! How can we help you today?"
              rows={3}
            />
          </div>

          <Button onClick={saveCustomization} disabled={saving}>
            {saving ? 'Saving...' : 'Save Customization'}
          </Button>
        </div>
      </Card>

      {/* Step 3: Get Code */}
      {embedToken && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">3. Add to Your Website</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Copy this code and paste it before the closing &lt;/body&gt; tag on your website. 
            Any changes you make above will automatically appear on your site.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => setShowCodeDialog(true)}>
              <Code className="w-4 h-4 mr-2" />
              View Embed Code
            </Button>
            <Button onClick={copyCode} variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              Copy Code
            </Button>
          </div>
        </Card>
      )}

      {/* Code Dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Embed Code</DialogTitle>
            <DialogDescription>
              Copy and paste this code into your website before the closing &lt;/body&gt; tag
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{getEmbedCode()}</code>
            </pre>
            <Button onClick={copyCode} className="w-full">
              <Copy className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
