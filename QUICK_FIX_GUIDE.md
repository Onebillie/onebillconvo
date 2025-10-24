# Quick Fix Guide - Immediate Actions Needed

## 🚨 DO THESE FIRST (15 minutes)

### 1. Configure Stripe Webhook (5 min)
```
1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Endpoint URL: https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/stripe-webhook
4. Select events:
   ✓ customer.subscription.created
   ✓ customer.subscription.updated
   ✓ customer.subscription.deleted
   ✓ invoice.payment_succeeded
   ✓ invoice.payment_failed
5. Copy signing secret (whsec_...)
6. Go to: https://supabase.com/dashboard/project/jrtlrnfdqfkjlkpfirzr/settings/functions
7. Add secret: STRIPE_WEBHOOK_SECRET = [paste secret]
```

### 2. Enable Password Leak Protection (2 min)
```
1. Go to: https://supabase.com/dashboard/project/jrtlrnfdqfkjlkpfirzr/auth/policies
2. Find "Leaked password protection"
3. Toggle ON
```

### 3. Test Critical Flow (8 min)
```bash
# Test 1: Sign up a new account
1. Go to /signup
2. Create test account
3. Verify lands on /app/onboarding

# Test 2: Subscribe to Starter
1. Go to /pricing
2. Click "Subscribe" on Starter
3. Use test card: 4242 4242 4242 4242
4. Complete checkout
5. Verify redirect to success
6. Check subscription status updates

# Test 3: Message limit warning
1. In database, update message_count_current_period to 85 for your business
2. Refresh dashboard
3. Verify warning banner appears
```

---

## ⚡ FIX TODAY (2-3 hours)

### 4. Fix Database Security Issues

#### Find tables without RLS policies:
```sql
-- Run in Supabase SQL Editor
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public'
  AND rowsecurity = true 
  AND tablename NOT IN (
    SELECT tablename FROM pg_policies WHERE schemaname = 'public'
  );
```

#### For each table found, add policies:
```sql
-- Example: If admin_sessions needs policies
CREATE POLICY "Users can read own sessions"
  ON admin_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON admin_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON admin_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);
```

#### Fix function search paths:
```sql
-- List all functions without search_path set
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_type = 'FUNCTION';

-- For each function, add search_path
-- Example:
ALTER FUNCTION has_role(uuid, text) SET search_path = public;
ALTER FUNCTION update_updated_at_column() SET search_path = public;
-- Repeat for all functions
```

---

### 5. Test Frozen Account Recovery (30 min)

```sql
-- Simulate frozen account
UPDATE businesses 
SET is_frozen = true, payment_status = 'overdue'
WHERE id = 'YOUR_BUSINESS_ID';
```

Then test:
1. [ ] Banner appears at top
2. [ ] Shows amount due
3. [ ] "Pay Now" button works
4. [ ] Incoming messages still arrive
5. [ ] Outgoing messages blocked
6. [ ] After payment, account unfreezes immediately

---

### 6. Add Missing Credit Expiry Logic (1 hour)

**Option A: Credits NEVER Expire (Recommended - Simpler)**
```typescript
// No changes needed, just verify UI is correct
// Already says: "Credits never expire"
```

**Option B: Credits DO Expire (More Complex)**
```sql
-- Add expiry column if it doesn't exist
ALTER TABLE credit_transactions 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Set default expiry to 365 days from purchase
UPDATE credit_transactions 
SET expires_at = created_at + INTERVAL '365 days'
WHERE expires_at IS NULL;

-- Create index
CREATE INDEX idx_credits_expiring 
ON credit_transactions(expires_at, business_id) 
WHERE expires_at IS NOT NULL;
```

Then create edge function `check-expiring-credits`:
```typescript
// supabase/functions/check-expiring-credits/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Find credits expiring in next 30 days
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const { data: expiringCredits } = await supabase
    .from('credit_transactions')
    .select('*, businesses(id, owner_id, profiles(email))')
    .gte('expires_at', new Date().toISOString())
    .lte('expires_at', thirtyDaysFromNow.toISOString());

  // Group by business and send notifications
  // ... implementation ...

  return new Response(JSON.stringify({ processed: expiringCredits?.length || 0 }), {
    headers: { "Content-Type": "application/json" }
  });
});
```

**Business Decision Needed:** Choose Option A or B and update UI/backend accordingly.

---

## 📱 VERIFY ALL LINKS (30 min)

### Test these navigation flows:

**Public Pages:**
```
/ → /signup ✓
/ → /features ✓
/ → /why-us ✓
/ → /pricing ✓
/ → /faq ✓
/ → /auth ✓

/features → /signup ✓
/features → /pricing ✓

/why-us → /signup ✓
/why-us → /pricing ✓

/pricing → Stripe checkout ✓
/pricing → /app/dashboard (if logged in) ✓

/faq → /signup ✓
/faq → /guides ✓
```

**Authenticated Pages:**
```
/app/dashboard → /app/settings ✓
/app/dashboard → /auth (logout) ✓
/app/settings → /pricing ✓
/app/settings → Stripe portal ✓
```

**Fix any broken links immediately.**

---

## 🧪 CRITICAL USER FLOWS TO TEST

### Flow 1: New User Sign-Up to First Message (10 min)
```
1. /signup → Create account
2. Verify email (if enabled)
3. /app/onboarding → Complete onboarding
4. /app/dashboard → See empty inbox
5. Connect WhatsApp
6. Send test message
7. Receive reply
```

### Flow 2: Upgrade Journey (15 min)
```
1. Start with Free account
2. Send 80 messages (update DB)
3. See warning banner
4. Click "Upgrade Plan"
5. Choose Starter
6. Complete Stripe checkout
7. Verify subscription activates
8. Verify limit increases to 1,000
9. Send message successfully
```

### Flow 3: Credit Purchase (10 min)
```
1. Click "Purchase Credits"
2. Select bundle
3. Complete checkout
4. Verify credits added
5. Verify can send despite limit
6. Verify credit balance decreases
```

### Flow 4: Payment Failure Recovery (15 min)
```
1. Simulate failed payment (Stripe test card 4000000000000002)
2. Verify account freezes
3. Verify banner shows
4. Try to send message (should fail)
5. Receive message (should work)
6. Update payment method
7. Pay outstanding invoice
8. Verify account unfreezes immediately
9. Send message successfully
```

---

## 📊 MONITORING CHECKLIST

### Check these metrics daily:

**Stripe Dashboard:**
- [ ] Failed payments last 24h
- [ ] Successful subscriptions
- [ ] Webhook delivery success rate

**Supabase Dashboard:**
- [ ] Edge function error rate
- [ ] Database query performance
- [ ] Storage usage
- [ ] Active connections

**Application:**
- [ ] New user signups
- [ ] Active conversations
- [ ] Message delivery rate
- [ ] API error rate

---

## 🆘 EMERGENCY PROCEDURES

### If Webhooks Fail:
```
1. Check Stripe Dashboard → Webhooks → Recent deliveries
2. Look for failed deliveries
3. Check error messages
4. Verify STRIPE_WEBHOOK_SECRET is correct
5. Retry failed webhooks manually
6. Check Supabase edge function logs
```

### If Subscriptions Don't Activate:
```
1. Check check-subscription edge function logs
2. Verify Stripe customer exists
3. Verify product IDs match in stripeConfig.ts
4. Manually check Stripe subscription status
5. Force refresh: call check-subscription manually
```

### If Messages Not Sending:
```
1. Check user's message limit
2. Check credit balance
3. Check account frozen status
4. Check WhatsApp connection status
5. Check edge function logs for errors
6. Verify phone number format
```

---

## ✅ DAILY OPERATIONS

### Every Morning:
1. Check Stripe failed payments
2. Check edge function errors
3. Review new user signups
4. Check webhook delivery rate

### Every Week:
1. Review billing history
2. Check for expiring trials
3. Review support tickets
4. Update documentation

### Every Month:
1. Security audit
2. Performance review
3. Cost analysis
4. Feature usage statistics

---

## 📞 WHO TO CONTACT

**Stripe Issues:**
- Dashboard: https://dashboard.stripe.com/support
- Webhook issues: Check webhook logs first
- Billing questions: support@stripe.com

**Supabase Issues:**
- Dashboard: https://supabase.com/dashboard/support
- Database: Check RLS policies first
- Performance: Check slow query log

**Integration Issues:**
- WhatsApp: Check Meta developer console
- Email: Verify IMAP/SMTP settings
- SMS: Check Twilio dashboard

---

**Remember:** Test in staging/development environment before applying fixes to production!

**Last Updated:** [Current Date]
**Owner:** Development Team
