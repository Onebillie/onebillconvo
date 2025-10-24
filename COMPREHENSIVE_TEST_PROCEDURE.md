# Comprehensive Test Procedure for À La Carte Chat

## Executive Summary
This document outlines a complete testing procedure for all features, payments, limits, warnings, and security measures in the À La Carte Chat application.

---

## 1. AUTHENTICATION & ACCESS TESTS

### 1.1 User Registration
- [ ] Test signup with email/password
- [ ] Verify email confirmation flow (if enabled)
- [ ] Test automatic redirect to onboarding after signup
- [ ] Verify profile creation in database
- [ ] Test business creation for new users
- [ ] Test role assignment (agent by default)

### 1.2 User Login
- [ ] Test login with valid credentials
- [ ] Test login with invalid credentials
- [ ] Verify error messages are user-friendly
- [ ] Test redirect to dashboard after login
- [ ] Verify session persistence across page refreshes

### 1.3 Password Security
- [ ] Test password strength requirements
- [ ] Verify leaked password protection (currently DISABLED - needs enabling)
- [ ] Test password reset flow

---

## 2. SUBSCRIPTION & BILLING TESTS

### 2.1 Subscription Tiers
Test each tier configuration:

**Free Tier:**
- [ ] Verify 1 team member limit
- [ ] Verify 100 WhatsApp messages/month sending limit
- [ ] Verify unlimited receiving
- [ ] Verify 5 templates maximum
- [ ] Verify no AI assistant access
- [ ] Verify no API access

**Starter Tier ($29/mo):**
- [ ] Verify 2 team members
- [ ] Verify 1,000 WhatsApp messages/month
- [ ] Verify 20 templates
- [ ] Verify email integration access
- [ ] Test checkout flow for Starter

**Professional Tier ($79/mo):**
- [ ] Verify 10 team members
- [ ] Verify 10,000 WhatsApp messages/month
- [ ] Verify unlimited templates
- [ ] Verify AI assistant access (1,000 responses included)
- [ ] Verify API access enabled
- [ ] Test checkout flow for Professional

**Enterprise Tier ($199/mo):**
- [ ] Verify unlimited team members
- [ ] Verify unlimited messages
- [ ] Verify unlimited AI responses
- [ ] Test checkout flow for Enterprise

### 2.2 Subscription Checkout Flow
For each tier:
- [ ] Click "Subscribe" button
- [ ] Verify redirect to Stripe checkout
- [ ] Complete payment with test card (4242 4242 4242 4242)
- [ ] Verify redirect to success page
- [ ] Verify subscription activation in database
- [ ] Verify `check-subscription` returns correct tier
- [ ] Verify `subscriptionState` updates in AuthContext

### 2.3 Subscription Management
- [ ] Test "Manage Subscription" button
- [ ] Verify Stripe Customer Portal opens
- [ ] Test plan upgrade in portal
- [ ] Test plan downgrade in portal
- [ ] Test payment method update
- [ ] Test subscription cancellation
- [ ] Verify cancellation sets end date correctly

### 2.4 Credit Purchase Flow
Test each credit bundle:

**Small Bundle ($10 - 500 credits):**
- [ ] Click "Purchase Credits" 
- [ ] Select Small Bundle
- [ ] Complete checkout
- [ ] Verify credits added to account
- [ ] Verify database update

**Medium Bundle ($25 - 1,500 credits, 15% savings):**
- [ ] Complete purchase flow
- [ ] Verify correct credits added
- [ ] Verify savings calculation displayed

**Large Bundle ($75 - 5,000 credits, 25% savings):**
- [ ] Complete purchase flow
- [ ] Verify correct credits added
- [ ] Verify savings calculation displayed

### 2.5 Auto Top-Up (if implemented)
- [ ] Enable auto top-up
- [ ] Set threshold
- [ ] Set credit bundle
- [ ] Verify triggers when threshold reached
- [ ] Verify automatic credit purchase
- [ ] Verify email notification sent

---

## 3. MESSAGE LIMIT & WARNING TESTS

### 3.1 Message Limit Enforcement
For each tier, test message sending limits:

**Free Tier (100 messages):**
- [ ] Send 80 messages
- [ ] Verify no warning at 79 messages
- [ ] Send 1 more message (80 total)
- [ ] **VERIFY LimitReachedBanner appears (80% threshold)**
- [ ] Continue to 100 messages
- [ ] **VERIFY LimitReachedModal blocks sending at 100**
- [ ] Verify modal cannot be dismissed
- [ ] Verify "Upgrade" button works
- [ ] Verify "Buy Credits" button works

**Starter Tier (1,000 messages):**
- [ ] Test at 800 messages (80%)
- [ ] Verify warning banner appears
- [ ] Test at 1,000 messages
- [ ] Verify modal blocks sending

**Professional Tier (10,000 messages):**
- [ ] Test at 8,000 messages (80%)
- [ ] Verify warning banner appears
- [ ] Test at 10,000 messages
- [ ] Verify modal blocks sending

### 3.2 Credit System Tests
- [ ] Purchase credit bundle
- [ ] Use all monthly messages
- [ ] **VERIFY credits are consumed instead of blocking**
- [ ] **VERIFY LimitReachedBanner does NOT appear when credits available**
- [ ] Verify credit balance decreases with each message
- [ ] Use all credits
- [ ] Verify modal appears after both limits exhausted

### 3.3 Credit Warning System
**CRITICAL: Test credit expiry warnings**

- [ ] Set credits to expire in 30 days
- [ ] **VERIFY warning appears at 30 days before expiry**
- [ ] **VERIFY warning appears at 14 days before expiry**
- [ ] **VERIFY warning appears at 7 days before expiry**
- [ ] **VERIFY final warning at 1 day before expiry**
- [ ] Verify warning includes:
  - [ ] Number of credits expiring
  - [ ] Expiry date
  - [ ] Option to use credits
  - [ ] Option to purchase more

**NOTE:** Current implementation may be missing credit expiry warnings. This needs to be implemented.

### 3.4 Low Credit Balance Warnings
- [ ] Test CreditWarningDialog at 100 credits remaining
- [ ] Test CreditWarningDialog at 50 credits remaining
- [ ] Test CreditWarningDialog at 10 credits remaining
- [ ] Verify "Purchase Credits" button works
- [ ] Verify "Remind Me Later" button works

---

## 4. ACCOUNT FROZEN & RECOVERY TESTS

### 4.1 Payment Failure Scenario
- [ ] Simulate failed payment (use card 4000 0000 0000 0002)
- [ ] Verify `is_frozen` flag set in database
- [ ] **VERIFY AccountFrozenBanner appears at top of page**
- [ ] Verify banner is fixed position
- [ ] Verify banner shows amount due
- [ ] Verify "Pay Now" or "Update Payment" button

### 4.2 Frozen Account Behavior
**CRITICAL: Verify message handling during freeze**

- [ ] **VERIFY INCOMING messages still arrive**
- [ ] **VERIFY INCOMING messages are stored in database**
- [ ] **VERIFY SENDING messages is blocked**
- [ ] Verify user cannot send WhatsApp
- [ ] Verify user cannot send Email
- [ ] Verify user cannot send SMS
- [ ] **VERIFY users can still VIEW all messages**
- [ ] **VERIFY users can still ACCESS dashboard**
- [ ] Verify warning appears on all message sending attempts

### 4.3 Account Recovery
- [ ] Click "Pay Now" or "Update Payment" 
- [ ] Complete payment with valid card
- [ ] **VERIFY account unfreezes immediately**
- [ ] **VERIFY AccountFrozenBanner disappears**
- [ ] Verify sending is restored
- [ ] Verify no message queue/backlog issues

### 4.4 Grace Period (if implemented)
- [ ] Test 3-day grace period after payment failure
- [ ] Verify warning emails sent
- [ ] Verify account freezes after grace period
- [ ] Test payment during grace period

---

## 5. NAVIGATION & LINK TESTS

### 5.1 Public Pages
Test all links on each page:

**Landing Page (/):**
- [ ] "Try Free For 7 Days" → /signup
- [ ] "Features" → /features
- [ ] "Why Us" → /why-us
- [ ] "Pricing" → /pricing
- [ ] "FAQ" → /faq
- [ ] "Guides" → /guides
- [ ] "Privacy" → /privacy
- [ ] "Terms" → /terms
- [ ] "Sign In" → /auth
- [ ] Logo → /

**Features Page (/features):**
- [ ] All header links work
- [ ] "Get Started" → /signup
- [ ] "View Pricing" → /pricing
- [ ] Footer links work

**Why Us Page (/why-us):**
- [ ] All header links work
- [ ] "Start Free Trial" → /signup
- [ ] "See Pricing" → /pricing
- [ ] Footer links work

**Pricing Page (/pricing):**
- [ ] All header links work
- [ ] "Subscribe" buttons → Stripe checkout
- [ ] "Free Plan" button (disabled)
- [ ] "Current Plan" badge for logged-in users
- [ ] "Back to Dashboard" (if logged in) → /app/dashboard
- [ ] Footer links work

**FAQ Page (/faq):**
- [ ] All header links work
- [ ] "Get Started Free" → /signup
- [ ] "Read Our Guides" → /guides
- [ ] All accordion items expand/collapse
- [ ] Footer links work

**Guides Page (/guides):**
- [ ] All header links work
- [ ] "Start Your Free Trial" → /signup
- [ ] Footer links work

### 5.2 Authenticated Pages
**Dashboard (/app/dashboard):**
- [ ] "Settings" → /app/settings
- [ ] "Sign Out" → /auth
- [ ] Conversation list items clickable
- [ ] All channel filters work

**Settings (/app/settings):**
- [ ] All accordion sections expand
- [ ] "Manage Subscription" → Stripe portal
- [ ] "Purchase Credits" → CreditBundleDialog
- [ ] "Upgrade Plan" → UpgradeDialog
- [ ] "View Plans" → /pricing
- [ ] All sub-settings save correctly

### 5.3 Admin Pages (for superadmins)
- [ ] /admin → AdminDashboard
- [ ] /admin/users → UsersManagement
- [ ] /admin/subscriptions → SubscriptionManagement
- [ ] /admin/payments → PaymentsTracking
- [ ] /admin/pricing → PricingConfig
- [ ] /admin/enterprise → EnterpriseAccounts
- [ ] /admin/system-health → SystemHealth

### 5.4 404 Handling
- [ ] Test invalid URL (e.g., /invalid-page)
- [ ] Verify NotFound page renders
- [ ] Verify "Go Home" button works

---

## 6. PAYMENT EDGE FUNCTIONS TESTS

### 6.1 create-checkout Function
Test with authenticated user:
```bash
curl -X POST https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/create-checkout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"priceId": "price_1SGKezGwvNoo6Q8zqFoPV1vU", "quantity": 1}'
```

- [ ] Returns checkout session URL
- [ ] URL is valid Stripe checkout
- [ ] Metadata includes user_id
- [ ] Success URL is correct
- [ ] Cancel URL is correct

### 6.2 check-subscription Function
Test subscription status check:
```bash
curl -X POST https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/check-subscription \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

- [ ] Returns `subscribed: true/false`
- [ ] Returns correct `tier`
- [ ] Returns correct `product_id`
- [ ] Returns `subscription_end` date
- [ ] Returns `isFrozen` status
- [ ] Returns `seatCount`

### 6.3 customer-portal Function
Test Stripe portal access:
```bash
curl -X POST https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/customer-portal \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

- [ ] Returns portal session URL
- [ ] URL is valid
- [ ] Return URL is correct

### 6.4 purchase-credits Function
Test credit purchase:
```bash
curl -X POST https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/purchase-credits \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"priceId": "price_1SKP4tGwvNoo6Q8zD1T7LQ5n", "credits": 500}'
```

- [ ] Returns checkout URL
- [ ] Metadata includes credits amount
- [ ] Mode is "payment" (not subscription)

### 6.5 verify-payment-session Function
Test after Stripe checkout:
```bash
curl -X POST https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/verify-payment-session \
  -H "Content-Type: application/json" \
  -d '{"session_id": "cs_test_..."}'
```

- [ ] Returns payment status
- [ ] Returns subscription details
- [ ] Updates database correctly

---

## 7. STRIPE WEBHOOK TESTS

### 7.1 Webhook Configuration
- [ ] Verify webhook URL is configured: `https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/stripe-webhook`
- [ ] Verify STRIPE_WEBHOOK_SECRET is set in Supabase
- [ ] Verify these events are enabled:
  - [ ] customer.subscription.created
  - [ ] customer.subscription.updated
  - [ ] customer.subscription.deleted
  - [ ] invoice.payment_succeeded
  - [ ] invoice.payment_failed

### 7.2 Webhook Event Tests
Use Stripe Dashboard to send test events:

**customer.subscription.created:**
- [ ] Send test event
- [ ] Verify subscription activates
- [ ] Verify tier updates in database
- [ ] Verify user receives confirmation

**customer.subscription.updated:**
- [ ] Send test event
- [ ] Verify tier updates
- [ ] Verify seat count updates

**customer.subscription.deleted:**
- [ ] Send test event
- [ ] Verify account frozen
- [ ] Verify usage blocked

**invoice.payment_succeeded:**
- [ ] Send test event
- [ ] Verify account unfrozen
- [ ] Verify invoice recorded
- [ ] Verify email sent

**invoice.payment_failed:**
- [ ] Send test event
- [ ] Verify grace period starts (if implemented)
- [ ] Verify warning email sent
- [ ] Verify invoice marked failed

---

## 8. SECURITY AUDIT

### 8.1 Database Security (from Linter)
**CRITICAL ISSUES TO FIX:**

- [ ] **RLS Enabled No Policy (INFO)** - Some tables have RLS enabled but no policies
  - [ ] Identify affected tables
  - [ ] Create appropriate policies
  - [ ] Test policies work correctly

- [ ] **Function Search Path Mutable (WARN x6)** - Database functions lack secure search_path
  - [ ] Add `SET search_path = public` to all functions
  - [ ] Re-test functions after update

- [ ] **Extension in Public (WARN)** - Extensions in public schema
  - [ ] Move extensions to dedicated schema
  - [ ] Update references

- [ ] **Leaked Password Protection Disabled (WARN)**
  - [ ] Enable password leak protection in Supabase Auth settings
  - [ ] Test with known leaked password

### 8.2 Row Level Security (RLS) Tests
For each critical table:

**profiles:**
- [ ] Test user can read own profile
- [ ] Test user cannot read other profiles
- [ ] Test user can update own profile
- [ ] Test user cannot update other profiles

**businesses:**
- [ ] Test user can read own business
- [ ] Test user cannot read other businesses
- [ ] Test admin can update business settings
- [ ] Test agent cannot update critical settings

**conversations:**
- [ ] Test user can only see conversations for their business
- [ ] Test user cannot see other businesses' conversations
- [ ] Test RLS enforced on realtime subscriptions

**messages:**
- [ ] Test user can only see messages for their conversations
- [ ] Test user cannot access other businesses' messages
- [ ] Test RLS enforced on realtime subscriptions

**business_users:**
- [ ] Test user can only see team members in their business
- [ ] Test user cannot add users to other businesses

### 8.3 API Security Tests
- [ ] Test API endpoints require authentication
- [ ] Test API rate limiting works
- [ ] Test API key rotation
- [ ] Test SSO token validation
- [ ] Test file upload size limits
- [ ] Test file type validation
- [ ] Test virus scanning integration

### 8.4 Input Validation Tests
- [ ] Test SQL injection prevention
- [ ] Test XSS prevention in message content
- [ ] Test CSRF protection
- [ ] Test email validation
- [ ] Test phone number validation
- [ ] Test file upload validation

---

## 9. FEATURE-SPECIFIC TESTS

### 9.1 WhatsApp Integration
- [ ] Test sending text message
- [ ] Test sending image
- [ ] Test sending document
- [ ] Test sending template
- [ ] Test receiving message
- [ ] Test receiving media
- [ ] Test message status updates
- [ ] Test webhook reception
- [ ] Test rate limiting

### 9.2 Email Integration
- [ ] Test IMAP sync
- [ ] Test sending email via SMTP
- [ ] Test receiving email
- [ ] Test email threading
- [ ] Test attachments
- [ ] Test HTML rendering
- [ ] Test OAuth token refresh

### 9.3 SMS Integration
- [ ] Test sending SMS
- [ ] Test receiving SMS
- [ ] Test international numbers
- [ ] Test cost calculation
- [ ] Test delivery receipts

### 9.4 Instagram Integration
- [ ] Test sending DM
- [ ] Test receiving DM
- [ ] Test media messages
- [ ] Test story replies

### 9.5 Facebook Integration
- [ ] Test sending message
- [ ] Test receiving message
- [ ] Test Facebook comments
- [ ] Test page switching

### 9.6 AI Assistant
- [ ] Test AI response generation
- [ ] Test AI approval queue (if enabled)
- [ ] Test document training
- [ ] Test privacy settings
- [ ] Test AI response limits
- [ ] Test overage billing (Professional tier)
- [ ] Test unlimited usage (Enterprise tier)

### 9.7 Team Collaboration
- [ ] Test user invitation
- [ ] Test role assignment
- [ ] Test permissions enforcement
- [ ] Test conversation assignment
- [ ] Test internal notes
- [ ] Test team chat/InMail

### 9.8 Templates
- [ ] Test creating template
- [ ] Test using template
- [ ] Test template variables
- [ ] Test WhatsApp template submission
- [ ] Test template limits per tier

### 9.9 Tasks
- [ ] Test creating task
- [ ] Test assigning task
- [ ] Test task notifications
- [ ] Test task completion
- [ ] Test task filtering

### 9.10 Notifications
- [ ] Test browser push notifications
- [ ] Test notification permissions
- [ ] Test notification settings
- [ ] Test notification preferences

---

## 10. PERFORMANCE TESTS

### 10.1 Load Times
- [ ] Landing page loads < 2 seconds
- [ ] Dashboard loads < 3 seconds
- [ ] Settings page loads < 2 seconds
- [ ] Message list loads < 2 seconds

### 10.2 Scalability
- [ ] Test with 100 conversations
- [ ] Test with 1,000 messages
- [ ] Test with 10,000 messages
- [ ] Test pagination works smoothly
- [ ] Test search performance

### 10.3 Realtime Performance
- [ ] Test message delivery latency < 1 second
- [ ] Test realtime updates with multiple users
- [ ] Test connection stability
- [ ] Test reconnection after disconnect

---

## 11. MOBILE RESPONSIVENESS

### 11.1 Mobile Devices
Test on various screen sizes:
- [ ] iPhone 12/13/14 (390x844)
- [ ] iPhone 12/13/14 Plus (428x926)
- [ ] Android phones (360x800)
- [ ] Tablets (768x1024)

### 11.2 Touch Interactions
- [ ] Test swipe gestures
- [ ] Test tap targets (minimum 44x44px)
- [ ] Test mobile keyboard behavior
- [ ] Test pinch-to-zoom disabled where appropriate

---

## 12. BROWSER COMPATIBILITY

Test on major browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Chrome Mobile (latest)
- [ ] Safari Mobile (latest)

---

## 13. COMPLIANCE & GDPR

### 13.1 Data Privacy
- [ ] Test privacy policy is accessible
- [ ] Test terms of service are accessible
- [ ] Test cookie consent banner
- [ ] Test data export functionality
- [ ] Test data deletion functionality
- [ ] Test GDPR compliance for EU users

### 13.2 Email Compliance
- [ ] Test CAN-SPAM compliance
- [ ] Test unsubscribe links
- [ ] Test email preferences

---

## 14. DISASTER RECOVERY

### 14.1 Data Backup
- [ ] Verify automatic backups are enabled
- [ ] Test point-in-time recovery
- [ ] Test database restore

### 14.2 Error Handling
- [ ] Test graceful degradation
- [ ] Test error boundaries in React
- [ ] Test API timeout handling
- [ ] Test network failure recovery

---

## CRITICAL ISSUES IDENTIFIED

### Must Fix Before Production:

1. **Credit Expiry Warnings Missing**
   - Need to implement warnings 30, 14, 7, and 1 days before credit expiry
   - Add cron job to check expiring credits daily
   - Create CreditExpiryWarningDialog component

2. **Message Reception During Account Freeze**
   - VERIFY incoming messages still arrive when frozen
   - VERIFY they're stored in database
   - VERIFY users can view but not send

3. **Security Issues from Linter**
   - Fix RLS policies on tables
   - Add search_path to database functions
   - Enable leaked password protection

4. **Stripe Webhook Configuration**
   - VERIFY webhook is configured in Stripe dashboard
   - VERIFY all 5 required events are enabled
   - VERIFY signing secret is set in Supabase

5. **Test Payment Recovery Flow**
   - Ensure account unfreezes immediately after payment
   - Ensure no message queue issues

### Nice to Have:

1. Auto top-up functionality
2. Grace period for payment failures
3. Enhanced notification system
4. Advanced analytics

---

## Test Execution Checklist

- [ ] All authentication tests pass
- [ ] All subscription tests pass
- [ ] All limit tests pass
- [ ] All warning tests pass
- [ ] All frozen account tests pass
- [ ] All navigation tests pass
- [ ] All payment function tests pass
- [ ] All webhook tests pass
- [ ] All security tests pass
- [ ] All feature tests pass
- [ ] All performance tests pass
- [ ] All mobile tests pass
- [ ] All browser tests pass
- [ ] All compliance tests pass

## Sign-Off

- [ ] Development Team Lead
- [ ] QA Lead
- [ ] Security Officer
- [ ] Product Owner
- [ ] Legal/Compliance Officer

---

**Document Version:** 1.0
**Last Updated:** [Current Date]
**Next Review:** [Date + 1 month]
