import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { widgetIcons } from "@/lib/widgetIcons";
import { Check } from "lucide-react";

interface WidgetAppearanceEditorProps {
  config: any;
  onConfigChange: (config: any) => void;
}

export const WidgetAppearanceEditor = ({
  config,
  onConfigChange,
}: WidgetAppearanceEditorProps) => {
  const positions = [
    { id: 'top-left', label: 'Top Left' },
    { id: 'top-center', label: 'Top Center' },
    { id: 'top-right', label: 'Top Right' },
    { id: 'bottom-left', label: 'Bottom Left' },
    { id: 'bottom-center', label: 'Bottom Center' },
    { id: 'bottom-right', label: 'Bottom Right' },
  ];

  const sizes = [
    { id: 'small', label: 'Small', size: '48px' },
    { id: 'medium', label: 'Medium', size: '60px' },
    { id: 'large', label: 'Large', size: '80px' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Customize Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Fine-tune colors, position, size, and icon
        </p>
      </div>

      {/* Colors */}
      <div className="space-y-4">
        <h4 className="font-medium">Colors</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primary_color">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id="primary_color"
                type="color"
                value={config.primary_color}
                onChange={(e) =>
                  onConfigChange({ ...config, primary_color: e.target.value })
                }
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                type="text"
                value={config.primary_color}
                onChange={(e) =>
                  onConfigChange({ ...config, primary_color: e.target.value })
                }
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondary_color">Secondary Color</Label>
            <div className="flex gap-2">
              <Input
                id="secondary_color"
                type="color"
                value={config.secondary_color}
                onChange={(e) =>
                  onConfigChange({ ...config, secondary_color: e.target.value })
                }
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                type="text"
                value={config.secondary_color}
                onChange={(e) =>
                  onConfigChange({ ...config, secondary_color: e.target.value })
                }
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="text_color">Text Color</Label>
            <div className="flex gap-2">
              <Input
                id="text_color"
                type="color"
                value={config.text_color}
                onChange={(e) =>
                  onConfigChange({ ...config, text_color: e.target.value })
                }
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                type="text"
                value={config.text_color}
                onChange={(e) =>
                  onConfigChange({ ...config, text_color: e.target.value })
                }
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Icon Selection */}
      <div className="space-y-4">
        <h4 className="font-medium">Widget Icon</h4>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {widgetIcons.map((icon) => (
            <Button
              key={icon.id}
              variant={config.icon_type === icon.id ? "default" : "outline"}
              className="h-16 relative"
              onClick={() =>
                onConfigChange({ ...config, icon_type: icon.id })
              }
              title={icon.name}
            >
              <icon.Icon className="h-6 w-6" />
              {config.icon_type === icon.id && (
                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div className="space-y-4">
        <h4 className="font-medium">Widget Size</h4>
        <div className="grid grid-cols-3 gap-4">
          {sizes.map((size) => (
            <Card
              key={size.id}
              className={`cursor-pointer transition-all ${
                config.widget_size === size.id
                  ? "ring-2 ring-primary"
                  : "hover:ring-1 hover:ring-primary/50"
              }`}
              onClick={() =>
                onConfigChange({ ...config, widget_size: size.id })
              }
            >
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <div
                  className="rounded-full border-2"
                  style={{
                    width: size.size,
                    height: size.size,
                    backgroundColor: config.primary_color,
                    borderColor: config.secondary_color,
                  }}
                />
                <span className="text-sm font-medium">{size.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Position */}
      <div className="space-y-4">
        <h4 className="font-medium">Widget Position</h4>
        <div className="grid grid-cols-3 gap-3">
          {positions.map((position) => (
            <Button
              key={position.id}
              variant={config.widget_position === position.id ? "default" : "outline"}
              onClick={() =>
                onConfigChange({ ...config, widget_position: position.id })
              }
            >
              {position.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Button Text */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Button Text</h4>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.show_button_text}
              onChange={(e) =>
                onConfigChange({ ...config, show_button_text: e.target.checked })
              }
              className="rounded"
            />
            Show text
          </label>
        </div>
        {config.show_button_text && (
          <Input
            value={config.button_text}
            onChange={(e) =>
              onConfigChange({ ...config, button_text: e.target.value })
            }
            placeholder="e.g., Chat With Us"
          />
        )}
      </div>
    </div>
  );
};
