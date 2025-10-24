import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreditCard, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CREDIT_BUNDLES } from "@/lib/stripeConfig";

interface CreditBundleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreditBundleDialog({ open, onOpenChange }: CreditBundleDialogProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (bundleKey: keyof typeof CREDIT_BUNDLES) => {
    const bundle = CREDIT_BUNDLES[bundleKey];
    setLoading(bundleKey);

    try {
      const { data, error } = await supabase.functions.invoke('purchase-credits', {
        body: { priceId: bundle.priceId, credits: bundle.credits }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate purchase");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Purchase Message Credits
          </DialogTitle>
          <DialogDescription>
            Top up your message credits to continue sending messages
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-3">
          {Object.entries(CREDIT_BUNDLES).map(([key, bundle]) => (
            <Card key={key} className="p-4 hover:border-primary transition-colors">
              <div className="space-y-3">
                <div className="text-center">
                  <h3 className="font-semibold text-lg">{bundle.name}</h3>
                  <div className="text-3xl font-bold text-primary mt-2">
                    ${bundle.price}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {bundle.credits.toLocaleString()} credits
                  </p>
                  {('savings' in bundle) && bundle.savings && (
                    <p className="text-xs text-green-600 font-medium mt-1">
                      Save {bundle.savings}%
                    </p>
                  )}
                </div>
                <Button
                  className="w-full"
                  onClick={() => handlePurchase(key as keyof typeof CREDIT_BUNDLES)}
                  disabled={loading === key}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {loading === key ? "Processing..." : "Purchase"}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Credits expire 1 year from purchase date. Non-refundable.
        </p>
      </DialogContent>
    </Dialog>
  );
}
