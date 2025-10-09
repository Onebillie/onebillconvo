# À La Carte Chat - System Testing Guide

## ✅ Setup Complete

All testing infrastructure has been deployed:

### 📊 What's Been Implemented

1. **Testing Dashboard** at `/admin/testing`
   - Visual interface for all tests
   - Real-time API usage monitoring
   - Email testing buttons
   - System health checks

2. **Database Tables**
   - `system_test_results` - Stores test run history
   - `api_usage_tracking` - Tracks daily API limits
   - `usage_alerts_sent` - Prevents duplicate alerts

3. **Edge Functions**
   - `test-email-send` - Test email delivery
   - `send-usage-alert` - Automated usage alerts
   - `run-system-tests` - System health checks
   - `check-api-limits` - Real-time usage tracking

4. **Automated Monitoring (Cron Jobs)**
   - **Daily 8:00 AM UTC**: Check API usage, send alerts if needed
   - **Every Hour**: Update API usage statistics
   - **Daily 9:00 AM UTC**: Run full system tests

### 🎯 How to Use the Testing Dashboard

#### Access the Dashboard
1. Log in as SuperAdmin
2. Navigate to `/admin/testing`

#### Email System Testing
Click these buttons to test email delivery:
- **Basic Test**: Simple test email to verify sending works
- **Payment Success**: Preview payment confirmation template
- **Payment Failed**: Preview payment failure template  
- **Usage Alert**: Preview API usage alert template

All test emails go to: `hello@alacartesaas.com`

#### API Usage Monitoring
The dashboard shows real-time usage for:
- **VirusTotal**: File scanning (500 requests/day free tier)
- **Resend**: Email sending (3,000 emails/month free tier)
- **Supabase DB**: Database storage (8GB free tier)
- **Supabase Storage**: File storage (5GB free tier)

**Status Indicators:**
- 🟢 **Healthy**: 0-79% used
- 🟡 **Caution**: 80-89% used
- 🟠 **Warning**: 90-94% used  
- 🔴 **Critical**: 95-100% used

#### Automated Tests
Click **"Run All Tests"** to check:
1. **Database Tables**: Verify all required tables exist
2. **RLS Policies**: Ensure security policies are active
3. **Configuration**: Check subscription tiers are valid
4. **Data Integrity**: Find orphaned records
5. **Secrets**: Verify API keys are configured

### 📧 Email Alert System

You'll receive automatic email alerts to `hello@alacartesaas.com` when:

1. **API Usage Alerts**
   - VirusTotal reaches 80%, 90%, or 95% of daily limit
   - Resend approaches monthly email limit
   - Database storage reaches capacity

2. **System Issues**
   - Critical test failures
   - Webhook processing errors
   - Security policy violations

### 🧪 Manual Testing Workflows

#### Test 1: Email Verification Flow
1. Open incognito browser
2. Go to `/pricing`
3. Click "Get Started" on Starter plan
4. Complete signup form
5. Check email for verification link
6. Click verification link, sign in
7. Should see "Complete Payment" banner on dashboard
8. Click banner → redirects to Stripe checkout
9. Use test card: `4242 4242 4242 4242`
10. Complete payment
11. Should redirect to success page
12. Banner should disappear

#### Test 2: Malware Scanning
1. Go to customer conversation
2. Try uploading these file types:
   - ✅ PDF (should pass)
   - ❌ .exe file (should block)
   - ❌ .bat file (should block)
3. Check `security_logs` table for entries
4. Verify VirusTotal API usage increments

#### Test 3: Stripe Webhook
1. Go to Stripe Dashboard → Webhooks
2. Verify webhook is configured:
   - URL: `https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/stripe-webhook`
   - Events: subscription.*, invoice.*
3. Create test subscription in Stripe
4. Check `businesses` table updates
5. Check `invoices` table for records

### 🔍 Troubleshooting

#### Email Not Sending
1. Check DNS verification in Resend dashboard
2. Verify all DNS records are active (can take 24-48 hours)
3. Check edge function logs for errors
4. Ensure `RESEND_API_KEY` secret is set

#### API Limit Errors
1. Check current usage in testing dashboard
2. Review security logs for unusual activity
3. Consider upgrading API tiers if needed:
   - VirusTotal Premium: $200/month unlimited
   - Resend Pro: $10/month 50k emails

#### Test Failures
1. Click "Run All Tests" to see details
2. Check test results table for error messages
3. Review edge function logs
4. Verify database migrations completed

### 📊 Understanding Test Results

**Test Statuses:**
- 🟢 **Pass**: Test completed successfully
- 🔴 **Fail**: Critical issue detected, needs immediate fix
- 🟡 **Warning**: Non-critical issue, should investigate

**Common Issues:**
- Missing RLS policies: Add security policies to tables
- Orphaned records: Run data cleanup scripts
- Invalid configurations: Update subscription tiers

### 🔐 Security Notes

1. **Secrets Management**: All API keys stored in Supabase secrets
2. **RLS Policies**: Database access controlled by Row Level Security
3. **Webhook Verification**: Stripe webhooks verify signatures
4. **File Scanning**: VirusTotal checks all uploads before acceptance

### 📈 Monitoring Best Practices

1. **Check Dashboard Daily**: Review API usage trends
2. **Monitor Alerts**: Respond to usage alerts promptly
3. **Review Test Results**: Check automated test history weekly
4. **Update Limits**: Adjust API tiers as usage grows

### 🚀 Next Steps

1. ✅ DNS verification complete (you did this!)
2. ✅ Testing infrastructure deployed
3. ✅ Automated monitoring active
4. 🎯 **Now**: Run manual tests in dashboard
5. 🎯 **Monitor**: Check dashboard daily for first week
6. 🎯 **Optimize**: Adjust alert thresholds as needed

### 📞 Support

If you encounter issues:
1. Check edge function logs in Supabase dashboard
2. Review security logs table for errors
3. Test email delivery using dashboard buttons
4. Verify cron jobs are running: Check `cron.job_run_details` table

---

**System Status**: 🟢 All systems operational

Last Updated: October 9, 2025
