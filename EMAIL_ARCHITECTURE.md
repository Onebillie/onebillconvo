# Email System Architecture

## Overview

This application uses **THREE SEPARATE AND INDEPENDENT** email systems. Each system operates independently with its own credentials, infrastructure, and purpose. Understanding this separation is critical for troubleshooting and configuration.

---

## 1. Supabase Authentication Emails (Built-in)

**Purpose**: User authentication flow emails
**Provider**: Supabase's built-in email service (default) or custom SMTP
**Configuration**: Supabase Dashboard → Authentication → Email Templates

### Email Types:
- ✉️ **Signup Confirmation**: Sent when a user creates an account
- 🔐 **Password Reset**: Sent when a user requests a password reset
- ✨ **Magic Link**: Sent for passwordless authentication
- 📧 **Email Change Confirmation**: Sent when a user changes their email address

### Important Notes:
- **Completely independent** from customer email sync system
- **Not using Resend** by default (uses Supabase's SMTP)
- Can be customized via Supabase Dashboard → Auth → Email Templates
- Redirect URLs MUST be configured in Supabase Dashboard → Auth → URL Configuration

### Required Configuration:
1. Go to: https://supabase.com/dashboard/project/jrtlrnfdqfkjlkpfirzr/auth/url-configuration
2. Set **Site URL**: `https://alacartechat.com`
3. Add **Redirect URLs**:
   - `https://alacartechat.com/auth`
   - `https://alacartechat.com/app/dashboard`
   - `https://alacartechat.com/app/onboarding`
   - Plus any preview URLs (e.g., `https://6e3a8087-ec6e-43e0-a6a1-d8394f40b390.lovableproject.com/*`)

### Troubleshooting:
- **Token Expired Error**: User needs to request a new verification email
- **Invalid Redirect URL**: Add the URL to Supabase Auth configuration
- **Emails Not Sending**: Check Supabase dashboard for email sending limits
- **Custom Branding**: Configure custom email templates in Supabase dashboard

### Edge Functions:
- `confirm-user-email`: Manually confirm a user's email (admin use only)

---

## 2. Customer Email Sync System (IMAP/POP3/SMTP)

**Purpose**: Sync customer business email accounts (OneBill, etc.) with the platform
**Provider**: Customer-provided IMAP/POP3/SMTP servers
**Configuration**: App Settings → Email Accounts

### Email Types:
- 📥 **Inbound Email Sync**: Fetch emails from customer's inbox via IMAP or POP3
- 📤 **Outbound Email Sending**: Send emails via customer's SMTP server

### Important Notes:
- **Completely independent** from Supabase auth emails
- **Not using Resend** - uses customer's own email servers
- Each customer (business) can have multiple email accounts configured
- Supports Gmail, Outlook, custom domains, etc.

### Configuration Tables:
- `email_accounts`: Stores IMAP/POP3/SMTP credentials per business
- `email_operation_logs`: Detailed logging of email sync operations
- `email_sync_logs`: High-level sync status tracking

### Edge Functions:
- `email-sync`: IMAP-based email syncing
- `email-sync-pop3`: POP3-based email syncing (alternative)
- `email-send-smtp`: Send emails via customer's SMTP
- `imap-test`: Test IMAP connection
- `imap-test-deep`: Deep IMAP diagnostics
- `manual-imap-test`: Manual IMAP testing
- `smtp-test`: Test SMTP connection
- `oauth-google-init`: Google OAuth for Gmail
- `oauth-google-callback`: Google OAuth callback
- `oauth-refresh-tokens`: Refresh OAuth tokens

### Troubleshooting:
- **IMAP Auth Failed**: Check username/password, may need app-specific password
- **POP3 Sync Issues**: Verify POP3 is enabled on the email server
- **SMTP Send Failed**: Verify outbound SMTP credentials and port (465/587)
- **OAuth Token Expired**: Re-authenticate with Google OAuth
- Check `email_operation_logs` for detailed diagnostics

### Security:
- Each business can only access their own email accounts (RLS enforced)
- Credentials are encrypted in the database
- OAuth tokens are securely stored and auto-refreshed

---

## 3. Resend Transactional Emails

**Purpose**: Platform-generated transactional emails and notifications
**Provider**: Resend.com
**Configuration**: Resend API Key stored as secret

### Email Types:
- 💳 **Payment Notifications**: Stripe payment confirmations, failures
- ⚠️ **Usage Alerts**: Credit warnings, limit notifications
- 🔔 **Account Alerts**: Account frozen, subscription changes
- 📊 **System Notifications**: Admin alerts, security notifications

### Important Notes:
- **Completely independent** from auth emails and customer email sync
- **Requires DNS verification** for custom domain (alacartechat.com)
- Monthly limit: 3,000 emails on free tier
- Current usage tracked in `api_usage_tracking` table

### Configuration:
- Resend API Key: Stored as secret `RESEND_API_KEY`
- Domain verification: https://resend.com/domains
- Sender email: Must be verified in Resend

### Edge Functions:
- `send-transactional-email`: Main function for sending transactional emails
- `send-payment-notification`: Payment-specific notifications
- `send-usage-alert`: Usage and limit alerts

### Troubleshooting:
- **Domain Not Verified**: Verify alacartechat.com in Resend dashboard
- **Limit Exceeded**: Check `api_usage_tracking` for current usage
- **Emails Not Delivered**: Verify sender email is approved in Resend
- API errors are logged to console and Supabase logs

---

## System Separation Summary

| System | Purpose | Provider | Config Location | Independent? |
|--------|---------|----------|----------------|--------------|
| **Supabase Auth** | User authentication | Supabase | Supabase Dashboard | ✅ Yes |
| **Customer Email Sync** | Business email accounts | Customer's servers | App Settings | ✅ Yes |
| **Resend Transactional** | Platform notifications | Resend.com | Secrets | ✅ Yes |

### Critical Points:
1. ⚠️ These systems **DO NOT** interfere with each other
2. ⚠️ Auth emails are **NOT** affected by customer email account issues
3. ⚠️ Resend transactional emails are **NOT** used for auth
4. ⚠️ Customer email sync is **NOT** used for platform emails

---

## Business Segregation

### Regular Users (Customers like OneBill):
- Access via `/auth` → `/app/dashboard`
- Can only see their own business data (enforced by RLS)
- Cannot access admin features
- Cannot see other businesses' data
- Email accounts are business-specific

### SuperAdmins (Platform Owners):
- Access via `/admin/login` → `/admin`
- Must have `superadmin` role in `user_roles` table
- Can view all businesses when in admin session (`is_admin_session()`)
- Admin session is device-fingerprint protected
- Separate auth flow from regular users

### Security:
- RLS policies enforce business isolation
- SuperAdmins blocked from regular user login at `/auth`
- Regular users cannot access `/admin/*` routes
- All admin actions are logged and monitored

---

## Troubleshooting Checklist

### Auth Email Issues:
1. ✅ Check Supabase Dashboard → Auth → URL Configuration
2. ✅ Verify redirect URLs are added
3. ✅ Check Site URL is set correctly
4. ✅ Look at auth logs in Supabase dashboard
5. ✅ Use `confirm-user-email` edge function to manually confirm users

### Customer Email Issues:
1. ✅ Check `email_accounts` table for correct credentials
2. ✅ Review `email_operation_logs` for detailed errors
3. ✅ Test IMAP/POP3/SMTP using test edge functions
4. ✅ Verify OAuth tokens haven't expired
5. ✅ Check if customer's email provider allows IMAP/POP3/SMTP

### Resend Issues:
1. ✅ Verify Resend API key is set correctly
2. ✅ Check domain verification status
3. ✅ Review `api_usage_tracking` for limit issues
4. ✅ Verify sender email is approved
5. ✅ Check edge function logs for errors

---

## Contact & Support

For issues:
1. Check relevant logs in Supabase dashboard
2. Review edge function logs for specific errors
3. Verify configuration in respective dashboards
4. Use test functions to diagnose connectivity issues
5. Review this documentation for system separation

**Remember**: Email issues in one system DO NOT affect the other systems!
