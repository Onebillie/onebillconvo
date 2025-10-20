# Security Lockdown Guide - Final Steps for Production

This guide covers the final security steps that must be completed manually before going live with À La Carte Chat.

## ✅ Status Overview

**Completed Automatically:**
- ✅ RLS policies on all tables
- ✅ Webhook signature verification
- ✅ Auto top-up security trigger
- ✅ API rate limiting in code
- ✅ Transactional email system
- ✅ SMS channel validation

**Requires Manual Configuration:**
- ⚠️ Enable leaked password protection
- ⚠️ Configure Supabase rate limiting
- ⚠️ Review and test all RLS policies

---

## 1. Enable Leaked Password Protection

**Why:** Prevents users from creating accounts with passwords exposed in data breaches.

**Steps:**
1. Go to Supabase Dashboard → Authentication → Policies
2. Find "Password Requirements" section
3. Enable "Leaked Password Protection"
4. Configure minimum password strength: **"Fair"** or higher recommended

**Reference:** [Supabase Password Policies Documentation](https://supabase.com/docs/guides/auth/passwords)

---

## 2. Configure Rate Limiting

**Why:** Prevents abuse and DDoS attacks on public endpoints.

### Database Rate Limiting
1. Go to Supabase Dashboard → Settings → API
2. Enable rate limiting for anonymous requests
3. Recommended limits:
   - **Anonymous**: 30 requests per minute
   - **Authenticated**: 100 requests per minute

### Edge Function Rate Limiting (Already Implemented)
The following edge functions already have rate limiting in code:
- `whatsapp-send`: 100 messages per minute per business
- `email-send-smtp`: 50 emails per minute per business
- `sms-send`: 30 SMS per minute per business
- All public API endpoints: 1000 requests per hour per business

**No additional action needed** - these are enforced in code.

---

## 3. Review Critical RLS Policies

Run these tests to verify RLS policies are working correctly:

### Test 1: Users Can't See Other Business Data
```sql
-- Test as a non-admin user
SELECT * FROM businesses WHERE id != (
  SELECT business_id FROM business_users WHERE user_id = auth.uid()
);
-- Should return 0 rows
```

### Test 2: Customers Are Isolated by Business
```sql
-- Test as a non-admin user
SELECT * FROM customers WHERE business_id != (
  SELECT business_id FROM business_users WHERE user_id = auth.uid()
);
-- Should return 0 rows
```

### Test 3: Messages Are Protected
```sql
-- Test as a non-admin user
SELECT * FROM messages WHERE conversation_id IN (
  SELECT id FROM conversations WHERE customer_id IN (
    SELECT id FROM customers WHERE business_id != (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  )
);
-- Should return 0 rows
```

---

## 4. Verify Webhook Security

All webhook endpoints should verify signatures:

### WhatsApp Webhook
- ✅ Signature verification: `supabase/functions/whatsapp-webhook/index.ts`
- Verifies Meta's signature on all incoming webhooks

### SMS Webhook
- ✅ Signature verification: `supabase/functions/sms-webhook/index.ts`
- Validates Twilio's signature

### Stripe Webhook
- ✅ Signature verification: `supabase/functions/stripe-webhook/index.ts`
- Validates Stripe webhook signatures

**Action:** No code changes needed - verify these are working in production by checking logs.

---

## 5. API Key Security

### Verify Secrets Are Set
Check that all required secrets are configured in Supabase Dashboard → Settings → Edge Functions → Secrets:

Required secrets:
- `RESEND_API_KEY` (for transactional emails)
- `STRIPE_SECRET_KEY` (for payments)
- `TWILIO_ACCOUNT_SID` (for SMS)
- `TWILIO_AUTH_TOKEN` (for SMS)
- `WHATSAPP_TOKEN` (for WhatsApp Business API)
- `WHATSAPP_VERIFY_TOKEN` (for WhatsApp webhook verification)

**Action:** Verify all secrets are set. Never commit secrets to code.

---

## 6. Test Critical Flows

Before launch, manually test these critical security flows:

### Authentication Flow
1. ✅ Sign up with weak password → Should be rejected
2. ✅ Sign up with leaked password → Should be rejected (after enabling)
3. ✅ Try to access another user's data → Should fail

### Payment Flow
1. ✅ Purchase credits
2. ✅ Verify auto top-up triggers correctly
3. ✅ Confirm webhook signature validation works

### Messaging Flow
1. ✅ Send WhatsApp message
2. ✅ Send SMS (verify SMS account check works)
3. ✅ Send email
4. ✅ Verify rate limits are enforced

---

## 7. Production Checklist

Before going live:

- [ ] Leaked password protection enabled
- [ ] Rate limiting configured in Supabase dashboard
- [ ] All RLS policies tested
- [ ] Webhook signatures verified
- [ ] All secrets configured
- [ ] Critical flows tested
- [ ] Error monitoring setup (check Supabase logs)
- [ ] Backup strategy in place

---

## 8. Monitoring After Launch

### What to Monitor Daily:
1. **Supabase Dashboard → Logs**: Check for authentication failures, RLS violations
2. **Edge Function Logs**: Monitor for rate limit hits, webhook failures
3. **Stripe Dashboard**: Watch for payment issues, disputes
4. **Email Delivery**: Check Resend dashboard for bounce rates

### Red Flags to Watch For:
- 🚨 Sudden spike in authentication failures → Possible attack
- 🚨 RLS policy violations in logs → Policy may be misconfigured
- 🚨 High rate limit hits → May need to adjust limits
- 🚨 Webhook signature failures → Token may be misconfigured

---

## Security Score

**Current Status:** B+ (after enabling leaked password protection: A-)

**Remaining to reach A:**
- Enable leaked password protection
- Configure rate limiting in Supabase dashboard
- Complete production testing checklist

---

## Support

If you encounter security issues or need help with any of these steps:
- Email: support@alacartechat.com
- Supabase Discord: [Join Community](https://discord.supabase.com)
- Lovable Discord: [Join Community](https://discord.lovable.dev)
