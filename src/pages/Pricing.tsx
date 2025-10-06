import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { STRIPE_PRODUCTS, type SubscriptionTier } from "@/lib/stripeConfig";

export default function Pricing() {
  const { user, subscriptionState } = useAuth();
  const navigate = useNavigate();
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoadingTier(tier);

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          priceId: STRIPE_PRODUCTS[tier].priceId,
          quantity: 1,
        },
      });

      if (error) throw error;

      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setLoadingTier(null);
    }
  };

  const isCurrentPlan = (tier: SubscriptionTier) => {
    return subscriptionState.tier === tier && subscriptionState.subscribed;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground">
            Select the perfect plan for your business needs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {Object.entries(STRIPE_PRODUCTS).map(([tier, config]) => (
            <Card
              key={tier}
              className={`relative p-8 rounded-xl transition-all hover:shadow-xl ${
                isCurrentPlan(tier as SubscriptionTier)
                  ? "border-primary border-2 shadow-lg"
                  : "border"
              }`}
            >
              {isCurrentPlan(tier as SubscriptionTier) && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  Your Plan
                </Badge>
              )}
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-4">{config.name}</h3>
                <div className="mb-2">
                  <span className="text-5xl font-bold text-foreground">
                    ${config.price}
                  </span>
                  <span className="text-muted-foreground text-lg">/{config.interval}</span>
                </div>
                <p className="text-sm text-muted-foreground">per seat</p>
              </div>

              <ul className="space-y-3 mb-8">
                {config.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full rounded-lg py-6 text-base font-medium bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90"
                size="lg"
                disabled={isCurrentPlan(tier as SubscriptionTier) || loadingTier === tier}
                onClick={() => handleSubscribe(tier as SubscriptionTier)}
              >
                {loadingTier === tier ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : isCurrentPlan(tier as SubscriptionTier) ? (
                  "Current Plan"
                ) : (
                  "Subscribe"
                )}
              </Button>
            </Card>
          ))}
        </div>

        {user && (
          <div className="text-center mt-8">
            <Button variant="ghost" onClick={() => navigate("/app/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
