import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { widgetPresets } from "@/lib/widgetPresets";
import { Copy, Check, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface WidgetCodeDialogProps {
  open: boolean;
  onClose: () => void;
  token: {
    site_id?: string;
    id: string;
  };
  businessId: string;
  onCustomize: () => void;
}

export const WidgetCodeDialog = ({ open, onClose, token, businessId, onCustomize }: WidgetCodeDialogProps) => {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [copiedPreset, setCopiedPreset] = useState<string | null>(null);

  const generateEmbedCode = (presetId: string) => {
    const preset = widgetPresets.find(p => p.id === presetId);
    if (!preset) return '';

    const siteId = token.site_id;
    if (!siteId) {
      console.error('Token missing site_id:', token);
      return '<!-- Error: Token missing site_id. Please recreate the token. -->';
    }

    const config = preset.config;
    const WIDGET_URL = window.location.origin;
    const API_URL = 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1';
    
    return `<!-- AlacarteChat Widget - ${preset.name} -->
<!-- Paste this code before the closing </body> tag -->
<div id="alacarte-chat-root"></div>
<script>
(function() {
  'use strict';
  
  const config = {
    siteId: '${siteId}',
    apiUrl: '${API_URL}',
    primaryColor: '${config.primary_color}',
    secondaryColor: '${config.secondary_color}',
    textColor: '${config.text_color}',
    position: '${config.widget_position}',
    size: '${config.widget_size}',
    showText: ${config.show_button_text},
    buttonText: '${config.button_text}',
    iconType: '${config.icon_type}',
    greeting: '${config.greeting_message}'
  };

  let session = null;
  let isOpen = false;

  // Initialize widget
  async function init() {
    try {
      const response = await fetch(config.apiUrl + '/embed-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-site-id': config.siteId
        },
        body: JSON.stringify({})
      });

      const data = await response.json();
      if (data.success) {
        session = data.session;
        createWidget();
        loadMessages();
        startPolling();
      }
    } catch (error) {
      console.error('Chat widget error:', error);
    }
  }

  // Create widget UI
  function createWidget() {
    const sizeMap = { small: '48px', medium: '60px', large: '72px' };
    const buttonSize = sizeMap[config.size];
    
    const icons = {
      'chat': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
      'headset': '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
      'help-circle': '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>'
    };
    const icon = icons[config.iconType] || icons['chat'];

    const root = document.getElementById('alacarte-chat-root');
    root.innerHTML = \`
      <style>
        #alacarte-widget { position: fixed; \${config.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'} \${config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'} z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        #alacarte-btn { \${config.showText ? 'min-width: ' + buttonSize + '; padding: 0 20px;' : 'width: ' + buttonSize + ';'} height: \${buttonSize}; background: \${config.primaryColor}; color: \${config.textColor}; border: none; border-radius: \${config.showText ? '30px' : '50%'}; box-shadow: 0 4px 12px rgba(0,0,0,0.15); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: transform 0.2s; }
        #alacarte-btn:hover { transform: scale(1.05); }
        #alacarte-window { position: fixed; \${config.position.includes('bottom') ? 'bottom: 90px;' : 'top: 90px;'} \${config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'} width: 350px; height: 500px; background: white; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); display: none; flex-direction: column; }
        #alacarte-window.open { display: flex; }
        #alacarte-header { background: \${config.primaryColor}; color: white; padding: 16px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center; }
        #alacarte-messages { flex: 1; padding: 16px; overflow-y: auto; }
        .msg { margin-bottom: 12px; }
        .msg.customer { text-align: right; }
        .msg-content { display: inline-block; padding: 8px 12px; border-radius: 12px; max-width: 70%; }
        .msg.customer .msg-content { background: \${config.primaryColor}; color: white; }
        .msg.agent .msg-content { background: #f1f1f1; color: #333; }
        #alacarte-input { display: flex; padding: 12px; border-top: 1px solid #eee; }
        #alacarte-input input { flex: 1; border: 1px solid #ddd; border-radius: 20px; padding: 8px 16px; outline: none; }
        #alacarte-input button { margin-left: 8px; background: \${config.primaryColor}; color: white; border: none; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
      </style>
      <div id="alacarte-widget">
        <button id="alacarte-btn" onclick="window.toggleChat()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">\${icon}</svg>
          \${config.showText ? '<span>' + config.buttonText + '</span>' : ''}
        </button>
        <div id="alacarte-window">
          <div id="alacarte-header">
            <span>\${config.greeting}</span>
            <button onclick="window.toggleChat()" style="background:none;border:none;color:white;font-size:24px;cursor:pointer;">×</button>
          </div>
          <div id="alacarte-messages"></div>
          <div id="alacarte-input">
            <input type="text" placeholder="Type a message..." onkeypress="if(event.key==='Enter') window.sendMessage()">
            <button onclick="window.sendMessage()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </div>
      </div>
    \`;
  }

  // Toggle chat window
  window.toggleChat = function() {
    isOpen = !isOpen;
    document.getElementById('alacarte-window').classList.toggle('open', isOpen);
  };

  // Load messages
  async function loadMessages() {
    if (!session) return;
    try {
      const response = await fetch(config.apiUrl + '/embed-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': session.session_token },
        body: JSON.stringify({ action: 'get_messages' })
      });
      const data = await response.json();
      if (data.messages) renderMessages(data.messages);
    } catch (error) {
      console.error('Load messages error:', error);
    }
  }

  // Render messages
  function renderMessages(messages) {
    const container = document.getElementById('alacarte-messages');
    container.innerHTML = messages.map(msg => 
      \`<div class="msg \${msg.direction === 'outbound' ? 'agent' : 'customer'}"><div class="msg-content">\${escapeHtml(msg.content)}</div></div>\`
    ).join('');
    container.scrollTop = container.scrollHeight;
  }

  // Send message
  window.sendMessage = async function() {
    const input = document.querySelector('#alacarte-input input');
    const message = input.value.trim();
    if (!message || !session) return;
    input.value = '';
    
    try {
      await fetch(config.apiUrl + '/embed-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': session.session_token },
        body: JSON.stringify({ action: 'send_message', message })
      });
      loadMessages();
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  // Poll for new messages
  function startPolling() {
    setInterval(() => { if (!isOpen) loadMessages(); }, 3000);
  }

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Start
  init();
})();
</script>`;
  };

  const handleCopyCode = async (presetId: string) => {
    const preset = widgetPresets.find(p => p.id === presetId);
    if (!preset) return;

    // Save preset configuration to database
    try {
      const { error } = await supabase
        .from('widget_customization')
        .upsert({
          business_id: businessId,
          embed_token_id: token.id,
          ...preset.config,
        }, {
          onConflict: 'business_id,embed_token_id'
        });

      if (error) {
        console.error('Error saving widget customization:', error);
      }
    } catch (error) {
      console.error('Error saving widget customization:', error);
    }

    // Generate code
    const code = generateEmbedCode(presetId);
    console.log('[WIDGET COPY] prepared length:', code.length, 'preview:', code.slice(0, 120));

    // Robust copy with fallback (works on Safari/HTTP/Extensions)
    const fallbackCopy = () => {
      const ta = document.createElement('textarea');
      ta.value = code;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(ta);
      }
    };

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        fallbackCopy();
      }
      setCopiedPreset(presetId);
      toast.success("Widget code copied! Paste it on your website to see it live.");
      setTimeout(() => setCopiedPreset(null), 2000);
    } catch (err) {
      fallbackCopy();
      setCopiedPreset(presetId);
      toast.success("Widget code copied! Paste it on your website to see it live.");
      setTimeout(() => setCopiedPreset(null), 2000);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Your Chat Widget Style</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select a pre-made template and copy the code - it's ready to paste on your website!
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {widgetPresets.map((preset) => (
              <Card
                key={preset.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedPreset === preset.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedPreset(preset.id)}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Preview */}
                  <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 h-32 flex items-end justify-end">
                    <div
                      className="rounded-full shadow-lg flex items-center justify-center"
                      style={{
                        backgroundColor: preset.config.primary_color,
                        width: preset.config.widget_size === 'small' ? '48px' : preset.config.widget_size === 'large' ? '72px' : '60px',
                        height: preset.config.widget_size === 'small' ? '48px' : preset.config.widget_size === 'large' ? '72px' : '60px',
                      }}
                    >
                      <span className="text-2xl">{preset.thumbnail}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div>
                    <h4 className="font-semibold text-sm">{preset.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{preset.description}</p>
                  </div>

                  {/* Colors */}
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 w-6 rounded-full border-2"
                      style={{
                        backgroundColor: preset.config.primary_color,
                        borderColor: preset.config.secondary_color,
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {preset.config.show_button_text ? `"${preset.config.button_text}"` : "Icon Only"}
                    </span>
                  </div>

                  {/* Copy Button */}
                  <Button
                    size="sm"
                    className="w-full"
                    variant={selectedPreset === preset.id ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyCode(preset.id);
                    }}
                  >
                    {copiedPreset === preset.id ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Code
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Advanced Customization Option */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold flex items-center gap-2">
                    <Wand2 className="h-4 w-4" />
                    Want to customize further?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Adjust colors, position, messages, and more with our advanced editor
                  </p>
                </div>
                <Button onClick={onCustomize} variant="outline">
                  Open Editor
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2">How to install:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Click "Copy Code" on any template above</li>
                <li>Paste the code before the <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> tag in your HTML</li>
                <li>Save and upload - your chat widget will appear instantly!</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
