import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Zap } from "lucide-react";
import { CREDIT_BUNDLES, type CreditBundle } from "@/lib/stripeConfig";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CreditBundleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreditBundleDialog({
  open,
  onOpenChange,
}: CreditBundleDialogProps) {
  const [loadingBundle, setLoadingBundle] = useState<CreditBundle | null>(null);

  const handlePurchase = async (bundleKey: CreditBundle) => {
    setLoadingBundle(bundleKey);

    try {
      const bundle = CREDIT_BUNDLES[bundleKey];
      
      const { data, error } = await supabase.functions.invoke("purchase-credits", {
        body: {
          priceId: bundle.priceId,
          credits: bundle.credits,
        },
      });

      if (error) throw error;

      if (data.url) {
        window.open(data.url, "_blank");
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to purchase credits",
        variant: "destructive",
      });
    } finally {
      setLoadingBundle(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">
            Purchase Message Credits
          </DialogTitle>
          <DialogDescription className="text-center">
            Top up your WhatsApp sending credits to continue messaging
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-4 py-4">
          {Object.entries(CREDIT_BUNDLES).map(([key, bundle]) => {
            const bundleKey = key as CreditBundle;
            const hasSavings = "savings" in bundle;
            return (
              <Card
                key={key}
                className={`p-6 relative ${
                  key === "medium" ? "border-primary border-2" : ""
                }`}
              >
                {hasSavings && (
                  <Badge
                    className="absolute -top-2 right-4 bg-green-500"
                    variant="default"
                  >
                    Save {(bundle as any).savings}%
                  </Badge>
                )}

                <div className="text-center space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">
                      {bundle.name}
                    </h3>
                    <div className="text-3xl font-bold text-primary">
                      {bundle.credits}
                    </div>
                    <p className="text-sm text-muted-foreground">messages</p>
                  </div>

                  <div>
                    <div className="text-2xl font-bold">${bundle.price}</div>
                    <p className="text-xs text-muted-foreground">
                      ${(bundle.price / bundle.credits).toFixed(3)} per message
                    </p>
                  </div>

                  <ul className="space-y-2 text-left">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>No expiration</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>Instant activation</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>Works with any plan</span>
                    </li>
                  </ul>

                  <Button
                    className="w-full"
                    onClick={() => handlePurchase(bundleKey)}
                    disabled={loadingBundle === bundleKey}
                  >
                    {loadingBundle === bundleKey ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Purchase"
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Credits are added to your account immediately after purchase
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
