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

    const config = JSON.stringify({
      ...preset.config,
      primary_color: preset.config.primary_color,
      secondary_color: preset.config.secondary_color,
      text_color: preset.config.text_color,
    }, null, 2);

    return `<!-- AlacarteChat Widget - ${preset.name} -->
<script src="https://6e3a8087-ec6e-43e0-a6a1-d8394f40b390.lovableproject.com/embed-widget.js"></script>
<script>
  AlacarteChatWidget.init({
    siteId: '${token.site_id || token.id}',
    apiUrl: 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1'
  });
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
        });

      if (error) {
        console.error('Error saving widget customization:', error);
      }
    } catch (error) {
      console.error('Error saving widget customization:', error);
    }

    // Copy code to clipboard
    const code = generateEmbedCode(presetId);
    navigator.clipboard.writeText(code);
    setCopiedPreset(presetId);
    toast.success("Widget code copied! Paste it on your website to see it live.");
    setTimeout(() => setCopiedPreset(null), 2000);
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
