# Critical Fixes Required Before Production

## ⚠️ HIGH PRIORITY - Must Fix Immediately

### 1. Credit Expiry Warning System (MISSING)

**Problem:** No warnings for expiring credits. Users lose credits without notice.

**Solution Required:**
1. Add `expiry_date` column to credit transactions table (if not exists)
2. Create Supabase Edge Function: `check-expiring-credits`
3. Set up daily cron job to check for expiring credits
4. Implement CreditExpiryWarningDialog (created)
5. Integrate warnings at 30, 14, 7, and 1 days before expiry

**Implementation Steps:**
```sql
-- Add expiry tracking to credits (if not exists)
ALTER TABLE credit_transactions 
ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '365 days');

-- Create index for efficient expiry queries
CREATE INDEX IF NOT EXISTS idx_credits_expiring 
ON credit_transactions(expiry_date, user_id) 
WHERE expiry_date IS NOT NULL;
```

**Edge Function Needed:**
- Name: `check-expiring-credits`
- Trigger: Daily cron (00:00 UTC)
- Action: Check for credits expiring in 30, 14, 7, 1 days
- Notification: Email + in-app notification

---

### 2. Message Reception During Account Freeze

**Problem:** Need to verify incoming messages still arrive when account is frozen.

**Current Status:** ✅ Likely working (receiving is separate from sending)
**Verification Required:**
1. Test WhatsApp webhook receives messages when frozen
2. Test Email IMAP sync continues when frozen
3. Test SMS webhook receives when frozen
4. Verify messages stored in database
5. Verify users can VIEW messages when frozen
6. Verify users CANNOT SEND when frozen

**Testing Command:**
```bash
# Test with frozen account
# 1. Set is_frozen = true in businesses table
# 2. Send test message to WhatsApp number
# 3. Verify it appears in conversation
# 4. Try to reply - should be blocked
```

---

### 3. Stripe Webhook Configuration (CRITICAL)

**Problem:** Webhook may not be configured properly in Stripe Dashboard.

**Action Required by User:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Developers → Webhooks
3. Click "Add endpoint"
4. Set URL: `https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/stripe-webhook`
5. Select these events:
   - ✅ customer.subscription.created
   - ✅ customer.subscription.updated
   - ✅ customer.subscription.deleted
   - ✅ invoice.payment_succeeded
   - ✅ invoice.payment_failed
6. Copy webhook signing secret (starts with `whsec_`)
7. Add to Supabase: Settings → Functions → Secrets
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: [paste secret]

**Verification:**
```bash
# Send test webhook from Stripe Dashboard
# Check edge function logs in Supabase
# Should see successful processing
```

---

### 4. Database Security Issues (From Linter)

#### 4.1 RLS Enabled with No Policies (INFO)

**Tables Affected:** Need to identify specific tables

**Fix Required:**
```sql
-- Find tables with RLS enabled but no policies
SELECT schemaname, tablename 
FROM pg_tables 
WHERE rowsecurity = true 
AND tablename NOT IN (
  SELECT tablename FROM pg_policies
);

-- For each table, add appropriate policies
-- Example for a hypothetical table:
CREATE POLICY "Users can read own data"
  ON table_name
  FOR SELECT
  USING (auth.uid() = user_id);
```

#### 4.2 Function Search Path Mutable (WARN x6)

**Problem:** Database functions lack secure search_path.

**Fix Required:**
```sql
-- For each function, add SET search_path
ALTER FUNCTION function_name() SET search_path = public;

-- Or recreate functions with proper search_path
CREATE OR REPLACE FUNCTION function_name()
RETURNS return_type
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- function body
$$;
```

**Functions to Fix:**
- Need to identify which 6 functions from linter output

#### 4.3 Leaked Password Protection Disabled (WARN)

**Problem:** Password leak detection is turned off.

**Fix Required:**
1. Go to Supabase Dashboard
2. Navigate to Authentication → Policies
3. Enable "Leaked password protection"
4. Test with known leaked password (should reject)

#### 4.4 Extensions in Public Schema (WARN)

**Problem:** Extensions installed in public schema.

**Fix Required:**
```sql
-- Create dedicated schema for extensions
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move extensions (example)
-- Note: This may require dropping and recreating
ALTER EXTENSION extension_name SET SCHEMA extensions;

-- Update search path
ALTER DATABASE postgres SET search_path = public, extensions;
```

---

### 5. Account Recovery Flow

**Problem:** Need to ensure instant account unfreeze after payment.

**Verification Required:**
1. Test payment with frozen account
2. Verify webhook processes immediately
3. Verify `is_frozen` set to false
4. Verify AccountFrozenBanner disappears
5. Verify sending is immediately restored
6. Check for any message queue issues

**Edge Function to Review:**
- `stripe-webhook/index.ts` - invoice.payment_succeeded handler

---

## 🔧 MEDIUM PRIORITY - Should Fix Soon

### 6. Credit Warning Integration

**Current State:** 
- ✅ CreditWarningDialog exists
- ✅ LimitReachedBanner exists
- ❓ Integration unclear

**Enhancement Needed:**
Integrate CreditExpiryWarningDialog into Dashboard:

```typescript
// In Dashboard.tsx or App.tsx
const [expiringCredits, setExpiringCredits] = useState<{
  amount: number;
  expiryDate: Date;
  daysRemaining: number;
} | null>(null);

useEffect(() => {
  // Check for expiring credits
  const checkExpiry = async () => {
    const { data } = await supabase
      .from('credit_transactions')
      .select('*')
      .gte('expiry_date', new Date())
      .lte('expiry_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
      .eq('user_id', user.id);
    
    if (data && data.length > 0) {
      const totalExpiring = data.reduce((sum, tx) => sum + tx.amount, 0);
      const nearestExpiry = new Date(Math.min(...data.map(tx => new Date(tx.expiry_date).getTime())));
      const daysRemaining = Math.ceil((nearestExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      setExpiringCredits({
        amount: totalExpiring,
        expiryDate: nearestExpiry,
        daysRemaining
      });
    }
  };
  
  checkExpiry();
  const interval = setInterval(checkExpiry, 24 * 60 * 60 * 1000); // Daily
  return () => clearInterval(interval);
}, [user]);
```

---

### 7. Auto Top-Up Feature

**Status:** Partially implemented in UI, backend missing.

**Required:**
1. Create `check-auto-topup` edge function
2. Trigger when message count reaches threshold
3. Automatically purchase configured credit bundle
4. Send confirmation email
5. Update credit balance

---

### 8. Payment Success Flow Enhancement

**Current:** Basic success page
**Enhancement:** 
- Show subscription details
- Show next billing date
- Show features unlocked
- Provide quick start guide

---

## 📋 TESTING PRIORITIES

### Immediate Testing Required:

1. **Subscription Flow** (30 min)
   - [ ] Sign up new account
   - [ ] Subscribe to Starter
   - [ ] Verify activation
   - [ ] Check subscription status in database

2. **Message Limits** (45 min)
   - [ ] Reach 80% of Free tier limit (80 messages)
   - [ ] Verify warning banner appears
   - [ ] Reach 100% limit
   - [ ] Verify modal blocks sending
   - [ ] Purchase credits
   - [ ] Verify sending resumes

3. **Frozen Account** (30 min)
   - [ ] Simulate payment failure
   - [ ] Verify banner appears
   - [ ] Test incoming messages still work
   - [ ] Verify outgoing blocked
   - [ ] Pay invoice
   - [ ] Verify instant recovery

4. **Security** (60 min)
   - [ ] Run `supabase db lint` 
   - [ ] Fix all WARN and INFO issues
   - [ ] Re-run linter
   - [ ] Verify no issues remain

---

## 🚀 DEPLOYMENT CHECKLIST

Before going live:

### Backend:
- [ ] All edge functions deployed
- [ ] All database migrations applied
- [ ] All RLS policies active
- [ ] All secrets configured
- [ ] Stripe webhook configured
- [ ] Cron jobs configured

### Frontend:
- [ ] All features tested
- [ ] All links working
- [ ] Mobile responsive
- [ ] Browser compatibility verified
- [ ] Performance optimized

### Integrations:
- [ ] WhatsApp connected and tested
- [ ] Email IMAP/SMTP configured
- [ ] SMS provider configured
- [ ] Instagram/Facebook configured
- [ ] AI assistant configured
- [ ] Virus scanning active

### Compliance:
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] Cookie consent active
- [ ] GDPR compliance verified
- [ ] Password leak protection enabled

### Monitoring:
- [ ] Error tracking configured
- [ ] Analytics configured
- [ ] Uptime monitoring active
- [ ] Alert system configured

---

## 📞 EMERGENCY CONTACTS

If critical issues arise:
- Supabase Support: [Supabase Dashboard Support](https://supabase.com/dashboard/support)
- Stripe Support: [Stripe Dashboard Support](https://dashboard.stripe.com/support)
- Database Backups: Supabase auto-backups daily

---

## 📝 NOTES

### Credit System Design Decision:

**Credits Never Expire by Default** (from CREDIT_BUNDLES.md)
- This is stated in UI: "Credits never expire and can be used for WhatsApp messages"
- **CONFLICT:** CreditExpiryWarningDialog implies credits DO expire
- **Resolution Needed:** Clarify with business owner:
  - Option A: Credits truly never expire (remove expiry warnings)
  - Option B: Credits expire after 365 days (implement full expiry system)
  - Option C: Credits expire after 180 days (implement full expiry system)

**Recommendation:** If credits are pay-as-you-go, they should NOT expire. This is more customer-friendly and simpler to implement.

---

**Last Updated:** [Current Date]
**Document Owner:** Development Team
**Review Frequency:** Before each deployment
