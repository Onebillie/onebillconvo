import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, DollarSign, MessageSquare, Users } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface PricingTier {
  id: string;
  tier: string;
  display_name: string;
  monthly_price: number;
  message_limit: number;
  seat_limit: number;
  features: string[];
  is_active: boolean;
}

export default function PricingConfig() {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPricingConfig();
  }, []);

  const fetchPricingConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .order('monthly_price', { ascending: true });

      if (error) throw error;
      setTiers((data || []).map(d => ({
        ...d,
        features: Array.isArray(d.features) ? d.features as string[] : []
      })));
    } catch (error) {
      console.error('Error fetching pricing config:', error);
      toast.error('Failed to load pricing configuration');
    } finally {
      setLoading(false);
    }
  };

  const updateTier = async (id: string, updates: Partial<PricingTier>) => {
    try {
      const { error } = await supabase
        .from('pricing_config')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setTiers(tiers.map(t => t.id === id ? { ...t, ...updates } : t));
      toast.success('Pricing updated successfully');
    } catch (error) {
      console.error('Error updating pricing:', error);
      toast.error('Failed to update pricing');
    }
  };

  const saveTier = async (tier: PricingTier) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('pricing_config')
        .update({
          display_name: tier.display_name,
          monthly_price: tier.monthly_price,
          message_limit: tier.message_limit,
          seat_limit: tier.seat_limit,
          features: tier.features,
          is_active: tier.is_active,
        })
        .eq('id', tier.id);

      if (error) throw error;
      toast.success(`${tier.display_name} tier updated successfully`);
    } catch (error) {
      console.error('Error saving tier:', error);
      toast.error('Failed to save tier');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Pricing Configuration</h1>
        <p className="text-muted-foreground">
          Configure pricing tiers, limits, and features for your customers
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {tiers.map((tier) => (
          <Card key={tier.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{tier.display_name}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {tier.tier}
                </span>
              </CardTitle>
              <CardDescription>
                Configure pricing and limits for this tier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`price-${tier.id}`}>
                    <DollarSign className="inline h-4 w-4 mr-1" />
                    Monthly Price (cents)
                  </Label>
                  <Input
                    id={`price-${tier.id}`}
                    type="number"
                    value={tier.monthly_price}
                    onChange={(e) => setTiers(tiers.map(t => 
                      t.id === tier.id ? { ...t, monthly_price: parseInt(e.target.value) } : t
                    ))}
                  />
                  <p className="text-xs text-muted-foreground">
                    ${(tier.monthly_price / 100).toFixed(2)} per month
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`messages-${tier.id}`}>
                    <MessageSquare className="inline h-4 w-4 mr-1" />
                    Message Limit
                  </Label>
                  <Input
                    id={`messages-${tier.id}`}
                    type="number"
                    value={tier.message_limit}
                    onChange={(e) => setTiers(tiers.map(t => 
                      t.id === tier.id ? { ...t, message_limit: parseInt(e.target.value) } : t
                    ))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`seats-${tier.id}`}>
                    <Users className="inline h-4 w-4 mr-1" />
                    Team Seats
                  </Label>
                  <Input
                    id={`seats-${tier.id}`}
                    type="number"
                    value={tier.seat_limit}
                    onChange={(e) => setTiers(tiers.map(t => 
                      t.id === tier.id ? { ...t, seat_limit: parseInt(e.target.value) } : t
                    ))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`features-${tier.id}`}>
                    Features (one per line)
                  </Label>
                  <Textarea
                    id={`features-${tier.id}`}
                    value={tier.features.join('\n')}
                    onChange={(e) => setTiers(tiers.map(t => 
                      t.id === tier.id ? { ...t, features: e.target.value.split('\n').filter(f => f.trim()) } : t
                    ))}
                    rows={4}
                  />
                </div>
              </div>

              <Button
                onClick={() => saveTier(tier)}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
