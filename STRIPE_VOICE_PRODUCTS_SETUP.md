# Stripe Voice Credit Bundle Products Setup

## Required Products to Create in Stripe Dashboard

To complete the voice calling payment integration, you need to create 3 products in your Stripe Dashboard:

### Product 1: 500 Minutes Bundle
- **Product Name:** Voice Calling Minutes - 500 Pack
- **Description:** 500 minutes of voice calling credit
- **Price:** $25.00 USD (one-time payment)
- **Type:** One-time purchase

After creating:
1. Copy the **Price ID** (starts with `price_`)
2. Update `src/lib/stripeConfig.ts` line 278: Replace `price_voice_500_minutes` with your actual price ID

---

### Product 2: 2000 Minutes Bundle
- **Product Name:** Voice Calling Minutes - 2000 Pack
- **Description:** 2000 minutes of voice calling credit (Save 30%)
- **Price:** $90.00 USD (one-time payment)
- **Type:** One-time purchase

After creating:
1. Copy the **Price ID** (starts with `price_`)
2. Update `src/lib/stripeConfig.ts` line 284: Replace `price_voice_2000_minutes` with your actual price ID

---

### Product 3: 5000 Minutes Bundle
- **Product Name:** Voice Calling Minutes - 5000 Pack
- **Description:** 5000 minutes of voice calling credit (Save 35%)
- **Price:** $200.00 USD (one-time payment)
- **Type:** One-time purchase

After creating:
1. Copy the **Price ID** (starts with `price_`)
2. Update `src/lib/stripeConfig.ts` line 290: Replace `price_voice_5000_minutes` with your actual price ID

---

## How to Create Products in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Products** → **+ Add product**
3. Fill in the product details as specified above
4. Set the pricing as **One-time**
5. Click **Add product**
6. On the product page, find the **Pricing** section and click on the price
7. Copy the **Price ID** (starts with `price_`)
8. Update the corresponding `priceId` in `src/lib/stripeConfig.ts`

---

## Alternative: Use price_data (Current Implementation)

The system currently uses Stripe's `price_data` parameter in checkout sessions, which works without pre-created products. However, using actual Stripe products provides:
- Better dashboard visibility
- Revenue tracking by product
- Product analytics
- Customer purchase history
- Easier refunds and management

---

## After Setup

Once all 3 products are created and price IDs are updated:

1. Test purchase flow at `/app/settings` → Voice Calling Usage → Buy Credits
2. Complete a test purchase
3. Verify webhook processes the purchase correctly
4. Confirm credits are added to business account
5. Check Stripe Dashboard for the completed payment

---

## Current Status

✅ **Database:** voice_credit_bundles table seeded with correct pricing
✅ **Edge Functions:** purchase-voice-credits deployed and functional
✅ **Webhook:** stripe-webhook handles voice_credits type
✅ **Frontend:** VoiceCreditBundleDialog integrated
⚠️ **Stripe Products:** Need to be created (using price_data fallback currently)
