import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

interface WidgetBehaviorSettingsProps {
  config: any;
  onConfigChange: (config: any) => void;
}

export const WidgetBehaviorSettings = ({
  config,
  onConfigChange,
}: WidgetBehaviorSettingsProps) => {
  const autoOpenEnabled = config.auto_open_delay !== null && config.auto_open_delay !== undefined;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Behavior Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure how your widget behaves
        </p>
      </div>

      <div className="space-y-6">
        {/* Auto-open */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-open Chat</Label>
              <p className="text-xs text-muted-foreground">
                Automatically open the chat after a delay
              </p>
            </div>
            <Switch
              checked={autoOpenEnabled}
              onCheckedChange={(checked) =>
                onConfigChange({
                  ...config,
                  auto_open_delay: checked ? 5000 : null,
                })
              }
            />
          </div>
          {autoOpenEnabled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Delay: {(config.auto_open_delay || 5000) / 1000}s</Label>
              </div>
              <Slider
                value={[(config.auto_open_delay || 5000) / 1000]}
                onValueChange={([value]) =>
                  onConfigChange({ ...config, auto_open_delay: value * 1000 })
                }
                min={3}
                max={30}
                step={1}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Unread Badge */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Show Unread Badge</Label>
            <p className="text-xs text-muted-foreground">
              Display a notification badge for unread messages
            </p>
          </div>
          <Switch
            checked={config.show_unread_badge}
            onCheckedChange={(checked) =>
              onConfigChange({ ...config, show_unread_badge: checked })
            }
          />
        </div>

        {/* Sound Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Sound Notifications</Label>
            <p className="text-xs text-muted-foreground">
              Play a sound when new messages arrive
            </p>
          </div>
          <Switch
            checked={config.sound_notifications}
            onCheckedChange={(checked) =>
              onConfigChange({ ...config, sound_notifications: checked })
            }
          />
        </div>

        {/* Custom CSS */}
        <div className="space-y-2">
          <Label htmlFor="custom_css">Custom CSS (Advanced)</Label>
          <Textarea
            id="custom_css"
            value={config.custom_css || ''}
            onChange={(e) =>
              onConfigChange({ ...config, custom_css: e.target.value })
            }
            placeholder=".widget-button { border-radius: 50%; }"
            rows={5}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Add custom CSS to further customize the widget appearance
          </p>
        </div>
      </div>
    </div>
  );
};
