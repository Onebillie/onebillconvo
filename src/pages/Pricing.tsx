import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Globe, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { STRIPE_PRODUCTS, type SubscriptionTier, getLocalizedPrice, formatPrice } from "@/lib/stripeConfig";
import { useCountryPricing } from "@/hooks/useCountryPricing";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";

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
    <>
      <SEOHead 
        title="Pricing - À La Carte Chat"
        description="Transparent pay-as-you-go pricing for business messaging. Free plan available. No hidden fees. Plans starting from $0/month with WhatsApp, Email, SMS, Instagram, and Facebook integration."
        keywords={[
          'messaging platform pricing',
          'WhatsApp Business API pricing',
          'unified inbox cost',
          'business messaging rates',
          'pay as you go messaging',
          'affordable customer service software',
          'SMS pricing',
          'multi-channel pricing',
        ]}
        canonical="/pricing"
      />
      <StructuredData 
        type="BreadcrumbList" 
        data={{
          items: [
            { name: 'Home', url: '/' },
            { name: 'Pricing', url: '/pricing' }
          ]
        }} 
      />
      
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">À La Carte Chat</span>
          </div>
          {user ? (
            <Button onClick={() => navigate("/app/dashboard")} variant="outline">
              Dashboard
            </Button>
          ) : (
            <Button onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          )}
        </div>
      </header>
      
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

        {/* AI Assistant Pricing Details */}
        <Card className="max-w-4xl mx-auto mt-12 p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">AI Assistant Pricing</h2>
            <p className="text-muted-foreground">
              Intelligent automated responses powered by Lovable AI
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Professional Plan</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>1,000 AI responses/month included</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>$0.02 per additional response after quota</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Document training & knowledge base</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Privacy & compliance controls</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Enterprise Plan</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Unlimited AI responses included</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>No additional costs for AI usage</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Advanced RAG & per-customer context</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>GDPR-compliant data handling</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {user && (
          <div className="text-center mt-8">
            <Button variant="ghost" onClick={() => navigate("/app/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
