import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Sparkles } from "lucide-react";
import { STRIPE_PRODUCTS, type SubscriptionTier } from "@/lib/stripeConfig";
import { useNavigate } from "react-router-dom";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  requiredTier?: SubscriptionTier;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  feature,
  requiredTier = "starter",
}: UpgradeDialogProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = () => {
    setIsLoading(true);
    navigate("/pricing");
  };

  const tierConfig = STRIPE_PRODUCTS[requiredTier];

  const getIcon = (tier: SubscriptionTier) => {
    switch (tier) {
      case "starter":
        return <Zap className="w-5 h-5" />;
      case "professional":
        return <Crown className="w-5 h-5" />;
      case "enterprise":
        return <Sparkles className="w-5 h-5" />;
      default:
        return <Crown className="w-5 h-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4">
            {getIcon(requiredTier)}
          </div>
          <DialogTitle className="text-center text-2xl">
            Upgrade to {tierConfig.name}
          </DialogTitle>
          <DialogDescription className="text-center">
            Unlock <strong>{feature}</strong> and more premium features
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <div className="text-center">
              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="text-4xl font-bold">${tierConfig.price}</span>
                <span className="text-muted-foreground">/{tierConfig.interval}</span>
              </div>
              <p className="text-sm text-muted-foreground">per seat</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Includes:</p>
              <ul className="space-y-2">
                {tierConfig.features.slice(0, 4).map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {tierConfig.features.length > 4 && (
                <p className="text-xs text-muted-foreground mt-2">
                  + {tierConfig.features.length - 4} more features
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Button
              className="w-full"
              size="lg"
              onClick={handleUpgrade}
              disabled={isLoading}
            >
              Upgrade Now
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Maybe Later
            </Button>
          </div>

          {requiredTier === "free" && (
            <div className="text-center">
              <Badge variant="secondary" className="text-xs">
                No credit card required
              </Badge>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
