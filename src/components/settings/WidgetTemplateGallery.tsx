import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { widgetPresets, WidgetPreset } from "@/lib/widgetPresets";
import { Check } from "lucide-react";

interface WidgetTemplateGalleryProps {
  selectedPreset: string | null;
  onSelectPreset: (preset: WidgetPreset) => void;
}

export const WidgetTemplateGallery = ({
  selectedPreset,
  onSelectPreset,
}: WidgetTemplateGalleryProps) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Your Widget Style</h3>
        <p className="text-sm text-muted-foreground">
          Select a template to get started, then customize it to match your brand.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgetPresets.map((preset) => (
          <Card
            key={preset.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedPreset === preset.id
                ? "ring-2 ring-primary"
                : "hover:ring-1 hover:ring-primary/50"
            }`}
            onClick={() => onSelectPreset(preset)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="text-4xl">{preset.thumbnail}</div>
                {selectedPreset === preset.id && (
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <h4 className="font-semibold mb-1">{preset.name}</h4>
              <p className="text-xs text-muted-foreground mb-3">
                {preset.description}
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="h-6 w-6 rounded-full border-2"
                  style={{
                    backgroundColor: preset.config.primary_color,
                    borderColor: preset.config.secondary_color,
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  {preset.config.show_button_text ? "With Text" : "Icon Only"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
