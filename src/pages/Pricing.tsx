import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { STRIPE_PRODUCTS, type SubscriptionTier } from "@/lib/stripeConfig";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";
import { PublicHeader } from "@/components/PublicHeader";

export default function Pricing() {
  const { user, subscriptionState } = useAuth();
  const navigate = useNavigate();
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);

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
      <PublicHeader />
      
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground">
            Select the perfect plan for your business needs
          </p>
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
                        ${config.price}
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

        {/* Detailed Pricing Breakdown */}
        <div className="max-w-5xl mx-auto mt-16 text-left">
          <h3 className="text-2xl font-bold mb-6 text-foreground text-center">Detailed pricing breakdown</h3>

          {/* Features & Costs Table */}
          <div className="bg-card rounded-xl shadow-lg p-6 mb-8">
            <h4 className="font-bold text-lg mb-4 text-card-foreground">Platform features & costs</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 text-card-foreground font-semibold">Feature</th>
                    <th className="text-left py-3 text-card-foreground font-semibold">Free</th>
                    <th className="text-left py-3 text-card-foreground font-semibold">Starter</th>
                    <th className="text-left py-3 text-card-foreground font-semibold">Professional</th>
                    <th className="text-left py-3 text-card-foreground font-semibold">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-3">Team members</td>
                    <td className="py-3">1</td>
                    <td className="py-3">2 (+$10/extra)</td>
                    <td className="py-3">10 (+$7/extra)</td>
                    <td className="py-3">Unlimited</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3">WhatsApp messages/month</td>
                    <td className="py-3">100</td>
                    <td className="py-3">1,000</td>
                    <td className="py-3">10,000</td>
                    <td className="py-3">Unlimited</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3">Message templates</td>
                    <td className="py-3">5 basic</td>
                    <td className="py-3">20 basic</td>
                    <td className="py-3">Unlimited</td>
                    <td className="py-3">Unlimited</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3">AI assistant responses</td>
                    <td className="py-3">-</td>
                    <td className="py-3">-</td>
                    <td className="py-3">1,000/mo</td>
                    <td className="py-3">Unlimited</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3">API calls/month</td>
                    <td className="py-3">-</td>
                    <td className="py-3">-</td>
                    <td className="py-3">10,000</td>
                    <td className="py-3">Unlimited</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3">Email integration</td>
                    <td className="py-3">✓</td>
                    <td className="py-3">✓</td>
                    <td className="py-3">✓</td>
                    <td className="py-3">✓</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3">SMS integration</td>
                    <td className="py-3">-</td>
                    <td className="py-3">✓</td>
                    <td className="py-3">✓</td>
                    <td className="py-3">✓</td>
                  </tr>
                  <tr>
                    <td className="py-3">Support level</td>
                    <td className="py-3">Community</td>
                    <td className="py-3">Email</td>
                    <td className="py-3">Priority</td>
                    <td className="py-3">24/7 + Manager</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Overage & Add-on Costs */}
          <div className="bg-card rounded-xl shadow-lg p-6 mb-8">
            <h4 className="font-bold text-lg mb-4 text-card-foreground">Overage & add-on pricing</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-card-foreground mb-2">Message overages:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Free plan: $0.10 per message</li>
                  <li>• Starter plan: $0.015 per message (or $15/1,000 bundle)</li>
                  <li>• Professional plan: $0.006 per message (or $30/5,000 bundle)</li>
                  <li>• Enterprise: Unlimited included</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-card-foreground mb-2">Extra team members:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Starter: $10/month per user</li>
                  <li>• Professional: $7/month per user</li>
                  <li>• Enterprise: Unlimited included</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-card-foreground mb-2">AI assistant:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Professional: $0.05 per response after 1,000</li>
                  <li>• Enterprise: Unlimited included</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-card-foreground mb-2">API access:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Professional: $0.002 per call after 10,000</li>
                  <li>• Enterprise: Unlimited included</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Third-Party Service Provider Costs */}
          <div className="bg-accent/10 border-2 border-accent rounded-xl shadow-lg p-6 mb-8">
            <h4 className="font-bold text-lg mb-4 text-foreground flex items-center gap-2">
              <span className="text-accent">⚠️</span> Third-party service provider costs
            </h4>
            <div className="space-y-4 text-sm text-foreground">
              <p className="font-semibold">
                Important: Our platform fees cover access to the À La Carte Chat platform only. You must pay
                separately to third-party service providers for message delivery costs.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-background/50 rounded-lg p-4">
                  <p className="font-semibold mb-2">WhatsApp Business API (Meta):</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Business-initiated: $0.005-$0.15/msg (varies by country)</li>
                    <li>• User-initiated (24hr window): Free</li>
                    <li>• Template messages: Varies by country</li>
                    <li>• You pay Meta directly via their billing</li>
                  </ul>
                </div>

                <div className="bg-background/50 rounded-lg p-4">
                  <p className="font-semibold mb-2">SMS (Twilio/Similar):</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• US/Canada: ~$0.0075/msg</li>
                    <li>• International: $0.05-$0.50/msg</li>
                    <li>• Short codes: Additional fees apply</li>
                    <li>• You pay your SMS provider directly</li>
                  </ul>
                </div>

                <div className="bg-background/50 rounded-lg p-4">
                  <p className="font-semibold mb-2">Email (Your SMTP provider):</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Usually free or very low cost</li>
                    <li>• Gmail/Outlook: Included with account</li>
                    <li>• SendGrid/Mailgun: Pay per volume</li>
                    <li>• You manage your own email accounts</li>
                  </ul>
                </div>

                <div className="bg-background/50 rounded-lg p-4">
                  <p className="font-semibold mb-2">Instagram/Facebook (Meta):</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Currently free for most use cases</li>
                    <li>• Subject to Meta's policies</li>
                    <li>• May incur costs for ads/promotions</li>
                    <li>• Check Meta's current pricing</li>
                  </ul>
                </div>
              </div>

              <div className="bg-accent/20 rounded-lg p-4 mt-4">
                <p className="font-semibold text-foreground mb-2">💡 Cost estimate example:</p>
                <p className="text-muted-foreground">
                  A business on the Starter plan ($29/mo) sending 1,000 WhatsApp messages might pay:
                </p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>• À La Carte Chat platform: $29/month</li>
                  <li>• WhatsApp (Meta): ~$50-$150/month (depending on message types & countries)</li>
                  <li>
                    • <strong className="text-foreground">Total: $79-$179/month</strong>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Extra Features Costs */}
          <div className="bg-card rounded-xl shadow-lg p-6 mb-8">
            <h4 className="font-bold text-lg mb-4 text-card-foreground">Premium features & extras</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-card-foreground mb-2">Advanced features:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Custom white-label branding: Contact sales</li>
                  <li>• Dedicated infrastructure: Contact sales</li>
                  <li>• Custom SLA agreements: Contact sales</li>
                  <li>• On-premise deployment: Contact sales</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-card-foreground mb-2">Professional services:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Implementation support: $500-$2,000</li>
                  <li>• Custom integration development: $1,500+</li>
                  <li>• Team training sessions: $300/session</li>
                  <li>• Data migration assistance: $500+</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Note */}
        <div className="max-w-3xl mx-auto mt-12 text-center mb-12">
          <p className="text-sm text-muted-foreground">
            All prices in USD. Billing is monthly. You can upgrade, downgrade, or cancel anytime. 7-day free trial
            available on all paid plans. No credit card required for Free plan.
          </p>
        </div>

        {user && (
          <div className="text-center mt-8 mb-12">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
