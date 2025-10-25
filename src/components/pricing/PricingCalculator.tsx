import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MessageSquare, 
  Mail, 
  Phone, 
  Instagram as InstagramIcon, 
  Facebook as FacebookIcon,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Code,
  Globe,
  Users
} from "lucide-react";
import { STRIPE_PRODUCTS, CREDIT_BUNDLES, type SubscriptionTier } from "@/lib/stripeConfig";

interface ChannelVolume {
  outgoing: number;
  incoming: number;
}

interface FeatureRequirements {
  apiAccess: boolean;
  embedWidget: boolean;
  aiAssistant: boolean;
  smsIntegration: boolean;
  teamMembers: number;
}

export function PricingCalculator() {
  const [whatsapp, setWhatsapp] = useState<ChannelVolume>({ outgoing: 500, incoming: 1000 });
  const [sms, setSms] = useState<ChannelVolume>({ outgoing: 0, incoming: 0 });
  const [email, setEmail] = useState<ChannelVolume>({ outgoing: 200, incoming: 500 });
  const [instagram, setInstagram] = useState<ChannelVolume>({ outgoing: 100, incoming: 200 });
  const [facebook, setFacebook] = useState<ChannelVolume>({ outgoing: 50, incoming: 100 });
  
  const [features, setFeatures] = useState<FeatureRequirements>({
    apiAccess: false,
    embedWidget: false,
    aiAssistant: false,
    smsIntegration: false,
    teamMembers: 1,
  });

  const [recommendedTier, setRecommendedTier] = useState<SubscriptionTier>("free");
  const [costs, setCosts] = useState({
    subscription: 0,
    overage: 0,
    thirdParty: 0,
    total: 0,
  });

  useEffect(() => {
    calculateCosts();
  }, [whatsapp, sms, email, instagram, facebook, features]);

  const calculateCosts = () => {
    // Determine minimum tier based on features
    let minTier: SubscriptionTier = "free";
    
    // Feature requirements
    if (features.apiAccess || features.aiAssistant) {
      minTier = "professional";
    } else if (features.smsIntegration || features.teamMembers > 1) {
      minTier = "starter";
    }

    // Total outgoing messages (what counts toward limits)
    const totalOutgoing = whatsapp.outgoing + sms.outgoing + email.outgoing + 
                         instagram.outgoing + facebook.outgoing;

    // Determine tier based on volume
    let volumeTier: SubscriptionTier = "free";
    if (totalOutgoing > 10000) {
      volumeTier = "enterprise";
    } else if (totalOutgoing > 1000) {
      volumeTier = "professional";
    } else if (totalOutgoing > 100) {
      volumeTier = "starter";
    }

    // Team size consideration
    if (features.teamMembers > 10) {
      volumeTier = "enterprise";
    } else if (features.teamMembers > 2 && volumeTier === "free") {
      volumeTier = "starter";
    }

    // Pick the higher tier requirement
    const finalTier = getTierPriority(minTier) > getTierPriority(volumeTier) ? minTier : volumeTier;
    setRecommendedTier(finalTier);

    // Calculate subscription cost
    const tierConfig = STRIPE_PRODUCTS[finalTier];
    let subscriptionCost = tierConfig.price;
    
    // Add extra team member costs
    if (finalTier === "starter" && features.teamMembers > 2) {
      subscriptionCost += (features.teamMembers - 2) * 10;
    } else if (finalTier === "professional" && features.teamMembers > 10) {
      subscriptionCost += (features.teamMembers - 10) * 7;
    }

    // Calculate credit costs for messages exceeding plan limits
    // Credits are purchased in bundles when you exceed your plan
    let creditCost = 0;
    const tierLimit = tierConfig.limits.whatsappSending;
    
    if (finalTier !== "enterprise" && totalOutgoing > tierLimit) {
      const excess = totalOutgoing - tierLimit;
      // Use the most economical bundle rate (Large Bundle: 5000 credits for $75 = $0.015/credit)
      // Each message requires 1 credit
      const largeBundle = CREDIT_BUNDLES.large;
      const costPerCredit = largeBundle.price / largeBundle.credits; // $0.015
      creditCost = excess * costPerCredit;
    }

    // Calculate third-party costs (estimates)
    let thirdPartyCost = 0;
    
    // WhatsApp: User-initiated (24hr window) free, business-initiated ~$0.05/msg average
    thirdPartyCost += whatsapp.outgoing * 0.05;
    
    // SMS: ~$0.01/msg average (US/Canada)
    thirdPartyCost += sms.outgoing * 0.01;
    
    // Email: negligible for most providers
    thirdPartyCost += email.outgoing * 0.0001;
    
    // Instagram/Facebook: currently free
    // (no cost added)

    const totalCost = subscriptionCost + creditCost + thirdPartyCost;

    setCosts({
      subscription: subscriptionCost,
      overage: creditCost,
      thirdParty: thirdPartyCost,
      total: totalCost,
    });
  };

  const getTierPriority = (tier: SubscriptionTier): number => {
    const priority = { free: 0, starter: 1, professional: 2, enterprise: 3 };
    return priority[tier];
  };

  const totalMessages = whatsapp.outgoing + whatsapp.incoming + sms.outgoing + sms.incoming +
                        email.outgoing + email.incoming + instagram.outgoing + instagram.incoming +
                        facebook.outgoing + facebook.incoming;

  return (
    <Card className="p-8 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3">Monthly Cost Calculator</h2>
        <p className="text-muted-foreground text-lg">
          Estimate your costs and find the perfect plan for your business
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column: Message Volume */}
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">Message Volume per Month</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Adjust sliders to estimate your monthly message volume per channel
            </p>
          </div>

          {/* WhatsApp */}
          <ChannelSlider
            icon={<MessageSquare className="w-5 h-5" />}
            label="WhatsApp"
            outgoing={whatsapp.outgoing}
            incoming={whatsapp.incoming}
            onOutgoingChange={(val) => setWhatsapp({ ...whatsapp, outgoing: val })}
            onIncomingChange={(val) => setWhatsapp({ ...whatsapp, incoming: val })}
            maxValue={20000}
          />

          {/* SMS */}
          <ChannelSlider
            icon={<Phone className="w-5 h-5" />}
            label="SMS"
            outgoing={sms.outgoing}
            incoming={sms.incoming}
            onOutgoingChange={(val) => setSms({ ...sms, outgoing: val })}
            onIncomingChange={(val) => setSms({ ...sms, incoming: val })}
            maxValue={10000}
          />

          {/* Email */}
          <ChannelSlider
            icon={<Mail className="w-5 h-5" />}
            label="Email"
            outgoing={email.outgoing}
            incoming={email.incoming}
            onOutgoingChange={(val) => setEmail({ ...email, outgoing: val })}
            onIncomingChange={(val) => setEmail({ ...email, incoming: val })}
            maxValue={10000}
          />

          {/* Instagram */}
          <ChannelSlider
            icon={<InstagramIcon className="w-5 h-5" />}
            label="Instagram DM"
            outgoing={instagram.outgoing}
            incoming={instagram.incoming}
            onOutgoingChange={(val) => setInstagram({ ...instagram, outgoing: val })}
            onIncomingChange={(val) => setInstagram({ ...instagram, incoming: val })}
            maxValue={5000}
          />

          {/* Facebook */}
          <ChannelSlider
            icon={<FacebookIcon className="w-5 h-5" />}
            label="Facebook Messenger"
            outgoing={facebook.outgoing}
            incoming={facebook.incoming}
            onOutgoingChange={(val) => setFacebook({ ...facebook, outgoing: val })}
            onIncomingChange={(val) => setFacebook({ ...facebook, incoming: val })}
            maxValue={5000}
          />
        </div>

        {/* Right Column: Features & Results */}
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">Feature Requirements</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Select the features you need to determine your minimum plan
            </p>
          </div>

          <div className="space-y-4">
            <FeatureCheckbox
              icon={<Code className="w-4 h-4" />}
              label="API Access"
              description="Integrate with your existing systems"
              checked={features.apiAccess}
              onCheckedChange={(checked) => 
                setFeatures({ ...features, apiAccess: checked as boolean })
              }
              badge="Professional+"
            />

            <FeatureCheckbox
              icon={<Globe className="w-4 h-4" />}
              label="Embed Widget"
              description="Add chat widget to your website"
              checked={features.embedWidget}
              onCheckedChange={(checked) => 
                setFeatures({ ...features, embedWidget: checked as boolean })
              }
            />

            <FeatureCheckbox
              icon={<Sparkles className="w-4 h-4" />}
              label="AI Assistant"
              description="Automated intelligent responses"
              checked={features.aiAssistant}
              onCheckedChange={(checked) => 
                setFeatures({ ...features, aiAssistant: checked as boolean })
              }
              badge="Professional+"
            />

            <FeatureCheckbox
              icon={<Phone className="w-4 h-4" />}
              label="SMS Integration"
              description="Send and receive text messages"
              checked={features.smsIntegration}
              onCheckedChange={(checked) => 
                setFeatures({ ...features, smsIntegration: checked as boolean })
              }
              badge="Starter+"
            />

            <div className="pt-2">
              <Label className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4" />
                <span className="font-medium">Team Members: {features.teamMembers}</span>
              </Label>
              <Slider
                value={[features.teamMembers]}
                onValueChange={(val) => setFeatures({ ...features, teamMembers: val[0] })}
                max={50}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>1</span>
                <span>25</span>
                <span>50+</span>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Cost Summary */}
          <div className="bg-primary/5 rounded-lg p-6 space-y-4">
            <div className="text-center mb-4">
              <Badge className="mb-3 text-lg px-4 py-1">
                Recommended: {STRIPE_PRODUCTS[recommendedTier].name}
              </Badge>
              <p className="text-sm text-muted-foreground">
                Based on {totalMessages.toLocaleString()} messages/month
              </p>
            </div>

            <div className="space-y-3">
              <CostRow 
                label="Base Subscription" 
                amount={costs.subscription}
                description={`${STRIPE_PRODUCTS[recommendedTier].name} plan`}
              />
              
              {costs.overage > 0 && (
                <CostRow 
                  label="Additional Credits" 
                  amount={costs.overage}
                  description="Credits for messages exceeding plan limit ($0.015/credit)"
                />
              )}
              
              <CostRow 
                label="Third-Party Providers" 
                amount={costs.thirdParty}
                description="WhatsApp, SMS delivery costs"
                isEstimate
              />

              <Separator />

              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-bold">Estimated Total</span>
                <span className="text-2xl font-bold text-primary">
                  ${costs.total.toFixed(2)}/mo
                </span>
              </div>
            </div>

            <div className="mt-4 text-xs text-muted-foreground space-y-1">
              <p>• Incoming messages are always free</p>
              <p>• Additional credits calculated at Large Bundle rate ($0.015/credit)</p>
              <p>• Third-party costs (WhatsApp, SMS) are estimates and paid separately to providers</p>
              <p>• Enterprise plans include unlimited usage</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Helper Components
function ChannelSlider({
  icon,
  label,
  outgoing,
  incoming,
  onOutgoingChange,
  onIncomingChange,
  maxValue,
}: {
  icon: React.ReactNode;
  label: string;
  outgoing: number;
  incoming: number;
  onOutgoingChange: (val: number) => void;
  onIncomingChange: (val: number) => void;
  maxValue: number;
}) {
  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2 font-medium">
        {icon}
        <span>{label}</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            Outgoing
          </Label>
          <span className="text-sm font-semibold">{outgoing.toLocaleString()}</span>
        </div>
        <Slider
          value={[outgoing]}
          onValueChange={(val) => onOutgoingChange(val[0])}
          max={maxValue}
          step={50}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3" />
            Incoming
          </Label>
          <span className="text-sm font-semibold">{incoming.toLocaleString()}</span>
        </div>
        <Slider
          value={[incoming]}
          onValueChange={(val) => onIncomingChange(val[0])}
          max={maxValue}
          step={50}
          className="w-full"
        />
      </div>
    </div>
  );
}

function FeatureCheckbox({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean | string) => void;
  badge?: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
      <Checkbox 
        id={label} 
        checked={checked} 
        onCheckedChange={onCheckedChange}
        className="mt-1"
      />
      <div className="flex-1">
        <Label 
          htmlFor={label} 
          className="flex items-center gap-2 cursor-pointer font-medium"
        >
          {icon}
          <span>{label}</span>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </Label>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}

function CostRow({
  label,
  amount,
  description,
  isEstimate = false,
}: {
  label: string;
  amount: number;
  description?: string;
  isEstimate?: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-semibold">
          {isEstimate && "~"}${amount.toFixed(2)}
        </span>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
