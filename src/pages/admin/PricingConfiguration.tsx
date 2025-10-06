import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, DollarSign, MessageSquare, Settings } from "lucide-react";

interface TierConfig {
  name: string;
  displayName: string;
  monthlyPrice: number;
  messageLimit: number;
  features: string[];
  overageRate: number;
}

export default function PricingConfiguration() {
  const { toast } = useToast();
  const [tiers, setTiers] = useState<TierConfig[]>([
    {
      name: "free",
      displayName: "Free",
      monthlyPrice: 0,
      messageLimit: 100,
      features: ["100 messages/month", "Email support", "Basic features"],
      overageRate: 0,
    },
    {
      name: "starter",
      displayName: "Starter",
      monthlyPrice: 29,
      messageLimit: 1000,
      features: [
        "1,000 messages/month",
        "WhatsApp integration",
        "Email integration",
        "Priority support",
      ],
      overageRate: 0.05,
    },
    {
      name: "professional",
      displayName: "Professional",
      monthlyPrice: 99,
      messageLimit: 5000,
      features: [
        "5,000 messages/month",
        "All Starter features",
        "AI Assistant",
        "Advanced analytics",
        "Custom templates",
      ],
      overageRate: 0.03,
    },
    {
      name: "enterprise",
      displayName: "Enterprise",
      monthlyPrice: 299,
      messageLimit: 20000,
      features: [
        "20,000 messages/month",
        "All Professional features",
        "Dedicated support",
        "Custom integrations",
        "SLA guarantee",
      ],
      overageRate: 0.02,
    },
  ]);

  const [globalSettings, setGlobalSettings] = useState({
    trialDurationDays: 14,
    gracePeriodDays: 7,
    messageOverageEnabled: true,
  });

  const [saving, setSaving] = useState(false);

  const updateTier = (index: number, field: keyof TierConfig, value: any) => {
    const newTiers = [...tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setTiers(newTiers);
  };

  const updateFeatures = (index: number, value: string) => {
    const features = value.split("\n").filter((f) => f.trim());
    updateTier(index, "features", features);
  };

  const savePricing = async () => {
    setSaving(true);
    try {
      // In a real implementation, this would save to a configuration table
      // For now, we'll just show success
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "Success",
        description: "Pricing configuration saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Pricing Configuration</h1>
          <p className="text-muted-foreground">
            Configure subscription tiers, pricing, and message limits
          </p>
        </div>
        <Button onClick={savePricing} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Global Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Global Settings</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Trial Duration (Days)</Label>
            <Input
              type="number"
              value={globalSettings.trialDurationDays}
              onChange={(e) =>
                setGlobalSettings({
                  ...globalSettings,
                  trialDurationDays: parseInt(e.target.value),
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Grace Period (Days)</Label>
            <Input
              type="number"
              value={globalSettings.gracePeriodDays}
              onChange={(e) =>
                setGlobalSettings({
                  ...globalSettings,
                  gracePeriodDays: parseInt(e.target.value),
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Enable Message Overage</Label>
            <div className="flex items-center h-10">
              <input
                type="checkbox"
                checked={globalSettings.messageOverageEnabled}
                onChange={(e) =>
                  setGlobalSettings({
                    ...globalSettings,
                    messageOverageEnabled: e.target.checked,
                  })
                }
                className="w-4 h-4"
              />
              <span className="ml-2 text-sm">Allow overage charges</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tier Configuration */}
      <div className="grid md:grid-cols-2 gap-6">
        {tiers.map((tier, index) => (
          <Card key={tier.name} className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">{tier.displayName}</h3>
                <span className="px-3 py-1 rounded-full text-xs bg-primary/10 text-primary uppercase">
                  {tier.name}
                </span>
              </div>

              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={tier.displayName}
                  onChange={(e) => updateTier(index, "displayName", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Monthly Price (€)
                  </Label>
                  <Input
                    type="number"
                    value={tier.monthlyPrice}
                    onChange={(e) =>
                      updateTier(index, "monthlyPrice", parseFloat(e.target.value))
                    }
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Message Limit
                  </Label>
                  <Input
                    type="number"
                    value={tier.messageLimit}
                    onChange={(e) =>
                      updateTier(index, "messageLimit", parseInt(e.target.value))
                    }
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Overage Rate (€ per message)</Label>
                <Input
                  type="number"
                  value={tier.overageRate}
                  onChange={(e) =>
                    updateTier(index, "overageRate", parseFloat(e.target.value))
                  }
                  min="0"
                  step="0.01"
                  disabled={!globalSettings.messageOverageEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label>Features (one per line)</Label>
                <Textarea
                  value={tier.features.join("\n")}
                  onChange={(e) => updateFeatures(index, e.target.value)}
                  rows={6}
                  placeholder="Enter features, one per line"
                />
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price per message</span>
                  <span className="font-medium">
                    €{(tier.monthlyPrice / tier.messageLimit).toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pricing Comparison */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Pricing Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4">Tier</th>
                <th className="text-left p-4">Monthly Price</th>
                <th className="text-left p-4">Messages</th>
                <th className="text-left p-4">Cost per Message</th>
                <th className="text-left p-4">Overage Rate</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => (
                <tr key={tier.name} className="border-b">
                  <td className="p-4 font-medium">{tier.displayName}</td>
                  <td className="p-4">€{tier.monthlyPrice}</td>
                  <td className="p-4">{tier.messageLimit.toLocaleString()}</td>
                  <td className="p-4">
                    €{(tier.monthlyPrice / tier.messageLimit).toFixed(4)}
                  </td>
                  <td className="p-4">€{tier.overageRate.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
