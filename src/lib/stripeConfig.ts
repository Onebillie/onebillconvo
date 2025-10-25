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
      marketing: false,
      voiceInboundMinutes: 0,
      voiceOutboundMinutes: 0,
      voiceRecording: false,
      voiceTranscription: false,
      voicePhoneNumbers: 0,
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
      marketing: false,
      voiceInboundMinutes: 100,
      voiceOutboundMinutes: 0,
      voiceRecording: true,
      voiceTranscription: false,
      voicePhoneNumbers: 1,
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
      marketing: false,
      voiceInboundMinutes: 500,
      voiceOutboundMinutes: 200,
      voiceRecording: true,
      voiceTranscription: true,
      voicePhoneNumbers: 3,
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
      marketing: false,
      voiceInboundMinutes: 999999,
      voiceOutboundMinutes: 999999,
      voiceRecording: true,
      voiceTranscription: true,
      voicePhoneNumbers: 999999,
    },
    popular: false,
  },
} as const;

// Marketing Add-On Pricing (30-40% cheaper than competitors)
export const MARKETING_TIERS = {
  marketing_starter: {
    name: "Starter Marketing",
    priceId: null, // TODO: Add Stripe price ID
    productId: "prod_marketing_starter",
    price: 19,
    currency: "USD",
    interval: "month",
    features: [
      "2,000 marketing messages/month",
      "5 active campaigns",
      "Basic segmentation",
      "Email + SMS broadcasts",
      "Basic analytics",
      "1 marketing team member",
    ],
    limits: {
      marketingMessages: 2000,
      campaigns: 5,
      channels: ["email", "sms"],
      segmentation: "basic",
      analytics: "basic",
      teamMembers: 1,
      abTesting: false,
      automation: false,
    },
    popular: false,
  },
  marketing_professional: {
    name: "Professional Marketing",
    priceId: null, // TODO: Add Stripe price ID
    productId: "prod_marketing_professional",
    price: 49,
    currency: "USD",
    interval: "month",
    features: [
      "10,000 marketing messages/month",
      "Unlimited campaigns",
      "Advanced segmentation",
      "All channels (WhatsApp, Email, SMS, Social)",
      "A/B testing",
      "Drip campaign automation",
      "Advanced analytics",
      "5 marketing team members",
    ],
    limits: {
      marketingMessages: 10000,
      campaigns: 999999,
      channels: ["whatsapp", "email", "sms", "facebook", "instagram"],
      segmentation: "advanced",
      analytics: "advanced",
      teamMembers: 5,
      abTesting: true,
      automation: "drip",
    },
    popular: true,
  },
  marketing_enterprise: {
    name: "Enterprise Marketing",
    priceId: null, // TODO: Add Stripe price ID
    productId: "prod_marketing_enterprise",
    price: 149,
    currency: "USD",
    interval: "month",
    features: [
      "Unlimited marketing messages",
      "Unlimited campaigns",
      "Custom audience segments",
      "Full omnichannel broadcast",
      "A/B/C/D testing",
      "Advanced automation & triggers",
      "Real-time analytics + custom reports",
      "White-label options",
      "Unlimited team members",
    ],
    limits: {
      marketingMessages: 999999,
      campaigns: 999999,
      channels: ["whatsapp", "email", "sms", "facebook", "instagram"],
      segmentation: "unlimited",
      analytics: "custom",
      teamMembers: 999999,
      abTesting: true,
      automation: "full",
      whitelabel: true,
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

// Overage Pricing per message (when bundle exhausted)
export const OVERAGE_PRICING = {
  whatsapp: 0.05, // $0.05 per message
  sms: 0.02, // $0.02 per message
  email: 0.001, // $0.001 per email
  facebook: 0.03, // $0.03 per message
  instagram: 0.03, // $0.03 per message
} as const;

// Voice calling overage pricing (per minute in dollars)
export const VOICE_OVERAGE_PRICING = {
  inbound: 0.02, // $0.02 per minute
  outbound: 0.03, // $0.03 per minute
  transcription: 0.08, // $0.08 per minute
  recording: 0.005, // $0.005 per minute
} as const;

// Voice credit bundles (minutes)
export const VOICE_CREDIT_BUNDLES = {
  small: {
    name: "500 Minutes",
    minutes: 500,
    price: 10,
    savings: 20,
  },
  medium: {
    name: "2000 Minutes",
    minutes: 2000,
    price: 35,
    savings: 30,
  },
  large: {
    name: "5000 Minutes",
    minutes: 5000,
    price: 75,
    savings: 35,
  },
} as const;

export type SubscriptionTier = keyof typeof STRIPE_PRODUCTS;
export type MarketingTier = keyof typeof MARKETING_TIERS;
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
