import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, MessageSquare, CheckCircle, Loader2 } from "lucide-react";

interface BusinessPricingConfigProps {
  businessId: string;
}

export function BusinessPricingConfig({ businessId }: BusinessPricingConfigProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    pricing_model: 'per_message' as 'per_message' | 'per_resolution',
    price_per_message: 0.05,
    price_per_resolution: 2.00,
    monthly_base_fee: 0.00
  });

  useEffect(() => {
    fetchConfig();
  }, [businessId]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('pricing_model, price_per_message, price_per_resolution, monthly_base_fee')
        .eq('id', businessId)
        .single();

      if (error) throw error;

      if (data) {
        setConfig({
          pricing_model: (data.pricing_model || 'per_message') as 'per_message' | 'per_resolution',
          price_per_message: parseFloat(String(data.price_per_message || '0.05')),
          price_per_resolution: parseFloat(String(data.price_per_resolution || '2.00')),
          monthly_base_fee: parseFloat(String(data.monthly_base_fee || '0.00'))
        });
      }
    } catch (error) {
      console.error('Error fetching pricing config:', error);
      toast({
        title: "Error",
        description: "Failed to load pricing configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          pricing_model: config.pricing_model,
          price_per_message: config.price_per_message,
          price_per_resolution: config.price_per_resolution,
          monthly_base_fee: config.monthly_base_fee
        })
        .eq('id', businessId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Pricing configuration updated successfully"
      });
    } catch (error) {
      console.error('Error saving pricing config:', error);
      toast({
        title: "Error",
        description: "Failed to save pricing configuration",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Pricing Configuration
        </CardTitle>
        <CardDescription>
          Configure how this business will be charged for using the platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label>Pricing Model</Label>
          <RadioGroup
            value={config.pricing_model}
            onValueChange={(value: 'per_message' | 'per_resolution') => 
              setConfig({ ...config, pricing_model: value })
            }
          >
            <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4">
              <RadioGroupItem value="per_message" id="per_message" />
              <div className="space-y-1 leading-none flex-1">
                <Label htmlFor="per_message" className="flex items-center gap-2 cursor-pointer">
                  <MessageSquare className="h-4 w-4" />
                  Per Message
                </Label>
                <p className="text-sm text-muted-foreground">
                  Charge for each message sent or received
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4">
              <RadioGroupItem value="per_resolution" id="per_resolution" />
              <div className="space-y-1 leading-none flex-1">
                <Label htmlFor="per_resolution" className="flex items-center gap-2 cursor-pointer">
                  <CheckCircle className="h-4 w-4" />
                  Per Resolution
                </Label>
                <p className="text-sm text-muted-foreground">
                  Charge only when a conversation is marked as resolved (closed, sold, etc.)
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price_per_message">Price per Message ($)</Label>
            <Input
              id="price_per_message"
              type="number"
              step="0.01"
              min="0"
              value={config.price_per_message}
              onChange={(e) => setConfig({ 
                ...config, 
                price_per_message: parseFloat(e.target.value) || 0 
              })}
              disabled={config.pricing_model !== 'per_message'}
            />
            <p className="text-xs text-muted-foreground">
              Cost charged for each message when using per-message pricing
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price_per_resolution">Price per Resolution ($)</Label>
            <Input
              id="price_per_resolution"
              type="number"
              step="0.01"
              min="0"
              value={config.price_per_resolution}
              onChange={(e) => setConfig({ 
                ...config, 
                price_per_resolution: parseFloat(e.target.value) || 0 
              })}
              disabled={config.pricing_model !== 'per_resolution'}
            />
            <p className="text-xs text-muted-foreground">
              Cost charged when a conversation is resolved
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthly_base_fee">Monthly Base Fee ($)</Label>
          <Input
            id="monthly_base_fee"
            type="number"
            step="0.01"
            min="0"
            value={config.monthly_base_fee}
            onChange={(e) => setConfig({ 
              ...config, 
              monthly_base_fee: parseFloat(e.target.value) || 0 
            })}
          />
          <p className="text-xs text-muted-foreground">
            Fixed monthly fee charged regardless of usage (optional)
          </p>
        </div>

        <div className="pt-4 border-t">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">Current Configuration</h4>
            <div className="text-sm space-y-1">
              <p>
                <span className="font-medium">Model:</span>{' '}
                {config.pricing_model === 'per_message' ? 'Per Message' : 'Per Resolution'}
              </p>
              <p>
                <span className="font-medium">Base Fee:</span> ${config.monthly_base_fee.toFixed(2)}/month
              </p>
              {config.pricing_model === 'per_message' && (
                <p>
                  <span className="font-medium">Message Rate:</span> ${config.price_per_message.toFixed(4)}/message
                </p>
              )}
              {config.pricing_model === 'per_resolution' && (
                <p>
                  <span className="font-medium">Resolution Rate:</span> ${config.price_per_resolution.toFixed(2)}/resolution
                </p>
              )}
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Configuration
        </Button>
      </CardContent>
    </Card>
  );
}
