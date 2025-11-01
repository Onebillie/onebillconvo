# 🚨 OPERATIONAL RUNBOOKS
**À La Carte Chat - Incident Response Procedures**

**Purpose:** Provide step-by-step procedures for on-call engineers to handle production incidents quickly and effectively.

---

## HOW TO USE THESE RUNBOOKS

1. **Identify the incident** using the symptom or alert name
2. **Follow the runbook steps** in order
3. **Escalate** if you cannot resolve within SLA
4. **Document** what you did in the incident ticket
5. **Create a follow-up task** for root cause analysis

---

## RUNBOOK INDEX

| ID | Incident Type | Severity | MTTR Target |
|----|---------------|----------|-------------|
| RB-001 | Account Frozen Due to Payment Failure | P2 | 15 minutes |
| RB-002 | Message Delivery Failures (Bulk) | P1 | 10 minutes |
| RB-003 | WhatsApp Webhook Down/Failing | P1 | 5 minutes |
| RB-004 | Database High CPU (>80%) | P1 | 10 minutes |
| RB-005 | Stripe Webhook Signature Failure | P2 | 15 minutes |
| RB-006 | Mass Message Loss Suspected | P0 | IMMEDIATE |
| RB-007 | Email Sync Stopped | P2 | 20 minutes |
| RB-008 | SMS Sending Failures | P2 | 15 minutes |
| RB-009 | Voice Calling Outage | P2 | 15 minutes |
| RB-010 | Auth Service Down | P0 | IMMEDIATE |
| RB-011 | Subscription Status Not Updating | P2 | 20 minutes |
| RB-012 | Credit Balance Not Updating | P2 | 15 minutes |
| RB-013 | Realtime Updates Stopped | P2 | 10 minutes |
| RB-014 | Edge Function High Error Rate | P1 | 10 minutes |
| RB-015 | Storage Quota Exceeded | P2 | 30 minutes |

---

## RB-001: Account Frozen Due to Payment Failure

### Symptoms
- Customer reports "Account Frozen" banner
- Cannot send messages
- Can receive but not reply

### Diagnostic Steps

1. **Verify Account Status**
```sql
SELECT id, name, is_frozen, stripe_customer_id, subscription_status
FROM businesses 
WHERE id = 'BUSINESS_ID';
```

2. **Check Stripe Payment Status**
- Go to Stripe Dashboard
- Search for customer ID
- View invoice history
- Check last payment status

3. **Check Outstanding Invoice**
```sql
SELECT * FROM invoices 
WHERE business_id = 'BUSINESS_ID' 
  AND status = 'failed'
ORDER BY created_at DESC 
LIMIT 1;
```

### Resolution Steps

**If payment genuinely failed:**
1. Contact customer: "Your payment failed. Please update your payment method."
2. Send payment link via email
3. Wait for payment to process
4. Webhook will auto-unfreeze account

**If payment succeeded but account still frozen:**
1. Manually unfreeze account:
```sql
UPDATE businesses 
SET is_frozen = false,
    frozen_at = NULL,
    frozen_reason = NULL
WHERE id = 'BUSINESS_ID';
```

2. Check webhook logs:
```bash
# In Supabase Dashboard → Edge Functions → stripe-webhook → Logs
# Look for invoice.payment_succeeded event
```

3. If webhook missed, manually trigger unfreezing:
   - Run SQL above
   - Send confirmation email to customer

### Prevention
- Monitor webhook delivery success rate
- Set up retry logic with dead-letter queue
- Alert on webhook failures

---

## RB-002: Message Delivery Failures (Bulk)

### Symptoms
- Multiple failed messages across different conversations
- Messages stuck in "sending" status
- Customer reports messages not going through

### Diagnostic Steps

1. **Check Message Failure Rate**
```sql
SELECT 
  channel,
  COUNT(*) as total_messages,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  ROUND(COUNT(*) FILTER (WHERE status = 'failed')::numeric / COUNT(*) * 100, 2) as failure_rate
FROM messages
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY channel
ORDER BY failure_rate DESC;
```

2. **Identify Affected Channel**
- If WhatsApp: Check Meta API status
- If Email: Check SMTP connection
- If SMS: Check Twilio status

3. **Check Provider Status**
- WhatsApp: https://developers.facebook.com/status/
- Twilio: https://status.twilio.com/
- Email: Check Resend/SMTP provider status

### Resolution Steps

**If provider is down:**
1. Acknowledge incident
2. Update status page (if you have one)
3. Wait for provider recovery
4. Messages will retry automatically

**If provider is up:**
1. Check recent code deploys:
```bash
# Check git log for recent changes to send functions
git log --since="2 hours ago" -- supabase/functions/*send*
```

2. Check edge function logs:
```bash
# Supabase Dashboard → Functions → whatsapp-send/email-send-smtp/sms-send → Logs
# Look for error patterns
```

3. **Common issues:**
   - **Rate limit exceeded:** Throttle sending, increase delay
   - **Invalid credentials:** Verify secrets in Supabase
   - **Malformed payload:** Check message validation

4. **Quick fix rollback:**
```bash
# If recent deploy caused it, rollback edge functions
git revert <commit_hash>
git push
```

### Prevention
- Monitor delivery success rate per channel
- Set up alerts at 5% failure rate
- Implement circuit breaker pattern

---

## RB-003: WhatsApp Webhook Down/Failing

### Symptoms
- WhatsApp messages not appearing in inbox
- Delivery status not updating
- Webhook signature errors in logs

### Diagnostic Steps

1. **Check Webhook Endpoint Status**
```bash
curl -X POST https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

Expected: 200 OK or proper error message

2. **Check Edge Function Logs**
```bash
# Supabase Dashboard → Functions → whatsapp-webhook → Logs
# Look for:
# - Signature verification failures
# - Timeout errors
# - 500 Internal Server Errors
```

3. **Verify Webhook Token**
```sql
SELECT value FROM secrets WHERE name = 'WHATSAPP_VERIFY_TOKEN';
```

### Resolution Steps

**If signature verification failing:**
1. Check WHATSAPP_VERIFY_TOKEN in Supabase matches Meta
2. Go to Meta → WhatsApp → Configuration → Verify Token
3. If mismatch, update Meta side (don't change secret)

**If webhook timing out:**
1. Check database connection pool:
```sql
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
```

2. If > 80% of max connections, investigate slow queries
3. Restart connections if needed

**If webhook returning 500:**
1. Check error in logs
2. Fix code issue
3. Deploy fix
4. Test with Meta webhook test button

### Recovery

1. **Replay missed webhooks:**
   - Unfortunately, Meta doesn't replay
   - Manually sync recent messages:
```sql
-- Check for gaps in message timestamps
SELECT conversation_id, 
       MAX(created_at) as last_message,
       NOW() - MAX(created_at) as time_since_last
FROM messages
WHERE channel = 'whatsapp'
GROUP BY conversation_id
HAVING NOW() - MAX(created_at) > INTERVAL '30 minutes'
ORDER BY time_since_last DESC;
```

2. Contact affected businesses, ask them to manually check WhatsApp

### Prevention
- Monitor webhook success rate
- Alert on >5% failure rate
- Implement webhook retry queue

---

## RB-004: Database High CPU (>80%)

### Symptoms
- Slow dashboard loading
- Queries timing out
- High database CPU alert

### Diagnostic Steps

1. **Check Current CPU Usage**
```bash
# Supabase Dashboard → Database → Performance
# Look at CPU graph
```

2. **Find Slow Queries**
```sql
SELECT 
  pid,
  usename,
  application_name,
  state,
  query_start,
  NOW() - query_start AS duration,
  LEFT(query, 100) AS query_snippet
FROM pg_stat_activity
WHERE state != 'idle'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC
LIMIT 10;
```

3. **Check for Missing Indexes**
```sql
SELECT 
  schemaname,
  tablename,
  seq_scan,
  idx_scan,
  seq_tup_read
FROM pg_stat_user_tables
WHERE seq_scan > 1000
  AND idx_scan < seq_scan
ORDER BY seq_scan DESC
LIMIT 10;
```

### Resolution Steps

**Immediate mitigation:**
1. **Kill long-running query (if safe):**
```sql
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE pid = <PROBLEMATIC_PID>;
```

2. **Add temporary rate limiting:**
   - Reduce edge function concurrency
   - Add request queuing

**Long-term fix:**
1. **Add missing indexes:**
```sql
-- Example: If messages table doing sequential scans
CREATE INDEX CONCURRENTLY idx_messages_conversation_created 
ON messages (conversation_id, created_at DESC);
```

2. **Optimize query:**
   - Add WHERE clauses to reduce scan size
   - Use LIMIT on large result sets
   - Add pagination

3. **Scale database:**
   - Upgrade to larger instance in Supabase
   - Enable read replicas if available

### Prevention
- Monitor slow query log daily
- Review database performance weekly
- Proactively add indexes for common queries

---

## RB-005: Stripe Webhook Signature Failure

### Symptoms
- Payments succeeding but not reflected in app
- Subscriptions not activating
- "Invalid signature" errors in stripe-webhook logs

### Diagnostic Steps

1. **Check Webhook Logs**
```bash
# Supabase Dashboard → Functions → stripe-webhook → Logs
# Look for "Invalid signature" or "Webhook error"
```

2. **Verify Webhook Secret**
```sql
SELECT value FROM secrets WHERE name = 'STRIPE_WEBHOOK_SECRET';
```

3. **Check Stripe Dashboard**
- Go to Stripe → Developers → Webhooks
- Click on webhook endpoint
- View recent delivery attempts
- Check if 400/401 errors

### Resolution Steps

**If secret mismatch:**
1. Get correct secret from Stripe:
   - Stripe Dashboard → Developers → Webhooks
   - Click on webhook
   - Click "Signing secret" → Reveal
   - Copy value

2. Update in Supabase:
```bash
# Supabase Dashboard → Settings → Edge Functions → Secrets
# Update STRIPE_WEBHOOK_SECRET
```

3. Test webhook:
```bash
# Stripe Dashboard → Developers → Webhooks → Send test webhook
```

**If webhook URL incorrect:**
1. Verify endpoint:
```
https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/stripe-webhook
```

2. Update in Stripe if wrong

3. Re-send failed events:
   - Stripe Dashboard → Developers → Webhooks → Failed Events
   - Click "Resend" on each failed event

### Recovery

**Manually sync subscription status:**
```sql
-- For each affected business, manually update from Stripe
UPDATE businesses
SET subscription_tier = 'starter',  -- Get from Stripe
    subscription_status = 'active',
    subscription_period_end = '2025-02-01'  -- Get from Stripe
WHERE stripe_customer_id = 'cus_...';  -- Customer ID from Stripe
```

### Prevention
- Monitor webhook success rate
- Alert on signature failures
- Implement webhook event replay queue

---

## RB-006: Mass Message Loss Suspected 🚨

### Symptoms
- Customers report missing messages
- Gap in message timestamps
- Webhook received but message not in database

### Diagnostic Steps

1. **Check for Message Gaps**
```sql
WITH message_times AS (
  SELECT 
    conversation_id,
    created_at,
    LAG(created_at) OVER (PARTITION BY conversation_id ORDER BY created_at) as prev_time
  FROM messages
  WHERE created_at > NOW() - INTERVAL '1 hour'
)
SELECT 
  conversation_id,
  created_at,
  prev_time,
  created_at - prev_time as gap
FROM message_times
WHERE created_at - prev_time > INTERVAL '10 minutes'
ORDER BY gap DESC
LIMIT 20;
```

2. **Check Webhook Logs for Failures**
```bash
# Check each channel's webhook logs
# Look for:
# - Unhandled exceptions
# - Database connection errors
# - Transaction rollbacks
```

3. **Compare Provider Records**
   - WhatsApp: Check Meta webhook logs
   - SMS: Check Twilio message logs
   - Email: Check IMAP server logs

### Resolution Steps

🚨 **THIS IS A P0 INCIDENT - ESCALATE IMMEDIATELY**

1. **Stop Accepting New Messages (if data loss continuing):**
```sql
-- Freeze all businesses temporarily
UPDATE businesses SET is_frozen = true;
```

2. **Identify Root Cause:**
   - Database transaction issue?
   - Race condition?
   - Duplicate message deduplication bug?

3. **Recover Lost Messages:**
   - Query provider APIs for missing messages
   - Manually insert into database
   - Verify no duplicates

4. **Notify Affected Customers:**
```
Subject: Service Incident Notification

We experienced a technical issue between [TIME] and [TIME] that may have affected message delivery. 

We have recovered all messages and no data was permanently lost. We sincerely apologize for any inconvenience.

If you notice any missing messages, please contact support immediately.
```

### Prevention

🚨 **THIS SHOULD NEVER HAPPEN**

1. Implement comprehensive chaos testing (DEF-004)
2. Add message idempotency keys
3. Implement outbox pattern for critical messages
4. Add database constraints to prevent duplicates
5. Add monitoring for message gap detection

---

## RB-007: Email Sync Stopped

### Symptoms
- New emails not appearing in inbox
- Last sync time > 10 minutes ago
- `email_accounts.last_sync_at` not updating

### Diagnostic Steps

1. **Check Last Sync Times**
```sql
SELECT 
  id,
  email,
  last_sync_at,
  NOW() - last_sync_at as time_since_sync,
  is_active,
  sync_enabled
FROM email_accounts
WHERE is_active = true
  AND sync_enabled = true
ORDER BY last_sync_at DESC;
```

2. **Check Edge Function Logs**
```bash
# Supabase Dashboard → Functions → email-sync → Logs
# Look for:
# - IMAP connection errors
# - Authentication failures
# - Timeout errors
```

3. **Check Cron Job**
```sql
SELECT * FROM cron.job WHERE jobname LIKE '%email%';
```

### Resolution Steps

**If cron job stopped:**
1. Check if `pg_cron` extension enabled
2. Verify cron job exists:
```sql
SELECT cron.schedule(
  'sync-emails',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url:='https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/email-sync',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

**If IMAP authentication failing:**
1. Check if email password changed
2. Check if OAuth token expired:
```sql
SELECT id, email, oauth_token_expires_at
FROM email_accounts
WHERE oauth_token_expires_at < NOW();
```

3. Trigger OAuth refresh if needed:
```bash
# Call oauth-refresh-tokens edge function
```

**If IMAP connection issue:**
1. Test connection manually:
```bash
# Use manual-imap-test edge function
curl -X POST https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/manual-imap-test \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{"accountId": "ACCOUNT_ID"}'
```

2. Check firewall/network issues
3. Verify IMAP settings

### Recovery

1. Manually trigger sync:
```bash
curl -X POST https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/email-sync \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

2. Check if sync successful:
```sql
SELECT last_sync_at FROM email_accounts WHERE id = 'ACCOUNT_ID';
```

### Prevention
- Monitor last_sync_at timestamps
- Alert if any account >15 minutes since sync
- Implement retry logic with exponential backoff

---

## RB-008: SMS Sending Failures

### Symptoms
- SMS messages stuck in "sending" status
- Twilio error messages in logs
- Customers report SMS not received

### Diagnostic Steps

1. **Check Failed SMS**
```sql
SELECT 
  id,
  conversation_id,
  content,
  status,
  error_message,
  created_at
FROM messages
WHERE channel = 'sms'
  AND status = 'failed'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

2. **Check Twilio Status**
- Go to https://status.twilio.com/
- Check if SMS API is operational

3. **Check Edge Function Logs**
```bash
# Supabase Dashboard → Functions → sms-send → Logs
# Look for error codes:
# - 21608: Invalid "To" number
# - 21614: Invalid "From" number
# - 21211: Invalid "To" country code
# - 30007: Carrier violation (spam)
```

### Resolution Steps

**If Twilio rate limit hit:**
1. Check account limits:
   - Twilio Console → Account → Limits
2. Implement message queuing with rate limit
3. Request limit increase from Twilio

**If invalid phone numbers:**
1. Validate phone numbers on input:
```javascript
// Add validation in MessageInput.tsx
import { parsePhoneNumber } from 'libphonenumber-js';

const isValid = parsePhoneNumber(phone, 'ZZ').isValid();
```

**If carrier blocking (spam):**
1. Check message content for spam triggers
2. Register sender ID with carriers
3. Add STOP/HELP opt-out handling
4. Implement message throughput limits

### Prevention
- Validate phone numbers before sending
- Monitor delivery rate per country
- Register sender IDs proactively
- Implement opt-out handling

---

## RB-009: Voice Calling Outage

### Symptoms
- Cannot make outbound calls
- Inbound calls not connecting
- Call UI shows error

### Diagnostic Steps

1. **Check Twilio Status**
- Go to https://status.twilio.com/
- Check Voice API status

2. **Check Voice Credit Balance**
```sql
SELECT 
  id,
  name,
  voice_credits_balance,
  voice_credits_used_current_period
FROM businesses
WHERE voice_credits_balance < 1.00;
```

3. **Check Edge Function Logs**
```bash
# Supabase Dashboard → Functions → call-outbound → Logs
# Look for:
# - "Insufficient credits"
# - Twilio authentication errors
# - Connection timeouts
```

### Resolution Steps

**If insufficient credits:**
1. Notify business owner:
```
Subject: Voice Calling Credits Low

Your voice calling credits are running low. Please top up to continue making calls.

Current balance: $X.XX
Purchase credits: [LINK]
```

2. Block outbound calls until topped up
3. Allow inbound calls to continue

**If Twilio credentials invalid:**
1. Verify secrets:
```sql
SELECT name FROM secrets 
WHERE name IN ('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN');
```

2. Test Twilio API:
```bash
curl -X GET "https://api.twilio.com/2010-04-01/Accounts.json" \
  -u "ACCOUNT_SID:AUTH_TOKEN"
```

3. Update credentials if invalid

**If Twilio service down:**
1. Acknowledge outage
2. Notify customers
3. Wait for Twilio recovery
4. Test once recovered

### Prevention
- Monitor voice credit balances
- Alert at $10 remaining
- Implement auto-recharge
- Monitor call success rate

---

## RB-010: Auth Service Down 🚨

### Symptoms
- Users cannot log in
- "Service unavailable" on /auth
- 500 errors in logs

### Diagnostic Steps

1. **Test Auth Endpoints**
```bash
# Test login
curl -X POST https://jrtlrnfdqfkjlkpfirzr.supabase.co/auth/v1/token \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'
```

2. **Check Supabase Status**
- Go to https://status.supabase.com/
- Check Auth service status

3. **Check Edge Function Health**
```bash
# Test a simple edge function
curl https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/check-subscription \
  -H "Authorization: Bearer test"
```

### Resolution Steps

🚨 **THIS IS A P0 INCIDENT - ESCALATE IMMEDIATELY**

**If Supabase outage:**
1. Check status page
2. Notify all users via email:
```
Subject: Service Disruption Notification

We are currently experiencing authentication issues due to our infrastructure provider. 

We are actively monitoring the situation and will restore service as soon as possible.

Status updates: [STATUS PAGE URL]
```

3. Wait for Supabase recovery
4. Test auth once recovered

**If database connection issue:**
1. Check database CPU/connections
2. Restart database connections
3. Scale database if needed

**If custom auth code issue:**
1. Check recent code changes
2. Rollback if recent deploy
3. Fix and redeploy

### Recovery

1. **Verify auth working:**
```bash
# Test login
curl -X POST https://jrtlrnfdqfkjlkpfirzr.supabase.co/auth/v1/token \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'
```

2. **Send recovery email:**
```
Subject: Service Restored

Our authentication service has been fully restored. You can now log in normally.

We apologize for any inconvenience this may have caused.
```

### Prevention
- Monitor auth endpoint health
- Set up multi-region failover (if possible)
- Implement graceful degradation
- Cache user sessions longer

---

## RB-011: Subscription Status Not Updating

### Symptoms
- User paid but still on Free tier
- Subscription in Stripe but not in database
- `check-subscription` returns wrong tier

### Diagnostic Steps

1. **Check Database vs Stripe**
```sql
SELECT 
  id,
  stripe_customer_id,
  subscription_tier,
  subscription_status,
  subscription_period_end
FROM businesses
WHERE id = 'BUSINESS_ID';
```

2. **Check Stripe Subscription**
- Stripe Dashboard → Customers → Search
- View active subscriptions
- Note subscription ID and tier

3. **Check Webhook Logs**
```bash
# Supabase Dashboard → Functions → stripe-webhook → Logs
# Look for customer.subscription.created or updated events
```

### Resolution Steps

**If webhook missed:**
1. Manually sync from Stripe:
```sql
UPDATE businesses
SET 
  subscription_tier = 'starter',  -- From Stripe
  subscription_status = 'active',
  subscription_period_end = '2025-02-01',  -- From Stripe
  stripe_subscription_id = 'sub_...',
  updated_at = NOW()
WHERE id = 'BUSINESS_ID';
```

2. Trigger `check-subscription` manually:
```bash
curl -X POST https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/check-subscription \
  -H "Authorization: Bearer USER_JWT"
```

**If subscription cancelled in Stripe but active in DB:**
1. Freeze account:
```sql
UPDATE businesses
SET 
  is_frozen = true,
  subscription_status = 'canceled',
  subscription_tier = 'free'
WHERE id = 'BUSINESS_ID';
```

2. Send cancellation confirmation email

### Prevention
- Monitor webhook success rate
- Implement webhook retry queue
- Add subscription sync check on login

---

## RB-012: Credit Balance Not Updating

### Symptoms
- User purchased credits but balance unchanged
- Messages deducting wrong amount
- Credit balance negative

### Diagnostic Steps

1. **Check Credit Balance**
```sql
SELECT 
  id,
  credit_balance,
  credit_balance_updated_at,
  message_count_current_period
FROM businesses
WHERE id = 'BUSINESS_ID';
```

2. **Check Recent Stripe Payments**
- Stripe Dashboard → Payments
- Find payment for credit purchase
- Check metadata includes `credits` and `type: credit_purchase`

3. **Check Webhook Processing**
```bash
# Supabase Dashboard → Functions → stripe-webhook → Logs
# Search for payment_intent.succeeded with credit purchase
```

### Resolution Steps

**If webhook missed:**
1. Manually add credits:
```sql
UPDATE businesses
SET 
  credit_balance = credit_balance + 500,  -- Amount purchased
  credit_balance_updated_at = NOW()
WHERE id = 'BUSINESS_ID';
```

2. Log manual adjustment:
```sql
INSERT INTO audit_logs (
  business_id,
  action,
  details,
  performed_by
) VALUES (
  'BUSINESS_ID',
  'manual_credit_addition',
  'Added 500 credits due to missed webhook',
  auth.uid()
);
```

**If credits deducted incorrectly:**
1. Check overage pricing in `stripeConfig.ts`
2. Recalculate correct cost
3. Refund difference:
```sql
UPDATE businesses
SET credit_balance = credit_balance + <REFUND_AMOUNT>
WHERE id = 'BUSINESS_ID';
```

### Prevention
- Monitor webhook success for credit purchases
- Add balance change alerts
- Audit credit deductions weekly

---

## RB-013: Realtime Updates Stopped

### Symptoms
- New messages not appearing without refresh
- Conversation list not updating
- "Live" indicator missing

### Diagnostic Steps

1. **Check Realtime Subscriptions**
```javascript
// In browser console
console.log(supabase.getChannels());
```

2. **Check Supabase Realtime Status**
- Supabase Dashboard → Database → Replication
- Verify replication enabled
- Check if publications exist

3. **Check RLS Policies**
```sql
-- Verify RLS policies allow SELECT
SELECT * FROM messages WHERE conversation_id = 'TEST_ID';
```

### Resolution Steps

**If subscriptions not connecting:**
1. Check browser console for WebSocket errors
2. Verify Supabase URL and anon key correct
3. Test connection:
```javascript
const channel = supabase
  .channel('test')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'messages' },
    (payload) => console.log(payload)
  )
  .subscribe((status) => console.log(status));
```

**If RLS blocking realtime:**
1. Verify RLS policies allow user to SELECT
2. Test as that user:
```sql
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "USER_ID"}';
SELECT * FROM messages WHERE conversation_id = 'CONV_ID';
```

**If Supabase realtime issue:**
1. Check status.supabase.com
2. Restart realtime connections:
```javascript
supabase.removeAllChannels();
// Re-subscribe
```

### Prevention
- Monitor realtime connection status
- Add connection health check
- Implement reconnection logic
- Alert on disconnection >30s

---

## RB-014: Edge Function High Error Rate

### Symptoms
- Multiple edge functions returning 500
- Increased latency
- Error rate spike in logs

### Diagnostic Steps

1. **Check Error Rate**
```bash
# Supabase Dashboard → Functions → View all
# Check error rate for each function
```

2. **Identify Common Errors**
```bash
# In each function's logs, look for:
# - Database connection errors
# - Timeout errors
# - Third-party API errors
# - Uncaught exceptions
```

3. **Check Recent Deploys**
```bash
git log --since="2 hours ago" -- supabase/functions/
```

### Resolution Steps

**If recent deploy caused it:**
1. Immediately rollback:
```bash
git revert <bad_commit>
git push
```

2. Wait 2-3 minutes for deploy
3. Verify error rate drops

**If database connection issue:**
1. Check connection pool:
```sql
SELECT count(*) FROM pg_stat_activity;
```

2. Close idle connections:
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '10 minutes';
```

**If third-party API down:**
1. Implement circuit breaker
2. Return cached data if available
3. Queue requests for retry

### Prevention
- Implement gradual rollouts
- Add smoke tests before deploy
- Monitor error rate per function
- Set up automated rollback

---

## RB-015: Storage Quota Exceeded

### Symptoms
- File upload failures
- "Storage quota exceeded" errors
- Images not loading

### Diagnostic Steps

1. **Check Storage Usage**
```sql
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM(size) / 1024 / 1024 / 1024 as size_gb
FROM storage.objects
GROUP BY bucket_id
ORDER BY size_gb DESC;
```

2. **Check Supabase Quota**
- Supabase Dashboard → Settings → Billing
- View storage usage vs quota

3. **Identify Large Files**
```sql
SELECT 
  id,
  name,
  bucket_id,
  size / 1024 / 1024 as size_mb,
  created_at
FROM storage.objects
ORDER BY size DESC
LIMIT 20;
```

### Resolution Steps

**Immediate:**
1. Upgrade Supabase plan if possible
2. Block new uploads temporarily:
```sql
-- Add size check to upload function
IF (SELECT SUM(size) FROM storage.objects) > QUOTA_LIMIT THEN
  RAISE EXCEPTION 'Storage quota exceeded';
END IF;
```

**Long-term:**
1. Implement file cleanup policy:
```sql
-- Delete files older than 90 days from temp uploads
DELETE FROM storage.objects
WHERE bucket_id = 'temp-uploads'
  AND created_at < NOW() - INTERVAL '90 days';
```

2. Compress images on upload
3. Move old files to cheaper storage (S3 Glacier)

### Prevention
- Monitor storage usage daily
- Alert at 80% quota
- Implement file retention policy
- Compress media on upload

---

## ESCALATION PROCEDURES

### When to Escalate

| Severity | Escalate After | To Whom |
|----------|---------------|---------|
| P0 (Critical) | 15 minutes | Engineering Manager + CTO |
| P1 (High) | 30 minutes | Engineering Manager |
| P2 (Medium) | 2 hours | Tech Lead |
| P3 (Low) | Next business day | Team standup |

### Escalation Contacts

**Engineering Manager:** manager@alacartechat.com  
**CTO:** cto@alacartechat.com  
**Superadmin:** hello@alacartesaas.com  

### Escalation Template

```
INCIDENT ESCALATION

Incident ID: INC-YYYY-MM-DD-NNN
Severity: [P0/P1/P2/P3]
Summary: [One-line description]

Impact:
- X customers affected
- Y messages delayed/lost
- Z revenue impact

Actions Taken:
1. [Action 1]
2. [Action 2]

Reason for Escalation:
[Why you need help]

Next Steps:
[What you recommend]
```

---

## POST-INCIDENT REVIEW (PIR)

After every P0/P1 incident, conduct a blameless PIR:

### PIR Template

1. **Incident Summary**
   - What happened
   - When it started/ended
   - Who was affected

2. **Timeline**
   - Key events with timestamps
   - Actions taken
   - Who was involved

3. **Root Cause**
   - Technical cause
   - Contributing factors
   - Why it wasn't caught earlier

4. **Impact**
   - Number of customers affected
   - Messages lost/delayed
   - Revenue impact
   - Reputational damage

5. **Action Items**
   - What we'll do to prevent recurrence
   - Owner for each action
   - Target completion date

6. **Lessons Learned**
   - What went well
   - What could be improved
   - Process changes needed

---

## MAINTENANCE CALENDAR

### Daily
- [ ] Check daily system report email
- [ ] Review critical alerts
- [ ] Check error budgets

### Weekly
- [ ] Review slow query log
- [ ] Check webhook success rate
- [ ] Review storage usage
- [ ] Check backup success

### Monthly
- [ ] Review PIRs
- [ ] Update runbooks
- [ ] Review SLOs
- [ ] Conduct fire drill

---

**Last Updated:** 2025-11-01  
**Next Review:** 2025-12-01  
**Maintained By:** SRE Team
