import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { CreditBundleDialog } from "@/components/CreditBundleDialog";

const TIER_ORDER = ['free', 'starter', 'professional', 'enterprise'];

const TIER_INFO = {
  free: { name: 'Free', limit: 100, price: 0 },
  starter: { name: 'Starter', limit: 1000, price: 29 },
  professional: { name: 'Professional', limit: 10000, price: 79 },
  enterprise: { name: 'Enterprise', limit: 999999, price: 199 }
};

interface LimitReachedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUsage: number;
  messageLimit: number;
  isFrozen?: boolean;
}

export function LimitReachedModal({ 
  open, 
  onOpenChange, 
  currentUsage, 
  messageLimit,
  isFrozen = false 
}: LimitReachedModalProps) {
  const { subscriptionState } = useAuth();
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState(false);
  const [showCredits, setShowCredits] = useState(false);

  const currentTier = subscriptionState.tier;
  const currentTierIndex = TIER_ORDER.indexOf(currentTier);
  const nextTier = TIER_ORDER[currentTierIndex + 1];
  const nextTierInfo = nextTier ? TIER_INFO[nextTier as keyof typeof TIER_INFO] : null;

  const handleUpgrade = async () => {
    if (!nextTier) return;
    
    setUpgrading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier: nextTier }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpgrading(false);
    }
  };

  const canDismiss = !isFrozen && currentUsage < messageLimit;

  return (
    <>
      <Dialog open={open} onOpenChange={canDismiss ? onOpenChange : undefined}>
        <DialogContent 
          className="max-w-2xl" 
          onPointerDownOutside={(e) => !canDismiss && e.preventDefault()}
          onEscapeKeyDown={(e) => !canDismiss && e.preventDefault()}
        >
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <DialogTitle className="text-2xl">
                  {isFrozen ? 'Account Suspended' : 'Message Limit Reached'}
                </DialogTitle>
                <DialogDescription>
                  {isFrozen 
                    ? 'Your account is suspended due to payment failure'
                    : `You've used ${currentUsage} of ${messageLimit} messages this period`
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Status */}
            <Card className="p-4 bg-muted/50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="text-lg font-semibold capitalize">{TIER_INFO[currentTier as keyof typeof TIER_INFO].name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Usage</p>
                  <p className="text-lg font-semibold">{currentUsage} / {messageLimit}</p>
                </div>
              </div>
            </Card>

            {/* Recommended Upgrade */}
            {nextTierInfo && (
              <Card className="p-4 border-primary bg-primary/5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <p className="font-semibold">Recommended: {nextTierInfo.name}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Upgrade to {nextTierInfo.name} and get {nextTierInfo.limit.toLocaleString()} messages per month
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">${nextTierInfo.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              {nextTierInfo && (
                <Button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  size="lg"
                  className="w-full"
                >
                  {upgrading ? 'Opening Checkout...' : `Upgrade to ${nextTierInfo.name} - $${nextTierInfo.price}/mo`}
                </Button>
              )}
              
              <Button
                onClick={() => setShowCredits(true)}
                variant="outline"
                size="lg"
                className="w-full"
              >
                Buy Credit Bundle Instead
              </Button>

              {canDismiss && (
                <Button
                  onClick={() => onOpenChange(false)}
                  variant="ghost"
                  size="lg"
                  className="w-full"
                >
                  Remind Me Later
                </Button>
              )}
            </div>

            {!canDismiss && (
              <p className="text-xs text-center text-muted-foreground">
                You must upgrade or purchase credits to continue sending messages
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreditBundleDialog 
        open={showCredits} 
        onOpenChange={setShowCredits}
      />
    </>
  );
}
