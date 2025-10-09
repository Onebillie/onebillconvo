import { useState, useEffect } from "react";
import { AlertCircle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PRODUCTS, type SubscriptionTier } from "@/lib/stripeConfig";
import { toast } from "@/hooks/use-toast";

export const PendingPaymentBanner = () => {
  const [pendingSubscription, setPendingSubscription] = useState<{
    id: string;
    selected_plan: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkPendingSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('pending_subscriptions')
        .select('id, selected_plan')
        .eq('user_id', user.id)
        .eq('completed', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setPendingSubscription(data);
      }
    };

    checkPendingSubscription();
  }, []);

  const handleCompletePayment = async () => {
    if (!pendingSubscription) return;

    setLoading(true);
    try {
      const tier = pendingSubscription.selected_plan as SubscriptionTier;
      const product = STRIPE_PRODUCTS[tier];

      if (!product) {
        throw new Error('Invalid plan selected');
      }

      // Create Stripe checkout session
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          priceId: product.priceId,
          quantity: 1,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Update pending subscription with session ID
        await supabase
          .from('pending_subscriptions')
          .update({ stripe_session_id: data.sessionId })
          .eq('id', pendingSubscription.id);

        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!pendingSubscription) return null;

  const planName = STRIPE_PRODUCTS[pendingSubscription.selected_plan as SubscriptionTier]?.name || pendingSubscription.selected_plan;

  return (
    <Alert variant="default" className="border-primary bg-primary/5">
      <AlertCircle className="h-4 w-4 text-primary" />
      <AlertTitle className="text-primary">Complete Your Subscription</AlertTitle>
      <AlertDescription className="mt-2">
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            You selected the <strong>{planName}</strong> plan but haven't completed payment yet.
            Click below to finish setting up your subscription.
          </p>
          <Button
            onClick={handleCompletePayment}
            disabled={loading}
            className="w-fit gap-2"
          >
            <CreditCard className="w-4 h-4" />
            {loading ? "Processing..." : "Complete Payment"}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
