# Resend Email DNS Verification

## CRITICAL: Verify Your Email Domain

Your transactional emails (payment confirmations, account notifications) will not be delivered until you verify your domain with Resend.

### Current Status
❌ Domain `alacartechat.com` is NOT verified
❌ Emails may bounce or reach spam
❌ Payment notifications won't send

### Why DNS Verification Is Required
- **SPF**: Prevents email spoofing
- **DKIM**: Cryptographically signs emails
- **DMARC**: Tells recipients what to do with failed emails

Without these records, email providers (Gmail, Outlook, etc.) will reject or spam your messages.

### Setup Instructions

#### Step 1: Access Resend Dashboard
1. Go to [Resend Domains](https://resend.com/domains)
2. Log in to your account
3. Click on your domain `alacartechat.com`

#### Step 2: Get DNS Records
You'll see 3 types of records to add:

**1. SPF Record**
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
TTL: 3600
```

**2. DKIM Records** (You'll have 2-3 of these)
```
Type: TXT
Name: resend._domainkey
Value: [Unique value from Resend dashboard]
TTL: 3600
```

**3. DMARC Record** (Optional but recommended)
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@alacartechat.com
TTL: 3600
```

#### Step 3: Add Records to Your DNS Provider

**If using Cloudflare:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select `alacartechat.com`
3. Click **DNS** → **Records**
4. Click **Add record**
5. Add each record from Resend
6. Save

**If using GoDaddy:**
1. Go to [GoDaddy DNS Management](https://dcc.godaddy.com/manage/dns)
2. Find `alacartechat.com`
3. Click **Manage DNS**
4. Add TXT records
5. Save

**If using Namecheap:**
1. Go to Domain List
2. Click **Manage** next to `alacartechat.com`
3. Go to **Advanced DNS**
4. Add TXT records
5. Save

**If using other providers:**
- Follow your provider's documentation for adding TXT records
- Add all records exactly as shown in Resend dashboard

#### Step 4: Verify in Resend
1. Return to [Resend Domains](https://resend.com/domains)
2. Click **Verify Records**
3. Wait for verification (can take 5-60 minutes for DNS propagation)
4. Status should change to ✅ **Verified**

#### Step 5: Test Email Sending
Once verified, test emails:
```bash
# From your system, send a test payment email
```

Check:
- Email arrives in inbox (not spam)
- From address shows "AlaCarte Chat <noreply@alacartechat.com>"
- No warning banners about unverified sender

### DNS Propagation Time
- **Typical**: 5-30 minutes
- **Maximum**: 24-48 hours
- **Check status**: Use [DNS Checker](https://dnschecker.org/)

### Troubleshooting

#### ❌ Records not verifying
- Wait 30 more minutes (DNS takes time)
- Check records are added to correct domain
- Ensure no typos in record values
- Verify TTL is set to 3600 or "Automatic"

#### ❌ Emails still bouncing
- Check Resend Dashboard → Logs
- Verify "From" address uses verified domain
- Check recipient spam folder
- Ensure DMARC policy is set to "none" initially

#### ❌ SPF record conflicts
- If you have existing SPF record, merge them:
  ```
  v=spf1 include:_spf.resend.com include:_spf.google.com ~all
  ```

### Email Templates Status

Once DNS is verified, these email templates need to be created:

- [ ] Welcome email (React Email template)
- [ ] Payment success email
- [ ] Payment failed email
- [ ] Account frozen warning
- [ ] Invoice email

See `P1 fixes` in main analysis for template creation.

### Current Email Configuration

**Sender Address**
```typescript
from: "AlaCarte Chat <noreply@alacartechat.com>"
```

**Edge Function**: `send-transactional-email`
- Status: ✅ Created
- API Key: ✅ Configured (`RESEND_API_KEY`)
- Domain: ❌ NOT VERIFIED

**Email Types Sent**
1. Payment succeeded
2. Payment failed
3. Account frozen
4. Subscription cancelled

### Verification Checklist

- [ ] Resend account created
- [ ] Domain `alacartechat.com` added to Resend
- [ ] SPF record added to DNS
- [ ] DKIM records added to DNS
- [ ] DMARC record added to DNS (optional)
- [ ] Records verified in Resend (green checkmark)
- [ ] Test email sent successfully
- [ ] Email received in inbox (not spam)

### Alternative: Use resend.dev Domain

If you don't own `alacartechat.com` or can't access DNS:

**Temporary Solution**
Update edge function to use Resend's shared domain:
```typescript
from: "AlaCarte Chat <onboarding@resend.dev>"
```

⚠️ **Not recommended for production**:
- Looks less professional
- Lower deliverability
- Shared reputation with other users

### Priority

⚠️ **P0 Blocker** - Required before launch

Without verified domain:
- Customers won't receive payment confirmations
- Failed payment warnings won't send
- Account freeze notifications won't deliver
- System appears broken to users

**Estimated setup time**: 15-30 minutes + DNS propagation
**Urgency**: CRITICAL

### Support

- [Resend Documentation](https://resend.com/docs/dashboard/domains/introduction)
- [DNS Propagation Checker](https://dnschecker.org/)
- [Resend Support](https://resend.com/support)
