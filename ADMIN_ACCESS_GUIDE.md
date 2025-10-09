# SuperAdmin Access Guide

## 🔐 Overview

This guide explains the complete separation between SuperAdmin (platform management) and Business User (customer operations) access in À La Carte Chat.

---

## For SuperAdmin Users

### 🚪 Login Access

**URL**: `https://alacartechat.com/admin/login`

**Credentials**:
- Email: `hello@alacartesaas.com`
- Password: [Secure password stored separately]

### ✅ What You Can Access in Admin Mode

- ✅ **System Health Monitoring**: Real-time status of all platform services
- ✅ **Subscription Management**: View and manage all customer subscriptions
- ✅ **Payment Tracking**: Monitor payments, invoices, and revenue
- ✅ **User Management**: View all users across all businesses
- ✅ **Pricing Configuration**: Set and adjust pricing tiers
- ✅ **System Testing**: Run comprehensive system tests
- ✅ **Analytics**: Platform-wide usage and performance metrics

### ❌ What You CANNOT Access in Admin Mode

- ❌ Customer conversations
- ❌ Business messages (WhatsApp, Email, etc.)
- ❌ Message templates
- ❌ Tasks and calendar events
- ❌ Contact management
- ❌ AI training data
- ❌ Business-specific settings

### 🔒 Security Features

1. **Session Management**:
   - Admin sessions expire after 8 hours
   - Separate from business user sessions
   - Cannot be logged into both simultaneously

2. **Email Alerts**:
   - Every SuperAdmin login sends an email to `hello@alacartesaas.com`
   - Alert includes timestamp, IP address, and user agent
   - Allows immediate detection of unauthorized access

3. **Activity Logging**:
   - All admin sessions logged in `admin_sessions` table
   - Tracks: login time, IP address, user agent, session status
   - Can be audited for security reviews

4. **Visual Indicators**:
   - Red/orange color scheme for admin interface
   - "🔐 SuperAdmin Mode Active" banner at top
   - Distinct branding to prevent confusion

### 🚪 Logout Behavior

When you sign out from the admin portal:
- Admin session is terminated
- All admin permissions revoked
- Automatically redirected to `/admin/login`
- Cannot access `/app` routes without separate login

---

## For Business Users

### 🚪 Login Access

**URL**: `https://alacartechat.com/auth`

**Use regular business account credentials**

### ✅ What You Can Access

- ✅ Customer conversations (WhatsApp, Email, etc.)
- ✅ Message templates
- ✅ Contact management
- ✅ Task management
- ✅ Calendar sync
- ✅ AI chatbot training
- ✅ Team collaboration
- ✅ Business settings
- ✅ Analytics (business-specific)

### ❌ What You CANNOT Access

- ❌ Admin portal (`/admin`)
- ❌ Other businesses' data
- ❌ System-wide settings
- ❌ Platform pricing configuration
- ❌ Subscription management (all businesses)
- ❌ Payment tracking (all businesses)

### 🚪 Logout Behavior

When you sign out from the business portal:
- Business session terminated
- Redirected to `/auth`
- Can log back in to access business features

---

## Architecture Details

### Database Tables

1. **`admin_sessions`**:
   - Tracks active admin sessions
   - Fields: `user_id`, `created_at`, `expires_at`, `ip_address`, `user_agent`, `is_active`
   - Auto-expires after 8 hours
   - RLS: Only superadmins can view their own sessions

2. **`user_roles`**:
   - Stores user role assignments
   - Roles: `superadmin`, `admin`, `agent`
   - RLS: Separate function prevents recursive checks

### Security Functions

1. **`is_admin_session()`**:
   - Checks if current user has active admin session
   - Used in RLS policies to control data access
   - Security definer function to prevent RLS recursion

2. **`has_role(user_id, role)`**:
   - Checks if user has specific role
   - Used throughout RLS policies
   - Security definer for performance

### RLS Policy Updates

Updated policies enforce session-based access control:

```sql
-- Businesses table
CREATE POLICY "Users can view businesses they belong to"
ON public.businesses FOR SELECT
USING (
  (
    (id IN (SELECT get_user_business_ids(auth.uid())) OR owner_id = auth.uid())
    AND NOT is_admin_session()  -- Block if in admin session
  )
  OR
  (has_role(auth.uid(), 'superadmin'::app_role) AND is_admin_session())  -- Allow in admin mode
);

-- Similar updates for: conversations, messages, customers
```

---

## Testing Checklist

### ✅ SuperAdmin Access Tests

1. **Login Flow**:
   - [ ] Navigate to `/admin/login`
   - [ ] Login with `hello@alacartesaas.com`
   - [ ] Verify redirect to `/admin` dashboard
   - [ ] Verify email alert received
   - [ ] Verify red/orange admin theme

2. **Access Control**:
   - [ ] Try to access `/app/dashboard` while in admin mode
   - [ ] Should be blocked/redirected
   - [ ] Verify cannot see business data
   - [ ] Can access admin-only features

3. **Session Management**:
   - [ ] Verify session entry in `admin_sessions` table
   - [ ] Check `is_active = true`
   - [ ] Verify `expires_at` is 8 hours from now
   - [ ] Logout and verify session deactivated

### ✅ Business User Access Tests

1. **Login Flow**:
   - [ ] Navigate to `/auth`
   - [ ] Login with business account
   - [ ] Verify redirect to `/app/dashboard`
   - [ ] Verify blue/green business theme

2. **Access Control**:
   - [ ] Can access conversations, messages, etc.
   - [ ] Try to access `/admin` routes
   - [ ] Should be blocked (403/redirect)
   - [ ] Cannot see other businesses' data

3. **Logout**:
   - [ ] Logout from business portal
   - [ ] Verify redirect to `/auth`
   - [ ] Cannot access protected routes

### ✅ Cross-Contamination Tests

1. **SuperAdmin Blocked from Business Login**:
   - [ ] Try to login at `/auth` with `hello@alacartesaas.com`
   - [ ] Should show error: "Use admin login portal"
   - [ ] Automatically signed out

2. **Business User Blocked from Admin**:
   - [ ] Login as business user
   - [ ] Try to access `/admin/login`
   - [ ] Try to access `/admin` routes
   - [ ] Should be blocked/redirected

---

## Troubleshooting

### "Access Denied" on Admin Login

**Problem**: Admin login shows "Access Denied"

**Solutions**:
1. Verify `hello@alacartesaas.com` has `superadmin` role in `user_roles` table
2. Check if account exists in Supabase Auth
3. Verify RLS policies allow admin session creation

### Admin Session Expired Too Soon

**Problem**: Session expires before 8 hours

**Solutions**:
1. Check `admin_sessions.expires_at` value
2. Verify no automatic cleanup jobs running
3. Check for browser/tab closure (sessions tied to active auth)

### Email Alerts Not Received

**Problem**: No security email on admin login

**Solutions**:
1. Check Resend API key is configured
2. Verify `admin-login-alert` edge function is deployed
3. Check Resend domain is verified
4. Review edge function logs for errors

### Cannot Access Business Portal

**Problem**: SuperAdmin cannot access `/app` routes

**Solutions**:
1. This is **EXPECTED BEHAVIOR**
2. SuperAdmin accounts are intentionally blocked from business features
3. Create separate business user account if needed
4. Use correct login portal for each mode

---

## Security Best Practices

1. **Never share admin credentials**
2. **Monitor email alerts for unauthorized access**
3. **Regularly review `admin_sessions` table for anomalies**
4. **Use strong, unique password for admin account**
5. **Enable 2FA (when implemented)**
6. **Audit admin actions periodically**
7. **Keep admin access limited to minimum necessary personnel**

---

## Contact & Support

For security concerns or access issues:
- **Email**: hello@alacartesaas.com
- **Emergency**: Review `admin_sessions` table for unauthorized access

---

**Last Updated**: 2025-10-09
**Version**: 1.0
