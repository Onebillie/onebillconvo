import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { STRIPE_PRODUCTS, type SubscriptionTier, getLocalizedPrice, formatPrice } from "@/lib/stripeConfig";
import { useCountryPricing } from "@/hooks/useCountryPricing";

export default function Pricing() {
  const { user, subscriptionState } = useAuth();
  const navigate = useNavigate();
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);
  const { countryInfo, loading: countryLoading } = useCountryPricing();

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!user) {
      navigate("/signup");
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
          {!countryLoading && countryInfo.currency !== "USD" && (
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
              <Globe className="w-4 h-4" />
              <span>
                Pricing shown in {countryInfo.currency} for {countryInfo.country}
              </span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {Object.entries(STRIPE_PRODUCTS).map(([tier, config]) => (
            <Card
              key={tier}
              className={`relative p-8 rounded-xl transition-all hover:shadow-xl ${
                config.popular
                  ? "border-primary border-2 shadow-2xl scale-105"
                  : isCurrentPlan(tier as SubscriptionTier)
                  ? "border-primary border-2 shadow-lg"
                  : "border"
              }`}
            >
              {config.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-pink-500">
                  Most Popular
                </Badge>
              )}
              {isCurrentPlan(tier as SubscriptionTier) && !config.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  Your Plan
                </Badge>
              )}
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-4">{config.name}</h3>
                <div className="mb-2">
                  {config.price === 0 ? (
                    <span className="text-5xl font-bold text-foreground">Free</span>
                  ) : (
                    <>
                      <span className="text-5xl font-bold text-foreground">
                        {formatPrice(
                          getLocalizedPrice(tier as SubscriptionTier, countryInfo.currency),
                          countryInfo.currency,
                          countryInfo.currencySymbol
                        )}
                      </span>
                      <span className="text-muted-foreground text-lg">/{config.interval}</span>
                    </>
                  )}
                </div>
                {config.price > 0 && (
                  <p className="text-sm text-muted-foreground">per seat</p>
                )}
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
                className="w-full rounded-lg py-6 text-base font-medium"
                size="lg"
                variant={config.popular ? "default" : "outline"}
                disabled={isCurrentPlan(tier as SubscriptionTier) || loadingTier === tier || tier === "free"}
                onClick={() => tier !== "free" && handleSubscribe(tier as SubscriptionTier)}
              >
                {loadingTier === tier ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : isCurrentPlan(tier as SubscriptionTier) ? (
                  "Current Plan"
                ) : tier === "free" ? (
                  "Free Plan"
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
