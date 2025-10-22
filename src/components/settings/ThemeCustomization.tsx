import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useThemePreferences } from '@/hooks/useThemePreferences';
import { Palette, RotateCcw, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ThemeCustomizationProps {
  businessId: string;
}

const hslToHex = (hsl: string): string => {
  const [h, s, l] = hsl.split(' ').map((v, i) => {
    if (i === 0) return parseFloat(v);
    return parseFloat(v.replace('%', '')) / 100;
  });
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  
  const r = Math.round(hue2rgb(p, q, h / 360 + 1/3) * 255);
  const g = Math.round(hue2rgb(p, q, h / 360) * 255);
  const b = Math.round(hue2rgb(p, q, h / 360 - 1/3) * 255);
  
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
};

const hexToHsl = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

export const ThemeCustomization = ({ businessId }: ThemeCustomizationProps) => {
  const { theme, loading, saveTheme, resetTheme } = useThemePreferences(businessId);
  const [saving, setSaving] = useState(false);

  const handleColorChange = async (key: keyof typeof theme, value: string) => {
    setSaving(true);
    const hslValue = hexToHsl(value);
    await saveTheme({ [key]: hslValue });
    setSaving(false);
  };

  const handleReset = async () => {
    setSaving(true);
    await resetTheme();
    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme Customization
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Theme Customization
        </CardTitle>
        <CardDescription>
          Customize the colors of your dashboard and conversation panes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="primary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="primary">Primary</TabsTrigger>
            <TabsTrigger value="interface">Interface</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="primary" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary">Primary Color</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="primary"
                    type="color"
                    value={hslToHex(theme.primary_color)}
                    onChange={(e) => handleColorChange('primary_color', e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                    disabled={saving}
                  />
                  <span className="text-sm text-muted-foreground">{theme.primary_color}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primary-fg">Primary Text Color</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="primary-fg"
                    type="color"
                    value={hslToHex(theme.primary_foreground)}
                    onChange={(e) => handleColorChange('primary_foreground', e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                    disabled={saving}
                  />
                  <span className="text-sm text-muted-foreground">{theme.primary_foreground}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accent">Accent Color</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="accent"
                    type="color"
                    value={hslToHex(theme.accent_color)}
                    onChange={(e) => handleColorChange('accent_color', e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                    disabled={saving}
                  />
                  <span className="text-sm text-muted-foreground">{theme.accent_color}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accent-fg">Accent Text Color</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="accent-fg"
                    type="color"
                    value={hslToHex(theme.accent_foreground)}
                    onChange={(e) => handleColorChange('accent_foreground', e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                    disabled={saving}
                  />
                  <span className="text-sm text-muted-foreground">{theme.accent_foreground}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="interface" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="background">Background Color</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="background"
                    type="color"
                    value={hslToHex(theme.background_color)}
                    onChange={(e) => handleColorChange('background_color', e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                    disabled={saving}
                  />
                  <span className="text-sm text-muted-foreground">{theme.background_color}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="foreground">Text Color</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="foreground"
                    type="color"
                    value={hslToHex(theme.foreground_color)}
                    onChange={(e) => handleColorChange('foreground_color', e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                    disabled={saving}
                  />
                  <span className="text-sm text-muted-foreground">{theme.foreground_color}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="card">Card Background</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="card"
                    type="color"
                    value={hslToHex(theme.card_color)}
                    onChange={(e) => handleColorChange('card_color', e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                    disabled={saving}
                  />
                  <span className="text-sm text-muted-foreground">{theme.card_color}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="card-fg">Card Text</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="card-fg"
                    type="color"
                    value={hslToHex(theme.card_foreground)}
                    onChange={(e) => handleColorChange('card_foreground', e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                    disabled={saving}
                  />
                  <span className="text-sm text-muted-foreground">{theme.card_foreground}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="secondary">Secondary Color</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="secondary"
                    type="color"
                    value={hslToHex(theme.secondary_color)}
                    onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                    disabled={saving}
                  />
                  <span className="text-sm text-muted-foreground">{theme.secondary_color}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="muted">Muted Color</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="muted"
                    type="color"
                    value={hslToHex(theme.muted_color)}
                    onChange={(e) => handleColorChange('muted_color', e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                    disabled={saving}
                  />
                  <span className="text-sm text-muted-foreground">{theme.muted_color}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="muted-fg">Muted Text</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="muted-fg"
                    type="color"
                    value={hslToHex(theme.muted_foreground)}
                    onChange={(e) => handleColorChange('muted_foreground', e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                    disabled={saving}
                  />
                  <span className="text-sm text-muted-foreground">{theme.muted_foreground}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="border">Border Color</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="border"
                    type="color"
                    value={hslToHex(theme.border_color)}
                    onChange={(e) => handleColorChange('border_color', e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                    disabled={saving}
                  />
                  <span className="text-sm text-muted-foreground">{theme.border_color}</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          
          {saving && (
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </span>
          )}
        </div>

        {/* Preview */}
        <div className="space-y-3 p-4 border rounded-lg">
          <p className="text-sm font-medium">Preview</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" size="sm">Primary</Button>
            <Button variant="secondary" size="sm">Secondary</Button>
            <Button variant="outline" size="sm">Outline</Button>
            <Button variant="ghost" size="sm">Ghost</Button>
          </div>
          <div className="p-3 bg-card border rounded">
            <p className="text-card-foreground text-sm">Card with text</p>
          </div>
          <div className="p-3 bg-muted rounded">
            <p className="text-muted-foreground text-sm">Muted background</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
