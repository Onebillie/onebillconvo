# 📱 CHANNEL TESTING PROCEDURES

## WhatsApp Testing

### Prerequisites
- WhatsApp Business API account configured
- Phone number verified
- Webhook URL configured in Meta dashboard

### Test Sending
```bash
1. Open dashboard → Select conversation
2. Ensure customer has whatsapp_phone populated
3. Type message: "Test WhatsApp send at [timestamp]"
4. Click Send
5. VERIFY: Message shows in chat with "sent" status
6. VERIFY: Customer receives message on WhatsApp
7. VERIFY: message_count_current_period increments in businesses table
```

### Test Receiving
```bash
1. Send WhatsApp message TO business number
2. Message content: "Test inbound at [timestamp]"
3. VERIFY: Webhook received (check whatsapp-webhook logs)
4. VERIFY: Message appears in dashboard within 2 seconds
5. VERIFY: Conversation updated (last_message_at)
6. VERIFY: Real-time update (no page refresh needed)
```

### Test Attachments
```bash
1. Send image via WhatsApp
2. VERIFY: Image appears in chat
3. VERIFY: Image downloadable
4. VERIFY: Malware scan triggered (if VirusTotal configured)
5. Send PDF
6. VERIFY: PDF preview available
7. VERIFY: Download works
```

### Test Voice Notes
```bash
1. Record voice note in widget
2. Click send
3. VERIFY: Waveform shows in chat
4. VERIFY: Voice player appears
5. VERIFY: Playback works
```

---

## 📧 EMAIL TESTING

### Prerequisites
- Email account configured in Settings → Channels → Email
- SMTP settings correct (mail.onebill.ie:465)
- IMAP/POP3 settings correct (mail.onebill.ie:995)
- Sync enabled

### Test Sending
```bash
1. Open conversation with email customer
2. Switch channel to "Email"
3. Type message: "Test email send at [timestamp]"
4. Subject auto-filled from template
5. Click Send
6. VERIFY: Message inserted as "pending" status
7. VERIFY: email-send-smtp function triggered
8. VERIFY: Email bundling works (2min window)
9. Check recipient inbox
10. VERIFY: Email received with custom template
11. VERIFY: Signature included
12. VERIFY: Styling matches business_settings.email_html_template
```

### Test Receiving
```bash
1. Send email TO hello@onebill.ie or autoswitch@onebill.ie
2. Subject: "Test inbound email"
3. Body: "This is a test at [timestamp]"
4. Wait for POP3 sync (1 minute interval)
5. VERIFY: email-sync-pop3 function executes
6. VERIFY: Message appears in dashboard
7. VERIFY: Conversation created/updated
8. VERIFY: Customer record created if new email
```

### Test Email Threading
```bash
1. Send initial email to customer
2. Customer replies
3. VERIFY: Reply appears in same conversation
4. VERIFY: Threading maintained (In-Reply-To header)
5. Agent replies again
6. VERIFY: Full thread visible in email client
```

### Test Email Bundling
```bash
1. Send message at 00:00
2. Send message at 00:01
3. Send message at 00:01:30
4. VERIFY: All 3 bundled into ONE email
5. VERIFY: Sent at 00:02 (after 2min window)
6. VERIFY: Email contains all 3 messages
```

---

## 📱 SMS TESTING

### Prerequisites
- Twilio account configured
- Phone number verified
- SMS account in Settings → Channels → SMS

### Test Sending
```bash
1. Open conversation with phone number
2. Switch channel to "SMS"
3. VERIFY: SmsCostCalculator appears
4. Type message: "Test SMS"
5. VERIFY: Cost shown (e.g., $0.0075 per segment)
6. Click Send
7. VERIFY: sms-send function called
8. VERIFY: Message sent via Twilio
9. Check phone
10. VERIFY: SMS received
```

### Test Receiving
```bash
1. Reply to business SMS from customer phone
2. Message: "Test SMS reply"
3. VERIFY: Twilio webhook triggered
4. VERIFY: sms-webhook function executes
5. VERIFY: Message appears in dashboard
6. VERIFY: Conversation updated
```

### Test Multi-Segment SMS
```bash
1. Type message > 160 characters
2. VERIFY: Calculator shows multiple segments
3. VERIFY: Cost multiplied correctly
4. Send message
5. VERIFY: Customer receives as single SMS (if supported)
```

---

## 🌐 WIDGET TESTING

### Prerequisites
- Embed token created with site_id
- Test HTML page ready
- Widget customization configured

### Test Installation
```bash
1. Go to Settings → Widget → Embed Tokens
2. Click "Create New Token"
3. Name: "Test Website"
4. Domains: "localhost, example.com"
5. Click Create
6. Click "Show Embed Code"
7. Copy code
8. Create test.html:
   ```html
   <!DOCTYPE html>
   <html>
   <head><title>Widget Test</title></head>
   <body>
     <h1>Test Page</h1>
     <!-- Paste embed code here -->
   </body>
   </html>
   ```
9. Open test.html in browser
10. VERIFY: Chat icon appears in bottom-right
```

### Test Widget Functionality
```bash
1. Click chat icon
2. VERIFY: Chat window opens
3. VERIFY: Greeting message shows
4. Type: "Hello from widget"
5. Press Enter
6. VERIFY: Message appears in widget
7. Open dashboard
8. VERIFY: Message appears in conversation
9. Reply from dashboard: "Hi! How can we help?"
10. VERIFY: Reply appears in widget (within 3 seconds)
```

### Test Security
```bash
1. Open DevTools → Network tab
2. Send message from widget
3. Inspect POST to /embed-message
4. VERIFY: Headers contain x-session-token
5. VERIFY: NO token in request body
6. VERIFY: NO token in response
7. Check localStorage/sessionStorage
8. VERIFY: No tokens stored
```

### Test Customization
```bash
1. Go to Settings → Widget → Customization
2. Change primary color to #ff0000 (red)
3. Change position to "bottom-left"
4. Change greeting: "Welcome to support!"
5. Add custom CSS: ".chat-button { border: 2px solid gold; }"
6. Click Save
7. Reload test.html
8. VERIFY: Icon now bottom-left
9. VERIFY: Icon has gold border
10. Open chat
11. VERIFY: Red color theme
12. VERIFY: Custom greeting shows
```

---

## 🚨 LIMIT ENFORCEMENT TESTING

### Test #1: Warning at 80%
```bash
1. On Starter tier (1,000 message limit)
2. Use admin tools or SQL to set message_count_current_period = 800
3. Refresh dashboard
4. VERIFY: LimitReachedBanner shows at top
5. VERIFY: Text says "Approaching limit: 800/1,000 (80%)"
6. VERIFY: Orange/warning styling
7. VERIFY: "Buy Credits" and "Upgrade Plan" buttons show
8. Click "Buy Credits"
9. VERIFY: CreditBundleDialog opens
```

### Test #2: Blocked at 100%
```bash
1. Set message_count_current_period = 1000
2. Refresh dashboard
3. VERIFY: Banner changes to "Message limit reached!"
4. VERIFY: Red/error styling
5. Open any conversation
6. Try to type message
7. VERIFY: Can still type (not disabled yet)
8. Click Send
9. VERIFY: LimitReachedModal appears (full-screen overlay)
10. VERIFY: Shows "Message Limit Reached" title
11. VERIFY: Shows current usage: 1000/1000
12. VERIFY: Shows "Recommended: Professional" card
13. VERIFY: Price shown: $79/month
14. VERIFY: "10,000 messages per month" benefit shown
15. Try to click outside modal
16. VERIFY: Cannot dismiss
17. Try to press ESC
18. VERIFY: Cannot dismiss
19. Click "Upgrade to Professional"
20. VERIFY: Opens Stripe checkout in new tab
```

### Test #3: Credit Purchase Bypass
```bash
1. Still at 1000/1000 limit
2. In modal, click "Buy Credit Bundle Instead"
3. VERIFY: CreditBundleDialog opens
4. Purchase Small Bundle ($10 = 500 credits)
5. Complete Stripe payment
6. VERIFY: credit_balance = 500
7. VERIFY: Modal auto-closes
8. Try to send message
9. VERIFY: Message sends successfully
10. VERIFY: credit_balance decrements to 499
11. VERIFY: message_count_current_period stays at 1000
```

### Test #4: Frozen Account
```bash
1. In Stripe dashboard, mark subscription payment as failed
2. Webhook should set is_frozen = true
3. Refresh dashboard
4. VERIFY: AccountFrozenBanner shows at top
5. VERIFY: Shows "Account Suspended - Payment Failed"
6. VERIFY: Shows amount due and due date
7. Try to send message
8. VERIFY: LimitReachedModal appears with "Account Suspended" variant
9. VERIFY: Cannot dismiss modal
10. Click "Pay Now"
11. VERIFY: Opens Stripe customer portal
12. Complete payment
13. VERIFY: is_frozen = false
14. VERIFY: Can send messages again
```

---

## ✅ EXPECTED OUTCOMES

### All Tests Passing Means:
- ✅ All 3 channels sending/receiving
- ✅ Payment flow works end-to-end
- ✅ Limits enforced properly
- ✅ Modal blocks when necessary
- ✅ Credits work as fallback
- ✅ Widget secure and functional
- ✅ Customization applies correctly
- ✅ No tokens exposed in browser

### If Any Test Fails:
1. Check edge function logs for specific function
2. Check database for data issues
3. Check network tab for failed requests
4. Check console for JavaScript errors
5. Verify Supabase secrets configured
6. Verify webhook endpoints accessible

---

## 🎊 READY TO LAUNCH WHEN:

✅ All critical path tests passing  
✅ Credit bundles in database  
✅ Stripe products verified  
✅ No TypeScript errors  
✅ No console errors  
✅ Payment flow tested once  
✅ Widget tested on external site  

**Then you're READY! 🚀**
