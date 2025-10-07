// Stripe product configuration
// Update these with your actual Stripe price IDs

export const STRIPE_PRODUCTS = {
  free: {
    name: "Free",
    priceId: null,
    productId: "prod_free",
    price: 0,
    currency: "USD",
    interval: "month",
    features: [
      "1 team member",
      "Email unlimited (receiving)",
      "100 WhatsApp messages/month (sending)",
      "Unlimited WhatsApp receiving",
      "Basic templates (5)",
      "Community support",
    ],
    limits: {
      seats: 1,
      messages: 100, // WhatsApp sending only
      templates: 5,
      aiAssistant: false,
      apiAccess: false,
      emailIntegration: true, // Can receive
      whatsappSending: 100,
    },
    popular: false,
  },
  starter: {
    name: "Starter",
    priceId: "price_starter", // Replace with actual Stripe price ID
    productId: "prod_starter",
    price: 29,
    currency: "USD",
    interval: "month",
    features: [
      "2 team members",
      "1,000 WhatsApp messages/month (sending)",
      "Unlimited receiving",
      "Basic templates (20)",
      "Email integration",
      "Email support",
    ],
    limits: {
      seats: 2,
      messages: 1000,
      templates: 20,
      aiAssistant: false,
      apiAccess: false,
      emailIntegration: true,
      whatsappSending: 1000,
    },
    popular: true,
  },
  professional: {
    name: "Professional",
    priceId: "price_professional", // Replace with actual Stripe price ID
    productId: "prod_professional",
    price: 79,
    currency: "USD",
    interval: "month",
    features: [
      "10 team members",
      "10,000 WhatsApp messages/month",
      "Unlimited receiving",
      "Advanced templates (unlimited)",
      "AI assistant",
      "Priority support",
      "API access",
      "Email integration",
    ],
    limits: {
      seats: 10,
      messages: 10000,
      templates: 999999,
      aiAssistant: true,
      apiAccess: true,
      emailIntegration: true,
      whatsappSending: 10000,
    },
    popular: false,
  },
  enterprise: {
    name: "Enterprise",
    priceId: "price_enterprise", // Replace with actual Stripe price ID
    productId: "prod_enterprise",
    price: 199,
    currency: "USD",
    interval: "month",
    features: [
      "Unlimited team members",
      "Unlimited messages",
      "Custom templates (unlimited)",
      "AI assistant",
      "24/7 premium support",
      "Full API access",
      "Custom integrations",
      "Dedicated account manager",
    ],
    limits: {
      seats: 999999,
      messages: 999999,
      templates: 999999,
      aiAssistant: true,
      apiAccess: true,
      emailIntegration: true,
      whatsappSending: 999999,
    },
    popular: false,
  },
} as const;

export const CREDIT_BUNDLES = {
  small: {
    name: "Small Bundle",
    credits: 500,
    price: 10,
    priceId: "price_bundle_small",
  },
  medium: {
    name: "Medium Bundle",
    credits: 1500,
    price: 25,
    priceId: "price_bundle_medium",
    savings: 15,
  },
  large: {
    name: "Large Bundle",
    credits: 5000,
    price: 75,
    priceId: "price_bundle_large",
    savings: 25,
  },
} as const;

export type SubscriptionTier = keyof typeof STRIPE_PRODUCTS;
export type CreditBundle = keyof typeof CREDIT_BUNDLES;

export const getTierFromProductId = (productId: string | null): SubscriptionTier => {
  if (!productId) return "free";
  
  for (const [tier, config] of Object.entries(STRIPE_PRODUCTS)) {
    if (config.productId === productId) {
      return tier as SubscriptionTier;
    }
  }
  
  return "free";
};

export const canAccessFeature = (
  currentTier: SubscriptionTier,
  feature: keyof typeof STRIPE_PRODUCTS[SubscriptionTier]["limits"]
): boolean => {
  return STRIPE_PRODUCTS[currentTier].limits[feature] === true;
};

export const getMessageLimit = (tier: SubscriptionTier): number => {
  return STRIPE_PRODUCTS[tier].limits.whatsappSending || 0;
};
