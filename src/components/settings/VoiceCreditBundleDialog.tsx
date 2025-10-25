import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Phone, Check } from "lucide-react";
import { VOICE_CREDIT_BUNDLES } from "@/lib/stripeConfig";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VoiceCreditBundleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoiceCreditBundleDialog({ open, onOpenChange }: VoiceCreditBundleDialogProps) {
  const [purchasingBundle, setPurchasingBundle] = useState<string | null>(null);

  const handlePurchase = async (bundleKey: keyof typeof VOICE_CREDIT_BUNDLES) => {
    setPurchasingBundle(bundleKey);
    
    try {
      // Get bundle from database
      const { data: bundles } = await supabase
        .from('voice_credit_bundles')
        .select('*')
        .eq('name', VOICE_CREDIT_BUNDLES[bundleKey].name)
        .eq('is_active', true)
        .single();

      if (!bundles) {
        throw new Error('Bundle not found');
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          type: 'voice_credits',
          bundleId: bundles.id
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Failed to initiate purchase');
      setPurchasingBundle(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Purchase Voice Credits
          </DialogTitle>
          <DialogDescription>
            Buy voice calling minutes to make and receive calls. Credits never expire and can be used across all channels.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-3">
          {Object.entries(VOICE_CREDIT_BUNDLES).map(([key, bundle]) => (
            <Card key={key} className="relative overflow-hidden">
              {bundle.savings && (
                <Badge className="absolute top-2 right-2" variant="secondary">
                  Save {bundle.savings}%
                </Badge>
              )}
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{bundle.name}</h3>
                    <p className="text-3xl font-bold mt-2">
                      ${bundle.price}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ${(bundle.price / bundle.minutes).toFixed(3)}/min
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span className="text-sm">{bundle.minutes.toLocaleString()} minutes</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span className="text-sm">Use for inbound & outbound</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span className="text-sm">Credits never expire</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handlePurchase(key as keyof typeof VOICE_CREDIT_BUNDLES)}
                    disabled={purchasingBundle === key}
                    className="w-full"
                  >
                    {purchasingBundle === key ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Purchase'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          All purchases are final and non-refundable. Credits will be added to your account immediately after payment.
        </p>
      </DialogContent>
    </Dialog>
  );
}
