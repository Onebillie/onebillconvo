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
    priceId: "price_1SGKezGwvNoo6Q8zqFoPV1vU",
    productId: "prod_TCk9FVGSQYsfdV",
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
    priceId: "price_1SGKjmGwvNoo6Q8zyJZRgyvi",
    productId: "prod_TCkEnLBpXd1ttM",
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
    priceId: "price_1SGKjsGwvNoo6Q8z0fSOesVI",
    productId: "prod_TCkEtHuWycEz84",
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
    priceId: "price_1SKP4tGwvNoo6Q8zD1T7LQ5n",
  },
  medium: {
    name: "Medium Bundle",
    credits: 1500,
    price: 25,
    priceId: "price_1SKP4tGwvNoo6Q8zg5PYCgi8",
    savings: 15,
  },
  large: {
    name: "Large Bundle",
    credits: 5000,
    price: 75,
    priceId: "price_1SKP4uGwvNoo6Q8zc7nYeNTm",
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

// Format price with USD currency symbol
export const formatPrice = (price: number): string => {
  if (price === 0) return "Free";
  return `$${price.toLocaleString()}`;
};

// AI Usage Pricing Configuration
export const AI_PRICING = {
  professional: {
    includedResponses: 1000,
    overagePrice: 0.02, // $0.02 per additional response
  },
  enterprise: {
    includedResponses: 999999, // Unlimited
    overagePrice: 0,
  },
  free: {
    includedResponses: 0,
    overagePrice: 0,
  },
  starter: {
    includedResponses: 0,
    overagePrice: 0,
  },
} as const;
