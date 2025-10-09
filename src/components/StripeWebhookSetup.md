# Stripe Webhook Setup Instructions

## CRITICAL: Configure Stripe Webhook Endpoint

Your payment system will not work until you complete this setup. Follow these steps carefully:

### Step 1: Access Stripe Dashboard
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Log in to your account
3. Navigate to **Developers** → **Webhooks**

### Step 2: Add Webhook Endpoint
1. Click **"Add endpoint"** button
2. Enter this exact URL:
   ```
   https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/stripe-webhook
   ```

### Step 3: Select Events to Listen
Select these specific events (REQUIRED for system to work):

✅ **customer.subscription.created**
   - Activates subscription when customer completes payment
   - Updates business tier in database

✅ **customer.subscription.updated**
   - Updates subscription details when plan changes
   - Handles seat adjustments

✅ **customer.subscription.deleted**
   - Freezes account when subscription cancelled
   - Prevents further usage

✅ **invoice.payment_succeeded**
   - Unfreezes account after successful payment
   - Records invoice in database
   - Sends payment success email

✅ **invoice.payment_failed**
   - Sets 3-day grace period
   - Sends payment warning email
   - Records failed invoice

### Step 4: Get Webhook Signing Secret
1. After creating the endpoint, click on it
2. Click **"Reveal"** next to "Signing secret"
3. Copy the secret (starts with `whsec_...`)

### Step 5: Add Secret to Supabase
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/jrtlrnfdqfkjlkpfirzr/settings/functions)
2. Navigate to **Settings** → **Functions** → **Secrets**
3. Add new secret:
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: (paste the secret you copied)
4. Click **Save**

### Step 6: Test the Webhook
1. In Stripe Dashboard, go to your webhook
2. Click **"Send test webhook"**
3. Select `customer.subscription.created`
4. Click **"Send test event"**
5. Check that it returns `200 OK`

### Verification Checklist
- [ ] Webhook endpoint added with correct URL
- [ ] All 5 events selected
- [ ] Signing secret copied
- [ ] Secret added to Supabase as `STRIPE_WEBHOOK_SECRET`
- [ ] Test webhook sent successfully
- [ ] Edge function logs show successful webhook processing

### What Happens Without Webhook?
❌ Subscriptions won't activate automatically
❌ Payments won't be recorded
❌ Account freezing won't work
❌ Customers won't receive payment emails
❌ Invoice history won't populate

### Troubleshooting
If webhook is failing:
1. Check [Edge Function Logs](https://supabase.com/dashboard/project/jrtlrnfdqfkjlkpfirzr/functions/stripe-webhook/logs)
2. Verify webhook secret is correct
3. Ensure all 5 events are selected
4. Test with Stripe CLI: `stripe listen --forward-to https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/stripe-webhook`

### Support
If you encounter issues:
- Check Stripe webhook delivery attempts in Dashboard
- Review Supabase edge function logs
- Verify environment variables are set correctly
