// Stripe product configuration
// Update these with your actual Stripe price IDs

export const STRIPE_PRODUCTS = {
  starter: {
    name: "Starter",
    priceId: "price_starter", // Replace with actual Stripe price ID
    productId: "prod_starter",
    price: 29,
    currency: "USD",
    interval: "month",
    features: [
      "2 team members",
      "1,000 messages/month",
      "Basic templates",
      "Email support",
      "WhatsApp integration",
    ],
    limits: {
      seats: 2,
      messages: 1000,
      templates: 10,
    },
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
      "10,000 messages/month",
      "Advanced templates",
      "AI assistant",
      "Priority support",
      "API access",
      "Email integration",
    ],
    limits: {
      seats: 10,
      messages: 10000,
      templates: 50,
    },
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
      "Custom templates",
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
    },
  },
} as const;

export type SubscriptionTier = keyof typeof STRIPE_PRODUCTS;

export const getTierFromProductId = (productId: string | null): SubscriptionTier => {
  if (!productId) return "starter";
  
  for (const [tier, config] of Object.entries(STRIPE_PRODUCTS)) {
    if (config.productId === productId) {
      return tier as SubscriptionTier;
    }
  }
  
  return "starter";
};
