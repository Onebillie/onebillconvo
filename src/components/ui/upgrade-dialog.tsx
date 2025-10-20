import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap } from "lucide-react";
import { STRIPE_PRODUCTS, SubscriptionTier } from "@/lib/stripeConfig";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: SubscriptionTier;
}

export function UpgradeDialog({ open, onOpenChange, currentTier }: UpgradeDialogProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (tier: SubscriptionTier) => {
    setLoading(tier);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: STRIPE_PRODUCTS[tier].priceId }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate upgrade");
    } finally {
      setLoading(null);
    }
  };

  const availableTiers = Object.entries(STRIPE_PRODUCTS)
    .filter(([key]) => {
      const tierOrder = { free: 0, starter: 1, professional: 2, enterprise: 3 };
      return tierOrder[key as SubscriptionTier] > tierOrder[currentTier];
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription>
            Unlock more features and higher limits with a premium plan
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {availableTiers.map(([key, plan]) => (
            <Card key={key} className={`p-6 ${plan.popular ? 'border-primary border-2' : ''}`}>
              {plan.popular && (
                <Badge className="mb-2">Most Popular</Badge>
              )}
              <h3 className="text-2xl font-bold">{plan.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/{plan.interval}</span>
              </div>
              
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className="w-full"
                onClick={() => handleUpgrade(key as SubscriptionTier)}
                disabled={loading === key}
              >
                {loading === key ? "Processing..." : "Upgrade Now"}
              </Button>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
