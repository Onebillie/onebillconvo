# À La Carte Chat - CRM Integration Guide

Complete guide for integrating À La Carte Chat with your existing CRM system (Salesforce, HubSpot, Zoho, or custom CRM).

## Table of Contents
1. [Overview](#overview)
2. [Authentication Setup](#authentication-setup)
3. [Customer Sync](#customer-sync)
4. [Real-time Updates](#real-time-updates)
5. [Embedding Conversations](#embedding-conversations)
6. [Code Examples](#code-examples)

---

## Overview

À La Carte Chat provides multiple integration methods:

- **API Integration**: RESTful API for all CRUD operations
- **Webhook Events**: Real-time push notifications for events
- **Iframe Embedding**: Embed conversation UI directly in your CRM
- **SSO Authentication**: Secure token-based authentication

### Integration Architecture

```
┌─────────────────────────────────────────┐
│         Your CRM System                  │
│  (Salesforce, HubSpot, Custom, etc.)    │
└──────────┬──────────────────────────────┘
           │
           │ 1. API Calls (REST)
           │ 2. Webhooks (Push)
           │ 3. Iframe Embed (UI)
           │
┌──────────▼──────────────────────────────┐
│      À La Carte Chat Platform            │
│  • 5 Channels (WhatsApp, Email, etc.)   │
│  • Message Storage & History             │
│  • File Attachments                      │
│  • Customer Management                   │
└─────────────────────────────────────────┘
```

---

## Authentication Setup

### 1. Generate API Key

Navigate to **Settings → API Access** in your À La Carte dashboard and create a new API key.

```bash
# Store your API key securely
API_KEY="your-api-key-here"
BASE_URL="https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1"
```

### 2. Test Authentication

```bash
curl -X GET "${BASE_URL}/api-customers" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
```

---

## Customer Sync

### Scenario: Import 5000 Customers from CRM

**Step 1: Prepare Customer Data**

Map your CRM fields to À La Carte fields:

| CRM Field | À La Carte Field | Required |
|-----------|------------------|----------|
| Contact ID | external_id | No |
| Full Name | name | Yes |
| Email | email | No* |
| Phone | phone | No* |
| WhatsApp | whatsapp_number | No |
| Tags | tags | No |

*At least one contact method (email or phone) is required

**Step 2: Bulk Import (Batches of 1000)**

```javascript
// Example: Node.js bulk import
async function importCustomers(customers) {
  const BATCH_SIZE = 1000;
  const results = { created: 0, updated: 0, failed: 0, errors: [] };
  
  for (let i = 0; i < customers.length; i += BATCH_SIZE) {
    const batch = customers.slice(i, i + BATCH_SIZE);
    
    // Add external_id for bidirectional sync
    const payload = batch.map(customer => ({
      name: customer.full_name,
      email: customer.email,
      phone: customer.phone,
      whatsapp_number: customer.whatsapp,
      external_id: customer.crm_id,
      external_system: 'salesforce', // or 'hubspot', 'custom', etc.
      tags: customer.tags || []
    }));
    
    const response = await fetch(`${BASE_URL}/api-customers-bulk-create`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ customers: payload })
    });
    
    const result = await response.json();
    results.created += result.created;
    results.updated += result.updated;
    results.failed += result.failed;
    results.errors.push(...result.errors);
    
    console.log(`Batch ${i / BATCH_SIZE + 1}: ${result.created} created, ${result.updated} updated`);
  }
  
  return results;
}

// Usage
const customers = await fetchCustomersFromCRM();
const results = await importCustomers(customers);
console.log('Import complete:', results);
```

**Step 3: Store ID Mapping**

After import, store the mapping between your CRM ID and À La Carte customer ID:

```sql
-- Create mapping table in your CRM database
CREATE TABLE alacarte_customer_mapping (
  crm_customer_id VARCHAR(255) PRIMARY KEY,
  alacarte_customer_id UUID NOT NULL,
  external_id VARCHAR(255),
  last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Real-time Customer Sync API

### NEW: Smart Upsert Endpoint

The `api-customers-sync` endpoint provides intelligent create-or-update functionality for real-time CRM synchronization.

**Endpoint:** `POST /api-customers-sync`

**Features:**
- Automatically creates new customers or updates existing ones
- Matches by external_id, email, or phone (in that order)
- Supports batch operations (up to 1000 customers)
- Returns detailed results showing which customers were created vs updated
- Supports custom fields via JSON for flexible CRM data mapping

**Request Format:**

```bash
curl -X POST "${BASE_URL}/api-customers-sync" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "customers": [
      {
        "external_id": "CRM-12345",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+353871234567",
        "first_name": "John",
        "last_name": "Doe",
        "address": "123 Main St, Dublin",
        "notes": "VIP customer - handle with priority",
        "custom_fields": {
          "crm_segment": "enterprise",
          "account_manager": "Sarah Johnson",
          "contract_value": 50000,
          "renewal_date": "2025-12-31"
        }
      }
    ]
  }'
```

**Response Format:**

```json
{
  "success": true,
  "results": {
    "total": 1,
    "created": 0,
    "updated": 1,
    "failed": 0,
    "details": [
      {
        "external_id": "CRM-12345",
        "customer_id": "uuid-here",
        "action": "updated",
        "matched_by": "email"
      }
    ]
  }
}
```

**Matching Logic:**
1. First tries to match by `external_id` (if provided)
2. Then tries to match by `email` (if provided)
3. Finally tries to match by `phone` (if provided and normalized)
4. If no match found, creates a new customer

**Use Cases:**
- Real-time sync when customer data changes in CRM
- Webhook-triggered updates from CRM system
- Background sync jobs to keep data in sync
- Initial bulk import with automatic deduplication

**Example: Real-time Sync on CRM Update**

```javascript
// Trigger this when a contact is updated in your CRM
async function syncCustomerToChatPlatform(crmContact) {
  const response = await fetch(`${BASE_URL}/api-customers-sync`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customers: [{
        external_id: crmContact.id,
        name: `${crmContact.firstName} ${crmContact.lastName}`,
        email: crmContact.email,
        phone: crmContact.phone,
        custom_fields: {
          crm_status: crmContact.status,
          last_purchase: crmContact.lastPurchaseDate,
          lifetime_value: crmContact.ltv
        }
      }]
    })
  });
  
  const result = await response.json();
  console.log('Sync result:', result.results.details[0]);
}
```

---

## Incoming Message Webhooks

### Configure Real-time Message Forwarding

Forward all incoming messages (with attachments and media) to your CRM system in real-time.

**Configuration:**
Navigate to **Settings → Business Settings → CRM Integration**

1. Enter your webhook endpoint URL
2. Enable "Real-time Message Forwarding"
3. Generate and save a webhook secret
4. Click "Test Webhook" to verify connectivity

**Webhook Payload Structure:**

```json
{
  "event": "message.received",
  "timestamp": "2025-11-04T09:00:00Z",
  "business_id": "uuid",
  "data": {
    "message": {
      "id": "uuid",
      "conversation_id": "uuid",
      "customer_id": "uuid",
      "content": "Hello, I need help with my order",
      "platform": "whatsapp",
      "channel": "whatsapp",
      "direction": "inbound",
      "created_at": "2025-11-04T09:00:00Z",
      "status": "received"
    },
    "customer": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+353871234567",
      "external_id": "CRM-12345",
      "custom_fields": {
        "crm_segment": "enterprise"
      }
    },
    "attachments": [
      {
        "id": "uuid",
        "filename": "receipt.pdf",
        "type": "application/pdf",
        "size": 52468,
        "url": "https://storage.url/path/to/file",
        "download_url": "https://your-app.com/api/download-media?id=uuid"
      }
    ]
  }
}
```

**Security: Signature Verification**

All webhooks include an `X-Webhook-Signature` header for verification:

```javascript
const crypto = require('crypto');

function verifyWebhook(req) {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const payload = JSON.stringify(req.body);
  const secret = process.env.WEBHOOK_SECRET; // From Business Settings
  
  // Verify timestamp (prevent replay attacks)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    throw new Error('Webhook timestamp too old');
  }
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

**Example: Express.js Webhook Handler**

```javascript
const express = require('express');
const app = express();

app.post('/webhooks/messages', express.json(), async (req, res) => {
  try {
    // Verify webhook signature
    if (!verifyWebhook(req)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const { event, data } = req.body;
    
    if (event === 'message.received') {
      const { message, customer, attachments } = data;
      
      // Find CRM contact by external_id
      const crmContact = await crm.findContact(customer.external_id);
      
      // Create activity in CRM
      await crm.createActivity({
        contactId: crmContact.id,
        type: 'message_received',
        channel: message.platform,
        content: message.content,
        timestamp: message.created_at
      });
      
      // Download and attach files to CRM
      for (const attachment of attachments) {
        const fileBuffer = await fetch(attachment.download_url)
          .then(r => r.buffer());
        
        await crm.uploadAttachment({
          contactId: crmContact.id,
          filename: attachment.filename,
          data: fileBuffer,
          contentType: attachment.type
        });
      }
      
      console.log(`Processed message ${message.id} for ${customer.name}`);
    }
    
    // Always respond with 200 to acknowledge receipt
    res.json({ success: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

**Retry Behavior:**
- Failed deliveries are retried 3 times
- Exponential backoff: 2s, 4s, 8s
- 4xx errors (except 429) are not retried
- 5xx errors trigger retries
- All delivery attempts are logged

**Testing Locally:**

Use ngrok to test webhooks on your local machine:

```bash
# Start ngrok
ngrok http 3000

# Use the ngrok URL in Business Settings
# Example: https://abc123.ngrok.io/webhooks/messages
```

---

## Viewing Customer Conversations in CRM

### Scenario: User Opens "Joe Bloggs" in CRM

**Option A: API Retrieval**

```javascript
async function loadCustomerConversations(crmCustomerId) {
  // Lookup by external_id (your CRM's customer ID)
  const response = await fetch(
    `${BASE_URL}/api-conversations-by-customer?` +
    `external_id=${crmCustomerId}&` +
    `include_messages=true&` +
    `include_attachments=true`,
    {
      headers: { 'x-api-key': API_KEY }
    }
  );
  
  const data = await response.json();
  
  // Display in your CRM UI
  displayCustomer(data.customer);
  displayConversations(data.conversations); // All channels included
  
  return data;
}
```

**Option B: Embed Iframe**

Generate an SSO token and embed the conversation viewer:

```javascript
async function embedConversationViewer(crmCustomerId) {
  // Step 1: Get customer by external_id
  const customerResponse = await fetch(
    `${BASE_URL}/api-customers?external_id=${crmCustomerId}`,
    { headers: { 'x-api-key': API_KEY } }
  );
  const customer = await customerResponse.json();
  
  // Step 2: Generate SSO token
  const tokenResponse = await fetch(`${BASE_URL}/api-sso-generate-token`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customer_id: customer.id,
      scope: 'inbox',
      expires_in: 3600 // 1 hour
    })
  });
  
  const { token } = await tokenResponse.json();
  
  // Step 3: Embed iframe
  const iframe = document.createElement('iframe');
  iframe.src = `https://your-domain.com/embed/inbox?token=${token}`;
  iframe.style.width = '100%';
  iframe.style.height = '600px';
  iframe.style.border = 'none';
  
  document.getElementById('conversation-container').appendChild(iframe);
}
```

---

## Real-time Updates

### Configure Webhooks

**Step 1: Set Up Webhook Endpoint in Your CRM**

```javascript
// Express.js webhook receiver example
const crypto = require('crypto');

app.post('/webhooks/alacarte', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const secret = process.env.ALACARTE_WEBHOOK_SECRET;
  
  // Verify signature
  const payload = `${timestamp}.${JSON.stringify(req.body)}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process event
  const { event, data, business_id, timestamp: eventTime } = req.body;
  
  switch (event) {
    case 'message.received':
      handleIncomingMessage(data);
      break;
    case 'conversation.created':
      handleNewConversation(data);
      break;
    case 'conversation.assigned':
      notifyAssignedAgent(data);
      break;
    default:
      console.log('Unhandled event:', event);
  }
  
  res.status(200).send('OK');
});

function handleIncomingMessage(data) {
  // Update CRM with new message
  // data contains: message_id, customer_id, external_id, content, channel, etc.
  console.log(`New message from ${data.customer.name}: ${data.content}`);
  
  // Create activity in CRM
  createCRMActivity({
    type: 'chat_message',
    customer_id: data.customer.external_id,
    subject: `Message via ${data.channel}`,
    description: data.content,
    timestamp: data.created_at
  });
}
```

**Step 2: Register Webhook in À La Carte**

Navigate to **Settings → Webhooks** and add:

- **Name**: My CRM Webhook
- **URL**: https://your-crm.com/webhooks/alacarte
- **Events**: Select events to subscribe to
- **Secret**: Copy the auto-generated secret

**Available Webhook Events**:
- `message.received` - New inbound message from customer
- `message.sent` - Outbound message sent to customer
- `conversation.created` - New conversation started
- `conversation.assigned` - Conversation assigned to agent
- `conversation.status_changed` - Status updated
- `customer.created` - New customer added
- `customer.updated` - Customer details modified

---

## Sending Messages from CRM

### Send Message to Customer

```javascript
async function sendMessageFromCRM(crmCustomerId, channel, content, attachments = []) {
  // Step 1: Upload attachments (if any)
  const uploadedAttachments = [];
  for (const file of attachments) {
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadResponse = await fetch(`${BASE_URL}/api-upload-attachment`, {
      method: 'POST',
      headers: { 'x-api-key': API_KEY },
      body: formData
    });
    
    const { attachment } = await uploadResponse.json();
    uploadedAttachments.push(attachment.file_url);
  }
  
  // Step 2: Send message
  const response = await fetch(`${BASE_URL}/api-send-message`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customer_id: crmCustomerId, // Or use email/phone lookup
      channel: channel, // 'whatsapp', 'email', 'sms', 'facebook', 'instagram'
      content: content,
      attachments: uploadedAttachments
    })
  });
  
  const result = await response.json();
  console.log('Message sent:', result);
  return result;
}

// Usage
await sendMessageFromCRM(
  'CRM-12345',
  'whatsapp',
  'Hi! Your order is ready for pickup.',
  [new File([''], 'receipt.pdf')]
);
```

---

## Advanced: Polling for New Messages

Alternative to webhooks for CRMs that prefer polling:

```javascript
let lastCheckTimestamp = new Date().toISOString();

async function pollForNewMessages() {
  const response = await fetch(
    `${BASE_URL}/api-messages-since?` +
    `since=${encodeURIComponent(lastCheckTimestamp)}&` +
    `include_attachments=true&` +
    `limit=100`,
    {
      headers: { 'x-api-key': API_KEY }
    }
  );
  
  const { messages, has_more } = await response.json();
  
  // Process new messages
  for (const message of messages) {
    if (message.direction === 'inbound') {
      processIncomingMessage(message);
    }
  }
  
  // Update timestamp for next poll
  if (messages.length > 0) {
    lastCheckTimestamp = messages[messages.length - 1].created_at;
  }
  
  return { count: messages.length, has_more };
}

// Poll every 30 seconds
setInterval(pollForNewMessages, 30000);
```

---

## Complete Integration Example

### Salesforce Integration

```javascript
class AlacarteChatSalesforceIntegration {
  constructor(apiKey, webhookSecret) {
    this.apiKey = apiKey;
    this.webhookSecret = webhookSecret;
    this.baseUrl = 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1';
  }
  
  // Sync all Salesforce contacts to AlaCarte
  async syncContacts() {
    const contacts = await this.fetchSalesforceContacts();
    const batches = this.chunkArray(contacts, 1000);
    
    for (const batch of batches) {
      const payload = batch.map(contact => ({
        name: contact.Name,
        email: contact.Email,
        phone: contact.Phone,
        external_id: contact.Id,
        external_system: 'salesforce'
      }));
      
      await this.bulkCreateCustomers(payload);
    }
  }
  
  // Display customer communication in Salesforce
  async loadCustomerView(salesforceContactId) {
    const data = await this.getConversationsByCustomer(salesforceContactId);
    
    // Render in Salesforce Lightning Component
    return {
      customer: data.customer,
      conversations: data.conversations.map(conv => ({
        id: conv.id,
        channel: conv.whatsapp_account_id ? 'WhatsApp' : 'Other',
        messageCount: conv.messages?.length || 0,
        lastMessage: conv.last_message_at,
        status: conv.status
      }))
    };
  }
  
  // Handle webhook from AlaCarte
  handleWebhook(req) {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    
    if (!this.verifyWebhookSignature(req.body, timestamp, signature)) {
      throw new Error('Invalid webhook signature');
    }
    
    const { event, data } = req.body;
    
    switch (event) {
      case 'message.received':
        this.createSalesforceTask(data);
        break;
      case 'conversation.created':
        this.createSalesforceCase(data);
        break;
    }
  }
  
  // Helper methods
  async bulkCreateCustomers(customers) {
    const response = await fetch(`${this.baseUrl}/api-customers-bulk-create`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ customers })
    });
    return response.json();
  }
  
  async getConversationsByCustomer(externalId) {
    const response = await fetch(
      `${this.baseUrl}/api-conversations-by-customer?external_id=${externalId}&include_messages=true`,
      { headers: { 'x-api-key': this.apiKey } }
    );
    return response.json();
  }
  
  verifyWebhookSignature(body, timestamp, signature) {
    const crypto = require('crypto');
    const payload = `${timestamp}.${JSON.stringify(body)}`;
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');
    return signature === expected;
  }
  
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Usage
const integration = new AlacarteChatSalesforceIntegration(
  process.env.ALACARTE_API_KEY,
  process.env.ALACARTE_WEBHOOK_SECRET
);

// Initial sync
await integration.syncContacts();

// In Salesforce Lightning Component
const customerData = await integration.loadCustomerView(contactId);
```

---

## Best Practices

### 1. Error Handling
- Always implement retry logic for API calls
- Log all API errors for debugging
- Handle rate limits gracefully (429 responses)

### 2. Performance
- Use batch endpoints when possible
- Cache customer mappings locally
- Implement exponential backoff for retries

### 3. Security
- Store API keys in environment variables
- Verify webhook signatures
- Use HTTPS for all API calls
- Rotate API keys periodically

### 4. Data Consistency
- Store `external_id` on all customers
- Implement bidirectional sync (CRM ↔ AlaCarte)
- Handle duplicate detection

---

## Troubleshooting

### Common Issues

**Issue**: Customer not found by external_id
- **Solution**: Ensure `external_id` was set during customer creation or update

**Issue**: Webhook not receiving events
- **Solution**: Verify webhook URL is publicly accessible and returns 200 OK

**Issue**: Messages not syncing
- **Solution**: Check API usage logs in Settings → API Access

**Issue**: Attachment upload fails
- **Solution**: Verify file size is under 10MB and format is supported

---

## Support

For additional assistance:
- API Documentation: https://app.alacartechat.com/api-docs
- Support Email: support@alacartechat.com
- Developer Portal: https://docs.alacartechat.com

---

## Appendix: API Endpoint Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api-customers | GET | Get single customer by ID/email/phone |
| /api-customers-batch-lookup | POST | Get multiple customers at once |
| /api-customers-bulk-create | POST | Create/update up to 1000 customers |
| /api-conversations-by-customer | GET | Get all conversations for a customer |
| /api-messages-since | GET | Poll for new messages |
| /api-send-message | POST | Send message to customer |
| /api-upload-attachment | POST | Upload file attachment |
| /api-sso-generate-token | POST | Generate SSO token for embedding |

All endpoints require `x-api-key` header for authentication.