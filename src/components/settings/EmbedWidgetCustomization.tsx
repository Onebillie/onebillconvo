import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    custom_css: ''
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
      setCustomization({
        primary_color: data.primary_color || '#6366f1',
        secondary_color: data.secondary_color || '#8b5cf6',
        text_color: data.text_color || '#000000',
        widget_position: data.widget_position || 'bottom-right',
        greeting_message: data.greeting_message || 'Hello! How can we help you today?',
        offline_message: data.offline_message || "We're currently offline. Leave a message!",
        custom_css: data.custom_css || ''
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('embed_customizations')
      .upsert({ 
        business_id: businessId,
        primary_color: customization.primary_color,
        secondary_color: customization.secondary_color,
        text_color: customization.text_color,
        widget_position: customization.widget_position,
        greeting_message: customization.greeting_message,
        offline_message: customization.offline_message,
        custom_css: customization.custom_css
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Widget customization saved and applied" });
    }
    setLoading(false);
  };

  return (
    <Card className="p-6">
      <Tabs defaultValue="appearance">
        <TabsList>
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
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <div>
            <Label>Greeting Message</Label>
            <Textarea value={customization.greeting_message} 
              onChange={(e) => setCustomization({...customization, greeting_message: e.target.value})} />
          </div>
          
          <div>
            <Label>Offline Message</Label>
            <Textarea value={customization.offline_message} 
              onChange={(e) => setCustomization({...customization, offline_message: e.target.value})} />
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <div>
            <Label>Custom CSS</Label>
            <Textarea value={customization.custom_css} placeholder="Add custom styles..."
              onChange={(e) => setCustomization({...customization, custom_css: e.target.value})} rows={8} />
          </div>
        </TabsContent>
      </Tabs>

      <Button onClick={handleSave} disabled={loading} className="mt-4">
        {loading ? "Saving..." : "Save Changes"}
      </Button>
    </Card>
  );
}
