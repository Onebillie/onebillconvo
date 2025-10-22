# À La Carte Chat - Complete API Documentation & Testing Guide

Comprehensive guide for testing all À La Carte Chat API functionality including customer management, messaging across 5 channels, widget embed, and data exports.

## Prerequisites

1. **Generate API Key**: Go to Settings → API Access and generate an API key
2. **Get Business ID**: Available in Settings → Business
3. **Get Customer ID**: Create a customer or get existing ID from the dashboard
4. **Get Site ID**: For widget embed, generate an embed token in Settings → Website Chat Widget

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

#### Bulk Create/Update Customers
```bash
curl -X POST \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "customers": [
      {
        "name": "Customer 1",
        "email": "customer1@example.com",
        "phone": "+1234567890",
        "notes": "Imported from CRM"
      },
      {
        "name": "Customer 2",
        "email": "customer2@example.com",
        "phone": "+1234567891"
      }
    ]
  }' \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-customers-bulk-create
```

**Expected Response**: Results summary with created/updated/failed counts
**Max Batch Size**: 1000 customers per request
**Use Case**: Import customers from external CRM or database

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

### 4. Media & Export API

#### Download Media/Attachments
```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-download-media?conversation_id=CONVERSATION_ID"
```

**Expected Response**: Array of media files with download URLs
**Query Parameters**:
- `conversation_id`: Filter by conversation
- `customer_id`: Filter by customer
- `from_date`: Start date (ISO format)
- `to_date`: End date (ISO format)

#### Export Conversation History (JSON)
```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-export-conversations?customer_id=CUSTOMER_ID&include_attachments=true"
```

**Expected Response**: Complete conversation history in JSON format
**Use Case**: Backup customer conversations, data migration, compliance exports

#### Export Conversation History (CSV)
```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-export-conversations?format=csv&from_date=2024-01-01"
```

**Expected Response**: CSV file download
**Query Parameters**:
- `conversation_id`: Export specific conversation
- `customer_id`: Export all conversations for customer
- `from_date`: Start date filter
- `to_date`: End date filter
- `format`: `json` (default) or `csv`
- `include_attachments`: `true` to include attachment metadata

### 5. SSO/Embed API

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

### 6. Widget Embed API

The widget embed API allows you to add a chat widget to any website. This is different from SSO/iframe embeds - it's a JavaScript widget that sits on top of your website.

#### Generate Widget Embed Token

First, create an embed token in the dashboard (Settings → Website Chat Widget), then use the provided Site ID.

#### Widget JavaScript Integration

Add this code to your website:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Your Website</title>
</head>
<body>
  <!-- Your website content -->
  
  <!-- Add before closing body tag -->
  <script src="https://jrtlrnfdqfkjlkpfirzr.supabase.co/storage/v1/object/public/alacartechat%20storage/embed-widget.js"></script>
  <script>
    AlacarteChatWidget.init({
      siteId: 'YOUR_SITE_ID_HERE',
      customer: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890'
      },
      customData: {
        userId: '12345',
        plan: 'premium'
      }
    });
  </script>
</body>
</html>
```

**Widget Features**:
- Automatic customer creation/matching
- Real-time messaging
- Unread message badges
- Mobile responsive
- Customizable colors, position, and messages
- AI triage (if enabled)

#### Widget Backend Endpoints

These endpoints are called automatically by the widget JavaScript:

**1. Widget Authentication**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-site-id: YOUR_SITE_ID" \
  -d '{
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "+1234567890",
    "custom_data": {"userId": "12345"}
  }' \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/embed-auth
```

**Response**: Session token and conversation ID

**2. Widget Messaging**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-session-token: SESSION_TOKEN" \
  -d '{
    "action": "send_message",
    "message": "Hello from widget"
  }' \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/embed-message
```

**Response**: Message sent confirmation

**3. AI Triage (Optional)**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-session-token: SESSION_TOKEN" \
  -d '{
    "message": "I need help with billing"
  }' \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/embed-ai-triage
```

**Response**: AI-generated department routing and first response

### 7. Templates API

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

### Core API Functions
- [ ] API key authentication works
- [ ] Customer CRUD operations work (create, read, update)
- [ ] Bulk customer import works (up to 1000)
- [ ] Send message via all 5 channels (WhatsApp, Email, SMS, Facebook, Instagram)
- [ ] Conversation retrieval works
- [ ] Template management works

### Data Export & Backup
- [ ] Media/attachment download API works
- [ ] Conversation export works (JSON format)
- [ ] Conversation export works (CSV format)
- [ ] Date range filtering works correctly
- [ ] Customer-specific exports work

### SSO & Iframe Embeds
- [ ] SSO token generation works (both scopes)
- [ ] SSO token validation works
- [ ] Conversation embed loads and functions
- [ ] Inbox embed loads and functions
- [ ] Custom branding applies to embeds
- [ ] Token expiry works correctly

### Website Chat Widget
- [ ] Widget JavaScript loads correctly
- [ ] Widget authentication creates/matches customers
- [ ] Widget messaging works in real-time
- [ ] Widget customization (colors, position) applies
- [ ] Unread badge shows correctly
- [ ] Mobile responsive behavior works
- [ ] AI triage works (if enabled)
- [ ] Widget messages appear in main dashboard

### Error Handling & Security
- [ ] Error responses are clear and helpful
- [ ] Rate limiting works as expected
- [ ] Invalid API keys are rejected
- [ ] Missing customer data handled gracefully
- [ ] Batch size limits enforced

## Debugging Tips

1. **Check Supabase Logs**: View edge function logs at https://supabase.com/dashboard/project/jrtlrnfdqfkjlkpfirzr/functions/
2. **Verify Database State**: Check that records are created in Supabase dashboard
3. **Test Incrementally**: Start with simple GET requests before POST/PUT
4. **Check Required Fields**: Ensure customers have required fields for each channel
5. **Monitor Network Tab**: Use browser DevTools to see iframe communication
6. **Test Expiry**: Verify SSO tokens expire correctly after specified time

## Common Use Cases

### Use Case 1: CRM Integration
**Scenario**: Import 2000 customers from Salesforce and sync messages

**Steps**:
1. Export customers from Salesforce
2. Transform to API format
3. Use `api-customers-bulk-create` in batches of 1000
4. Store customer IDs for future message syncing
5. Use `api-send-message` to send messages
6. Use `api-conversations` to retrieve message history

### Use Case 2: Customer Portal
**Scenario**: Let customers view their conversation history on your website

**Steps**:
1. Generate SSO token with conversation scope using `api-sso-generate-token`
2. Embed iframe with the token: `https://alacartechat.com/embed/conversation?token=TOKEN`
3. Customers can view and reply to messages
4. Messages sync back to your main dashboard

### Use Case 3: Website Chat Widget
**Scenario**: Add live chat to your website

**Steps**:
1. Create embed token in dashboard (Settings → Website Chat Widget)
2. Customize appearance, colors, and messages
3. Add JavaScript code to your website
4. Widget automatically creates customer records
5. Enable AI triage for automatic department routing (optional)

### Use Case 4: Compliance & Backup
**Scenario**: Export all customer conversations monthly for compliance

**Steps**:
1. Use `api-export-conversations` with date range
2. Set `format=json` and `include_attachments=true`
3. Store exports on your servers
4. Use `api-download-media` to backup attachments separately

## Production Readiness

Before going live:

### API Endpoints
1. ✅ All API endpoints tested and working
2. ✅ Error handling provides clear messages
3. ✅ Rate limiting configured appropriately
4. ✅ Bulk operations tested with real data volumes
5. ✅ All 5 messaging channels functional

### Widget & Embeds
6. ✅ Widget JavaScript loads on test website
7. ✅ Widget works across browsers (Chrome, Firefox, Safari, Edge)
8. ✅ Widget is mobile responsive
9. ✅ SSO tokens expire as expected
10. ✅ Iframe embeds work across browsers
11. ✅ Custom branding displays correctly

### Data Management
12. ✅ Export functionality tested
13. ✅ Media download API works
14. ✅ Bulk customer import tested with large datasets
15. ✅ Customer matching logic works (email/phone deduplication)

### Documentation & Monitoring
16. ✅ API documentation is complete and accurate
17. ✅ All endpoints have example curl commands
18. ✅ Error codes documented
19. ⚠️ Consider custom domain (api.alacartechat.com)
20. ⚠️ Set up monitoring and alerting
21. ⚠️ Configure backup schedules for exports

## API Endpoint Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api-customers` | GET | Retrieve customers |
| `/api-customers-create` | POST | Create single customer |
| `/api-customers-update` | PUT | Update customer |
| `/api-customers-bulk-create` | POST | Create/update up to 1000 customers |
| `/api-send-message` | POST | Send message via any channel |
| `/api-conversations` | GET | Retrieve conversations |
| `/api-download-media` | GET | Download attachments |
| `/api-export-conversations` | GET | Export conversation history |
| `/api-sso-generate-token` | POST | Generate SSO embed token |
| `/api-sso-validate-token` | GET | Validate SSO token |
| `/api-templates` | GET | List message templates |
| `/embed-auth` | POST | Widget authentication |
| `/embed-message` | POST | Widget messaging |
| `/embed-ai-triage` | POST | Widget AI routing |

## Support

If you encounter issues:
1. Check edge function logs in Supabase dashboard
2. Verify your API key is active in Settings
3. Ensure required customer fields are populated
4. For widget issues, check browser console for JavaScript errors
5. Test with curl commands before implementing in your application
6. Contact support with specific error messages and request IDs
