# API Testing Guide

Complete guide for testing all À La Carte Chat API functionality.

## Prerequisites

1. **Generate API Key**: Go to Settings → API Access and generate an API key
2. **Get Business ID**: Available in Settings → Business
3. **Get Customer ID**: Create a customer or get existing ID from the dashboard

## Base URLs

```bash
# Supabase Direct (Recommended)
SUPABASE_URL="https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1"

# Future Custom Domain
API_URL="https://api.alacartechat.com/v1"
```

## Authentication

All requests require the API key in the header:

```bash
-H "x-api-key: YOUR_API_KEY_HERE"
```

## Test Endpoints

### 1. Customers API

#### Create Customer
```bash
curl -X POST \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customer",
    "email": "test@example.com",
    "phone": "+1234567890",
    "business_id": "YOUR_BUSINESS_ID"
  }' \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-customers-create
```

**Expected Response**: Customer object with ID

#### Get All Customers
```bash
curl -H "x-api-key: YOUR_API_KEY" \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-customers?limit=10
```

**Expected Response**: Array of customers with pagination info

#### Get Customer by ID
```bash
curl -H "x-api-key: YOUR_API_KEY" \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-customers?id=CUSTOMER_ID
```

**Expected Response**: Single customer object

#### Update Customer
```bash
curl -X PUT \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "CUSTOMER_ID",
    "name": "Updated Name",
    "notes": "VIP customer"
  }' \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-customers-update
```

**Expected Response**: Success message with updated customer

### 2. Messaging API

#### Send WhatsApp Message
```bash
curl -X POST \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUSTOMER_ID",
    "channel": "whatsapp",
    "content": "Hello from API!"
  }' \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-send-message
```

**Requirements**: Customer must have `phone` field

#### Send Email
```bash
curl -X POST \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUSTOMER_ID",
    "channel": "email",
    "subject": "Test Subject",
    "content": "<h1>Hello from API!</h1>"
  }' \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-send-message
```

**Requirements**: Customer must have `email` field

#### Send SMS
```bash
curl -X POST \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUSTOMER_ID",
    "channel": "sms",
    "content": "Hello from API!"
  }' \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-send-message
```

**Requirements**: Customer must have `phone` field

#### Send Facebook Messenger
```bash
curl -X POST \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUSTOMER_ID",
    "channel": "facebook",
    "content": "Hello from API!"
  }' \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-send-message
```

**Requirements**: Customer must have `facebook_psid` field

#### Send Instagram DM
```bash
curl -X POST \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUSTOMER_ID",
    "channel": "instagram",
    "content": "Hello from API!"
  }' \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-send-message
```

**Requirements**: Customer must have `instagram_id` field

### 3. Conversations API

#### Get All Conversations
```bash
curl -H "x-api-key: YOUR_API_KEY" \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-conversations
```

**Expected Response**: Array of conversations with messages

#### Get Conversation by ID
```bash
curl -H "x-api-key: YOUR_API_KEY" \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-conversations?id=CONVERSATION_ID
```

**Expected Response**: Single conversation with full message history

### 4. SSO/Embed API

#### Generate SSO Token (Conversation Scope)
```bash
curl -X POST \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "CUSTOMER_ID",
    "scope": "conversation",
    "expires_in_minutes": 60
  }' \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-sso-generate-token
```

**Expected Response**: Token and embed URL
**Use Case**: Embed single conversation in customer portal

#### Generate SSO Token (Inbox Scope)
```bash
curl -X POST \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "inbox",
    "expires_in_minutes": 120
  }' \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-sso-generate-token
```

**Expected Response**: Token and embed URL
**Use Case**: Embed full inbox for team members

#### Validate SSO Token
```bash
curl -H "x-api-key: YOUR_API_KEY" \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-sso-validate-token?token=TOKEN_HERE
```

**Expected Response**: Token validation status and metadata

### 5. Templates API

#### Get All Templates
```bash
curl -H "x-api-key: YOUR_API_KEY" \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-templates
```

**Expected Response**: Array of message templates

## Iframe Embed Testing

### Test Conversation Embed

1. Generate SSO token with conversation scope
2. Create an HTML file:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Embedded Conversation</title>
</head>
<body>
  <h1>Customer Support Chat</h1>
  <iframe 
    src="https://alacartechat.com/embed/conversation?token=YOUR_TOKEN_HERE"
    width="100%"
    height="600px"
    frameborder="0"
  ></iframe>
</body>
</html>
```

3. Open in browser and test messaging

**Expected Behavior**:
- Customer name displayed in header
- Can send and receive messages
- Custom branding applied (if configured)
- Real-time message updates

### Test Inbox Embed

1. Generate SSO token with inbox scope
2. Create an HTML file:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Embedded Inbox</title>
</head>
<body>
  <h1>Team Inbox</h1>
  <iframe 
    src="https://alacartechat.com/embed/inbox?token=YOUR_TOKEN_HERE"
    width="100%"
    height="800px"
    frameborder="0"
  ></iframe>
</body>
</html>
```

3. Open in browser and test

**Expected Behavior**:
- List of conversations on left
- Message view on right
- Can select conversations
- Can send messages
- Custom branding applied

## Error Handling Tests

### Test Invalid API Key
```bash
curl -H "x-api-key: INVALID_KEY" \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-customers
```

**Expected Response**: 401 Unauthorized with error message

### Test Missing Customer
```bash
curl -H "x-api-key: YOUR_API_KEY" \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-customers?id=00000000-0000-0000-0000-000000000000
```

**Expected Response**: 404 Not Found with clear error message

### Test Invalid Channel
```bash
curl -X POST \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUSTOMER_ID",
    "channel": "invalid_channel",
    "content": "Test"
  }' \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-send-message
```

**Expected Response**: 500 error explaining supported channels

### Test Missing Required Field
```bash
curl -X POST \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUSTOMER_ID_WITHOUT_EMAIL",
    "channel": "email",
    "content": "Test"
  }' \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-send-message
```

**Expected Response**: Error stating customer has no email address

## Rate Limit Testing

Test rate limiting by making rapid requests:

```bash
for i in {1..100}; do
  curl -H "x-api-key: YOUR_API_KEY" \
    https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-customers &
done
```

**Expected Behavior**: After ~60 requests, should receive 429 Too Many Requests

## Integration Testing Checklist

- [ ] API key authentication works
- [ ] Customer CRUD operations work
- [ ] Send message via all 5 channels (WhatsApp, Email, SMS, Facebook, Instagram)
- [ ] Conversation retrieval works
- [ ] Template management works
- [ ] SSO token generation works (both scopes)
- [ ] SSO token validation works
- [ ] Conversation embed loads and functions
- [ ] Inbox embed loads and functions
- [ ] Custom branding applies to embeds
- [ ] Error responses are clear and helpful
- [ ] Rate limiting works as expected
- [ ] Messages appear in main dashboard after API send

## Debugging Tips

1. **Check Supabase Logs**: View edge function logs at https://supabase.com/dashboard/project/jrtlrnfdqfkjlkpfirzr/functions/
2. **Verify Database State**: Check that records are created in Supabase dashboard
3. **Test Incrementally**: Start with simple GET requests before POST/PUT
4. **Check Required Fields**: Ensure customers have required fields for each channel
5. **Monitor Network Tab**: Use browser DevTools to see iframe communication
6. **Test Expiry**: Verify SSO tokens expire correctly after specified time

## Production Readiness

Before going live:

1. ✅ All API endpoints tested and working
2. ✅ Error handling provides clear messages
3. ✅ Rate limiting configured appropriately
4. ✅ SSO tokens expire as expected
5. ✅ Iframe embeds work across browsers
6. ✅ Custom branding displays correctly
7. ✅ All 5 messaging channels functional
8. ✅ API documentation is complete and accurate
9. ⚠️ Consider custom domain (api.alacartechat.com)
10. ⚠️ Set up monitoring and alerting

## Support

If you encounter issues:
1. Check edge function logs in Supabase dashboard
2. Verify your API key is active in Settings
3. Ensure required customer fields are populated
4. Contact support with specific error messages
