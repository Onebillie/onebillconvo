import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { STRIPE_PRODUCTS, type SubscriptionTier } from "@/lib/stripeConfig";
import { UpgradeDialog } from "@/components/ui/upgrade-dialog";

type FeatureKey = keyof typeof STRIPE_PRODUCTS[SubscriptionTier]["limits"];

export function useFeatureGate() {
  const { subscriptionState } = useAuth();
  const [upgradeDialog, setUpgradeDialog] = useState<{
    open: boolean;
    feature: string;
    requiredTier: SubscriptionTier;
  }>({
    open: false,
    feature: "",
    requiredTier: "starter",
  });

  const currentTier = (subscriptionState.tier || "free") as SubscriptionTier;

  const canAccess = (feature: FeatureKey): boolean => {
    const limits = STRIPE_PRODUCTS[currentTier].limits;
    const featureValue = limits[feature];
    
    if (typeof featureValue === "boolean") {
      return featureValue;
    }
    
    if (typeof featureValue === "number") {
      return featureValue > 0;
    }
    
    return false;
  };

  const getUsageLimit = (feature: FeatureKey): number | null => {
    const limits = STRIPE_PRODUCTS[currentTier].limits;
    const featureValue = limits[feature];
    
    if (typeof featureValue === "number") {
      return featureValue;
    }
    
    return null;
  };

  const requireFeature = (
    feature: string,
    featureKey: FeatureKey,
    requiredTier: SubscriptionTier = "starter"
  ): boolean => {
    if (!canAccess(featureKey)) {
      setUpgradeDialog({
        open: true,
        feature,
        requiredTier,
      });
      return false;
    }
    return true;
  };

  const checkMessageLimit = (currentCount: number): boolean => {
    const limit = getUsageLimit("whatsappSending");
    if (limit === null || limit === 999999) return true;
    
    if (currentCount >= limit) {
      setUpgradeDialog({
        open: true,
        feature: "Additional WhatsApp Messages",
        requiredTier: currentTier === "free" ? "starter" : "professional",
      });
      return false;
    }
    return true;
  };

  const UpgradePrompt = () => (
    <UpgradeDialog
      open={upgradeDialog.open}
      onOpenChange={(open) =>
        setUpgradeDialog((prev) => ({ ...prev, open }))
      }
      currentTier={currentTier}
    />
  );

  return {
    currentTier,
    canAccess,
    requireFeature,
    getUsageLimit,
    checkMessageLimit,
    UpgradePrompt,
  };
}
