import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function EmbedWidgetCustomization({ businessId }: { businessId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customization, setCustomization] = useState({
    primary_color: '#6366f1',
    secondary_color: '#8b5cf6',
    text_color: '#000000',
    widget_position: 'bottom-right',
    greeting_message: 'Hello! How can we help you today?',
    offline_message: "We're currently offline. Leave a message!",
    custom_css: '',
    sizing_mode: 'responsive' as 'fixed' | 'responsive' | 'fullscreen' | 'custom',
    layout_mode: 'floating' as 'floating' | 'embedded' | 'fullscreen' | 'sidebar',
    mobile_width: '100%',
    mobile_height: '100vh',
    tablet_width: '400px',
    tablet_height: '600px',
    desktop_width: '450px',
    desktop_height: '700px',
    custom_width: '380px',
    custom_height: '600px',
    max_width: '100vw',
    max_height: '100vh',
    min_width: '300px',
    min_height: '400px',
    enable_mobile_fullscreen: true,
    hide_header_on_mobile: false,
  });

  useEffect(() => {
    loadCustomization();
  }, [businessId]);

  const loadCustomization = async () => {
    const { data } = await supabase
      .from('embed_customizations')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();

    if (data) {
      setCustomization(prev => ({ 
        ...prev, 
        primary_color: data.primary_color || prev.primary_color,
        secondary_color: data.secondary_color || prev.secondary_color,
        text_color: data.text_color || prev.text_color,
        widget_position: data.widget_position || prev.widget_position,
        greeting_message: data.greeting_message || prev.greeting_message,
        offline_message: data.offline_message || prev.offline_message,
        custom_css: data.custom_css || prev.custom_css,
        sizing_mode: (data.sizing_mode as 'fixed' | 'responsive' | 'fullscreen' | 'custom') || prev.sizing_mode,
        layout_mode: (data.layout_mode as 'floating' | 'embedded' | 'fullscreen' | 'sidebar') || prev.layout_mode,
        mobile_width: data.mobile_width || prev.mobile_width,
        mobile_height: data.mobile_height || prev.mobile_height,
        tablet_width: data.tablet_width || prev.tablet_width,
        tablet_height: data.tablet_height || prev.tablet_height,
        desktop_width: data.desktop_width || prev.desktop_width,
        desktop_height: data.desktop_height || prev.desktop_height,
        custom_width: data.custom_width || prev.custom_width,
        custom_height: data.custom_height || prev.custom_height,
        max_width: data.max_width || prev.max_width,
        max_height: data.max_height || prev.max_height,
        min_width: data.min_width || prev.min_width,
        min_height: data.min_height || prev.min_height,
        enable_mobile_fullscreen: data.enable_mobile_fullscreen ?? prev.enable_mobile_fullscreen,
        hide_header_on_mobile: data.hide_header_on_mobile ?? prev.hide_header_on_mobile,
      }));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('embed_customizations')
        .upsert({ 
          business_id: businessId, 
          ...customization 
        });

      if (error) throw error;
      toast({ title: "Saved!", description: "Widget customization updated successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Widget Customization</h3>
      
      <Tabs defaultValue="appearance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-4">
          <div>
            <Label>Primary Color</Label>
            <Input type="color" value={customization.primary_color} 
              onChange={(e) => setCustomization({...customization, primary_color: e.target.value})} />
          </div>
          
          <div>
            <Label>Secondary Color</Label>
            <Input type="color" value={customization.secondary_color} 
              onChange={(e) => setCustomization({...customization, secondary_color: e.target.value})} />
          </div>

          <div>
            <Label>Text Color</Label>
            <Input type="color" value={customization.text_color} 
              onChange={(e) => setCustomization({...customization, text_color: e.target.value})} />
          </div>
          
          <div>
            <Label>Widget Position</Label>
            <Select value={customization.widget_position} 
              onValueChange={(val) => setCustomization({...customization, widget_position: val})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-right">Bottom Right</SelectItem>
                <SelectItem value="bottom-left">Bottom Left</SelectItem>
                <SelectItem value="top-right">Top Right</SelectItem>
                <SelectItem value="top-left">Top Left</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Layout Mode</Label>
            <Select value={customization.layout_mode} onValueChange={(value) => setCustomization({ ...customization, layout_mode: value as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="floating">Floating Widget</SelectItem>
                <SelectItem value="embedded">Embedded (Inline)</SelectItem>
                <SelectItem value="fullscreen">Fullscreen</SelectItem>
                <SelectItem value="sidebar">Sidebar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sizing Mode</Label>
            <Select value={customization.sizing_mode} onValueChange={(value) => setCustomization({ ...customization, sizing_mode: value as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="responsive">Responsive (Recommended)</SelectItem>
                <SelectItem value="fixed">Fixed Size</SelectItem>
                <SelectItem value="fullscreen">Fullscreen</SelectItem>
                <SelectItem value="custom">Custom Breakpoints</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {customization.sizing_mode === 'responsive' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Desktop Width</Label><Input value={customization.desktop_width} onChange={(e) => setCustomization({ ...customization, desktop_width: e.target.value })} /></div>
                <div><Label>Desktop Height</Label><Input value={customization.desktop_height} onChange={(e) => setCustomization({ ...customization, desktop_height: e.target.value })} /></div>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="mobile-fullscreen" checked={customization.enable_mobile_fullscreen} onChange={(e) => setCustomization({ ...customization, enable_mobile_fullscreen: e.target.checked })} className="rounded" />
                <Label htmlFor="mobile-fullscreen">Mobile Fullscreen</Label>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <div><Label>Greeting Message</Label><Textarea value={customization.greeting_message} onChange={(e) => setCustomization({...customization, greeting_message: e.target.value})} /></div>
          <div><Label>Offline Message</Label><Textarea value={customization.offline_message} onChange={(e) => setCustomization({...customization, offline_message: e.target.value})} /></div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <div><Label>Custom CSS</Label><Textarea value={customization.custom_css} onChange={(e) => setCustomization({...customization, custom_css: e.target.value})} rows={8} /></div>
        </TabsContent>
      </Tabs>

      <Button onClick={handleSave} disabled={loading} className="mt-4">{loading ? "Saving..." : "Save Changes"}</Button>
    </Card>
  );
}
