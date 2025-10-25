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
import { WidgetLivePreview } from "./WidgetLivePreview";

export const WebsiteChatWidget = () => {
  const { user, currentBusinessId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [embedToken, setEmbedToken] = useState<any>(null);
  const [showToken, setShowToken] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  
  const [customization, setCustomization] = useState({
    primary_color: '#6366f1',
    secondary_color: '#4f46e5',
    text_color: '#ffffff',
    widget_position: 'bottom-right',
    widget_size: 'medium',
    widget_shape: 'circle',
    icon_type: 'chat',
    show_button_text: false,
    button_text: 'Chat',
    greeting_message: 'Hi! How can we help you today?',
    welcome_message: 'Welcome! How can we assist you?',
    widget_type: 'bubble',
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

        // Load customization for this specific token
        const { data: custom, error: customError } = await supabase
          .from('widget_customization')
          .select('*')
          .eq('business_id', currentBusinessId)
          .eq('embed_token_id', tokens[0].id)
          .maybeSingle();

        if (customError) {
          console.error('Error loading customization:', customError);
          toast.error('Failed to load widget settings');
        }

        if (custom) {
          setCustomization({
            primary_color: custom.primary_color || '#6366f1',
            secondary_color: custom.secondary_color || '#4f46e5',
            text_color: custom.text_color || '#ffffff',
            widget_position: custom.widget_position || 'bottom-right',
            widget_size: custom.widget_size || 'medium',
            widget_shape: custom.widget_shape || 'circle',
            icon_type: custom.icon_type || 'chat',
            show_button_text: custom.show_button_text || false,
            button_text: custom.button_text || 'Chat',
            greeting_message: custom.greeting_message || 'Hi! How can we help you today?',
            welcome_message: custom.welcome_message || 'Welcome! How can we assist you?',
            widget_type: custom.widget_type || 'bubble',
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
    if (!user || !currentBusinessId || !embedToken) return;

    setSaving(true);
    try {
      const { data: saved, error } = await supabase
        .from('widget_customization')
        .upsert({
          embed_token_id: embedToken.id,
          business_id: currentBusinessId,
          ...customization,
        }, {
          onConflict: 'business_id,embed_token_id'
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state with saved values
      if (saved) {
        setCustomization({
          primary_color: saved.primary_color || '#6366f1',
          secondary_color: saved.secondary_color || '#4f46e5',
          text_color: saved.text_color || '#ffffff',
          widget_position: saved.widget_position || 'bottom-right',
          widget_size: saved.widget_size || 'medium',
          widget_shape: saved.widget_shape || 'circle',
          icon_type: saved.icon_type || 'chat',
          show_button_text: saved.show_button_text || false,
          button_text: saved.button_text || 'Chat',
          greeting_message: saved.greeting_message || 'Hi! How can we help you today?',
          welcome_message: saved.welcome_message || 'Welcome! How can we assist you?',
          widget_type: saved.widget_type || 'bubble',
        });
      }

      const savedTime = new Date().toLocaleTimeString();
      toast.success(`Settings saved at ${savedTime}!`, {
        description: 'Changes will appear automatically on next widget load. If changes don\'t appear immediately, press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac) to hard refresh.',
        duration: 6000
      });
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
    const version = Date.now(); // Cache-busting parameter
    
    return `<!-- AlacarteChat Widget -->
<script src="${origin}/embed-widget.js?v=${version}"></script>
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
        <h3 className="text-lg font-semibold mb-6">2. Customize Appearance</h3>
        <p className="text-sm text-muted-foreground mb-6">Fine-tune colors, position, size, and icon</p>
        
        <div className="space-y-8">
          {/* Colors */}
          <div className="space-y-4">
            <h4 className="font-medium">Colors</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm mb-2 block">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={customization.primary_color}
                    onChange={(e) => setCustomization({ ...customization, primary_color: e.target.value })}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={customization.primary_color}
                    onChange={(e) => setCustomization({ ...customization, primary_color: e.target.value })}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-sm mb-2 block">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={customization.secondary_color}
                    onChange={(e) => setCustomization({ ...customization, secondary_color: e.target.value })}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={customization.secondary_color}
                    onChange={(e) => setCustomization({ ...customization, secondary_color: e.target.value })}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-sm mb-2 block">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={customization.text_color}
                    onChange={(e) => setCustomization({ ...customization, text_color: e.target.value })}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={customization.text_color}
                    onChange={(e) => setCustomization({ ...customization, text_color: e.target.value })}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Widget Icon */}
          <div className="space-y-4">
            <h4 className="font-medium">Widget Icon</h4>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {['chat', 'speech-bubble', 'headset', 'help-circle', 'phone', 'sparkles', 'smile', 'shopping', 'lifebuoy', 'message-circle', 'heart', 'star', 'zap', 'info', 'users', 'send'].map((icon) => (
                <button
                  key={icon}
                  onClick={() => setCustomization({ ...customization, icon_type: icon })}
                  className={`p-4 border-2 rounded-lg hover:border-primary transition-colors ${
                    customization.icon_type === icon ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  {icon === 'chat' && <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
                  {icon === 'speech-bubble' && <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
                  {icon === 'headset' && <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>}
                  {icon === 'help-circle' && <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>}
                  {icon === 'phone' && <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>}
                  {icon === 'sparkles' && <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>}
                  {icon === 'smile' && <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>}
                  {icon === 'shopping' && <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>}
                  {icon === 'lifebuoy' && <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" x2="9.17" y1="4.93" y2="9.17"/><line x1="14.83" x2="19.07" y1="14.83" y2="19.07"/></svg>}
                  {icon === 'message-circle' && <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>}
                  {icon === 'heart' && <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>}
                  {icon === 'star' && <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                  {icon === 'zap' && <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>}
                  {icon === 'info' && <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>}
                  {icon === 'users' && <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                  {icon === 'send' && <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
                </button>
              ))}
            </div>
          </div>

          {/* Widget Shape & Size */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium">Widget Shape</h4>
              <div className="grid grid-cols-3 gap-4">
                {['circle', 'square', 'rounded'].map((shape) => (
                  <button
                    key={shape}
                    onClick={() => setCustomization({ ...customization, widget_shape: shape })}
                    className={`p-6 border-2 rounded-lg hover:border-primary transition-all ${
                      customization.widget_shape === shape ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div 
                        className="bg-primary"
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: shape === 'circle' ? '50%' : shape === 'square' ? '12px' : '24px',
                        }}
                      />
                      <span className="text-sm font-medium capitalize">{shape}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Widget Size</h4>
              <div className="grid grid-cols-3 gap-4">
                {['small', 'medium', 'large'].map((size) => (
                  <button
                    key={size}
                    onClick={() => setCustomization({ ...customization, widget_size: size })}
                    className={`p-6 border-2 rounded-lg hover:border-primary transition-all ${
                      customization.widget_size === size ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div 
                        className="bg-primary"
                        style={{
                          width: size === 'small' ? '48px' : size === 'medium' ? '60px' : '80px',
                          height: size === 'small' ? '48px' : size === 'medium' ? '60px' : '80px',
                          borderRadius: customization.widget_shape === 'circle' ? '50%' : customization.widget_shape === 'square' ? '12px' : '24px',
                        }}
                      />
                      <span className="text-sm font-medium capitalize">{size}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Widget Position */}
          <div className="space-y-4">
            <h4 className="font-medium">Widget Position</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'top-left', label: 'Top Left' },
                { value: 'top-center', label: 'Top Center' },
                { value: 'top-right', label: 'Top Right' },
                { value: 'bottom-left', label: 'Bottom Left' },
                { value: 'bottom-center', label: 'Bottom Center' },
                { value: 'bottom-right', label: 'Bottom Right' },
              ].map((pos) => (
                <button
                  key={pos.value}
                  onClick={() => setCustomization({ ...customization, widget_position: pos.value })}
                  className={`p-3 rounded-lg text-sm font-medium transition-all ${
                    customization.widget_position === pos.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Button Text */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Button Text</h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customization.show_button_text}
                  onChange={(e) => setCustomization({ ...customization, show_button_text: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Show text</span>
              </label>
            </div>
            {customization.show_button_text && (
              <Input
                value={customization.button_text}
                onChange={(e) => setCustomization({ ...customization, button_text: e.target.value })}
                placeholder="Chat with us"
              />
            )}
          </div>

          {/* Greeting Message */}
          <div className="space-y-4">
            <h4 className="font-medium">Greeting Message</h4>
            <Textarea
              value={customization.greeting_message}
              onChange={(e) => setCustomization({ ...customization, greeting_message: e.target.value })}
              placeholder="Hi! How can we help you today?"
              rows={3}
            />
          </div>

          <Button onClick={saveCustomization} disabled={saving} size="lg" className="w-full">
            {saving ? 'Saving...' : 'Save Customization'}
          </Button>
        </div>
      </Card>

      {/* Live Preview */}
      {embedToken && (
        <WidgetLivePreview config={customization} />
      )}

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
