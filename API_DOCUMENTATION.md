# Complete API & Webhook Documentation

## Table of Contents
1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Customer Management](#customer-management)
4. [Conversation History](#conversation-history)
5. [Message Management](#message-management)
6. [Attachment & Media Handling](#attachment--media-handling)
7. [AI Document Parsing](#ai-document-parsing)
8. [Webhooks](#webhooks)
9. [Complete Integration Examples](#complete-integration-examples)
10. [Error Handling](#error-handling)
11. [Rate Limits](#rate-limits)

---

## Getting Started

### Base URL
```
https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1
```

### Authentication
All API requests require an API key passed in the `x-api-key` header:

```bash
curl -H "x-api-key: your-api-key-here" \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-customers
```

### Generating API Keys
1. Navigate to Settings → API Access
2. Click "Generate New Key"
3. Give it a descriptive name
4. Copy and store the key securely (shown only once)

---

## Customer Management

### 1. Fetch Customer

**Endpoint:** `POST /api-customer-fetch`

Retrieve a single customer by ID, email, phone, or external_id.

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Or by phone:**
```json
{
  "phone": "+353871234567"
}
```

**Or by external CRM ID:**
```json
{
  "external_id": "CRM-12345"
}
```

**Response:**
```json
{
  "customer": {
    "id": "uuid",
    "name": "John Doe",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+353871234567",
    "whatsapp_phone": "+353871234567",
    "address": "123 Main St, Dublin",
    "notes": "VIP customer",
    "external_id": "CRM-12345",
    "custom_fields": {
      "account_manager": "Sarah",
      "segment": "enterprise"
    },
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

**Example Code (Node.js):**
```javascript
const response = await fetch('https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-customer-fetch', {
  method: 'POST',
  headers: {
    'x-api-key': 'your-api-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'john@example.com'
  })
});

const { customer } = await response.json();
console.log(customer);
```

**Example Code (PHP):**
```php
$response = Http::withHeaders([
    'x-api-key' => 'your-api-key',
    'Content-Type' => 'application/json',
])->post('https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-customer-fetch', [
    'email' => 'john@example.com'
]);

$customer = $response->json()['customer'];
```

---

### 2. Create Customer

**Endpoint:** `POST /api-customer-create`

Create a new customer in the system.

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+353871234567",
  "whatsapp_phone": "+353871234567",
  "address": "123 Main St, Dublin",
  "notes": "New customer from website",
  "external_id": "CRM-12345",
  "custom_fields": {
    "source": "website",
    "campaign": "summer-promo"
  }
}
```

**Response:**
```json
{
  "success": true,
  "customer": {
    "id": "uuid",
    "name": "John Doe",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+353871234567",
    "whatsapp_phone": "+353871234567",
    "address": "123 Main St, Dublin",
    "notes": "New customer from website",
    "external_id": "CRM-12345",
    "custom_fields": {
      "source": "website",
      "campaign": "summer-promo"
    },
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

---

### 3. Sync Customers (Bulk Create/Update)

**Endpoint:** `POST /api-customers-sync`

Smart upsert that creates new customers or updates existing ones based on email/phone matching.

**Request:**
```json
{
  "customers": [
    {
      "external_id": "CRM-12345",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+353871234567",
      "first_name": "John",
      "last_name": "Doe",
      "custom_fields": {
        "crm_segment": "enterprise"
      }
    },
    {
      "external_id": "CRM-67890",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+353879876543"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "total": 2,
    "created": 1,
    "updated": 1,
    "failed": 0,
    "details": [
      {
        "external_id": "CRM-12345",
        "customer_id": "uuid-1",
        "action": "updated",
        "matched_by": "email"
      },
      {
        "external_id": "CRM-67890",
        "customer_id": "uuid-2",
        "action": "created"
      }
    ]
  }
}
```

---

## Conversation History

### Fetch Complete Conversation History

**Endpoint:** `GET /api-conversation-history`

Retrieve all messages for a customer across all channels with timestamps and attachments.

**Query Parameters:**
- `customer_id` (required if no conversation_id) - Customer UUID
- `conversation_id` (optional) - Specific conversation UUID
- `channel` (optional) - Filter by channel: `whatsapp`, `email`, `sms`, `facebook`, `instagram`, `website`
- `direction` (optional) - Filter by direction: `inbound`, `outbound`
- `start_date` (optional) - ISO 8601 date (e.g., `2025-01-01T00:00:00Z`)
- `end_date` (optional) - ISO 8601 date
- `limit` (optional) - Max messages to return (default: 100, max: 1000)

**Example Request:**
```bash
curl -H "x-api-key: your-api-key" \
  "https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-conversation-history?customer_id=uuid&channel=whatsapp&limit=50"
```

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "content": "Hello, I need help with my order",
      "subject": null,
      "direction": "inbound",
      "platform": "whatsapp",
      "created_at": "2025-01-15T10:30:00Z",
      "timestamp": "2025-01-15T10:30:00Z",
      "is_read": true,
      "status": "delivered",
      "customer_id": "uuid",
      "conversation_id": "uuid",
      "customer": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+353871234567",
        "whatsapp_phone": "+353871234567"
      },
      "message_attachments": [
        {
          "id": "uuid",
          "filename": "receipt.pdf",
          "url": "https://storage-url/receipt.pdf",
          "type": "application/pdf",
          "size": 52468
        }
      ]
    },
    {
      "id": "uuid",
      "content": "Thank you for contacting us. How can I help?",
      "direction": "outbound",
      "platform": "whatsapp",
      "created_at": "2025-01-15T10:32:00Z",
      "timestamp": "2025-01-15T10:32:00Z",
      "status": "sent",
      "message_attachments": []
    }
  ],
  "total": 2,
  "filters_applied": {
    "customer_id": "uuid",
    "conversation_id": null,
    "channel": "whatsapp",
    "direction": null,
    "start_date": null,
    "end_date": null
  }
}
```

**Example Code (Python):**
```python
import requests

response = requests.get(
    'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-conversation-history',
    headers={'x-api-key': 'your-api-key'},
    params={
        'customer_id': 'uuid',
        'channel': 'whatsapp',
        'start_date': '2025-01-01T00:00:00Z',
        'limit': 100
    }
)

data = response.json()
for message in data['messages']:
    print(f"{message['timestamp']}: {message['content']}")
```

---

## Attachment & Media Handling

### Upload Attachment

**Endpoint:** `POST /api-upload-attachment`

Upload files and attach them to messages. **PDF and image files are automatically parsed by AI** to extract structured data.

**Automatic AI Parsing:**
When you upload a PDF or image file, our AI automatically:
- Identifies the document type (electricity bill, gas bill, meter reading, etc.)
- Extracts structured data (customer details, readings, dates, charges)
- Sends results via webhook (`attachment.parsed` event)
- Displays parse status in the UI with a visual indicator

**Request (multipart/form-data):**
```bash
curl -X POST \
  -H "x-api-key: your-api-key" \
  -F "file=@/path/to/document.pdf" \
  -F "message_id=uuid" \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-upload-attachment
```

**Response:**
```json
{
  "success": true,
  "attachment": {
    "id": "uuid",
    "filename": "document.pdf",
    "url": "https://storage-url/document.pdf",
    "type": "application/pdf",
    "size": 52468,
    "message_id": "uuid"
  }
}
```

### Download Media

**Endpoint:** `GET /api-download-media`

Download attachments sent by customers.

**Query Parameters:**
- `id` (required) - Attachment UUID

**Example:**
```bash
curl -H "x-api-key: your-api-key" \
  "https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-download-media?id=uuid" \
  --output downloaded-file.pdf
```

---

## AI Document Parsing

### Parse Attachment with AI

**Endpoint:** `POST /api-parse-attachment`

Use OpenAI GPT-4o Vision to extract structured data from PDFs and images.

**Request:**
```json
{
  "attachment_url": "https://storage-url/bill.pdf",
  "schema": {
    "type": "object",
    "properties": {
      "bills": {
        "type": "object",
        "properties": {
          "cus_details": {
            "type": "object",
            "properties": {
              "customer_name": { "type": "string" },
              "account_number": { "type": "string" },
              "address": { "type": "string" }
            }
          },
          "electricity": {
            "type": "object",
            "properties": {
              "total_amount": { "type": "number" },
              "due_date": { "type": "string", "format": "date" },
              "usage_kwh": { "type": "number" }
            }
          },
          "gas": {
            "type": "object",
            "properties": {
              "total_amount": { "type": "number" },
              "due_date": { "type": "string", "format": "date" }
            }
          }
        },
        "required": ["cus_details"]
      }
    },
    "required": ["bills"]
  },
  "prompt": "Extract all utility bill information from this Irish utility bill. Return structured data with exact key names."
}
```

**Response:**
```json
{
  "success": true,
  "parsed_data": {
    "bills": {
      "cus_details": {
        "customer_name": "John Doe",
        "account_number": "ACC-123456",
        "address": "123 Main St, Dublin"
      },
      "electricity": {
        "total_amount": 145.50,
        "due_date": "2025-02-15",
        "usage_kwh": 350
      },
      "gas": {
        "total_amount": 89.30,
        "due_date": "2025-02-15"
      }
    }
  },
  "tokens_used": {
    "prompt_tokens": 1250,
    "completion_tokens": 150,
    "total_tokens": 1400
  }
}
```

**Custom Schema Example (Invoice):**
```json
{
  "attachment_url": "https://storage-url/invoice.pdf",
  "schema": {
    "type": "object",
    "properties": {
      "invoice": {
        "type": "object",
        "properties": {
          "invoice_number": { "type": "string" },
          "date": { "type": "string", "format": "date" },
          "total": { "type": "number" },
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "description": { "type": "string" },
                "quantity": { "type": "number" },
                "price": { "type": "number" }
              }
            }
          }
        }
      }
    }
  }
}
```

**PHP Integration Example (matching your code style):**
```php
public function parseCustomerBill($attachmentUrl)
{
    $jsonSchema = [
        "type" => "object",
        "properties" => [
            "bills" => [
                "type" => "object",
                "properties" => [
                    "cus_details" => ["type" => "array"],
                    "electricity" => ["type" => "array"],
                    "gas" => ["type" => "array"],
                    "broadband" => ["type" => "array"]
                ],
                "required" => ["cus_details"]
            ]
        ],
        "required" => ["bills"]
    ];

    $prompt = 'You are OneBill, an AI that parses Irish utility bills. '
            . 'Always output structured JSON using the exact keys and structure provided. '
            . 'All dates must be in YYYY-MM-DD format. '
            . 'All numerical values must be double format or 0. '
            . 'Do not include any notes or explanations — JSON output only.';

    $response = Http::withHeaders([
        'x-api-key' => env('ALACARTE_API_KEY'),
        'Content-Type' => 'application/json',
    ])->post('https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-parse-attachment', [
        'attachment_url' => $attachmentUrl,
        'schema' => $jsonSchema,
        'prompt' => $prompt
    ]);

    if ($response->failed()) {
        return ['error' => 'Parsing failed', 'details' => $response->body()];
    }

    $result = $response->json();
    $parsedData = $result['parsed_data'] ?? null;

    return $parsedData;
}
```

---

## Webhooks

### Overview
Webhooks allow your CRM to receive real-time notifications when events occur in the system.

### Configuration

1. **Navigate to Settings → API Access → Webhooks**
2. **Enter your webhook URL** (must be HTTPS)
3. **Generate webhook secret** (used for signature verification)
4. **Enable the webhook**
5. **Test the webhook** using the "Test Webhook" button

### Webhook Events

#### 1. Customer Created via Chatbot

Sent when a new customer starts a conversation on your website chatbot.

**Event:** `customer.created_via_chatbot`

**Payload:**
```json
{
  "event": "customer.created_via_chatbot",
  "timestamp": "2025-01-15T10:30:00Z",
  "business_id": "uuid",
  "data": {
    "customer": {
      "id": "uuid",
      "name": "John Doe",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "+353871234567",
      "whatsapp_phone": "+353871234567",
      "external_id": null,
      "custom_fields": {}
    },
    "message": {
      "id": "uuid",
      "content": "Hello, I have a question about your services",
      "created_at": "2025-01-15T10:30:00Z",
      "platform": "website"
    }
  }
}
```

#### 2. Message Received

Sent when any inbound message is received across all channels.

**Event:** `message.received`

**Payload:**
```json
{
  "event": "message.received",
  "timestamp": "2025-01-15T10:30:00Z",
  "business_id": "uuid",
  "data": {
    "message": {
      "id": "uuid",
      "conversation_id": "uuid",
      "customer_id": "uuid",
      "content": "Can you help me with my order?",
      "platform": "whatsapp",
      "channel": "whatsapp",
      "direction": "inbound",
      "created_at": "2025-01-15T10:30:00Z",
      "status": "received"
    },
    "customer": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+353871234567",
      "external_id": "CRM-12345"
    },
    "attachments": [
      {
        "id": "uuid",
        "filename": "receipt.pdf",
        "type": "application/pdf",
        "size": 52468,
        "url": "https://storage-url/receipt.pdf",
        "download_url": "https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-download-media?id=uuid"
      }
    ],
    "media": [
      {
        "id": "uuid",
        "filename": "voice-note.ogg",
        "type": "audio/ogg",
        "size": 15234,
        "duration_seconds": 12,
        "url": "https://storage-url/voice-note.ogg",
        "transcription": "Hello, I need help with my order"
      }
    ]
  }
}
```

#### 3. Attachment Parsed

Sent when an attachment (PDF or image) has been automatically parsed by AI.

**Event:** `attachment.parsed`

**Payload:**
```json
{
  "event": "attachment.parsed",
  "timestamp": "2025-01-15T10:31:00Z",
  "data": {
    "message_id": "uuid",
    "attachment_id": "uuid",
    "attachment_url": "https://storage-url/document.pdf",
    "document_type": "electricity_bill",
    "confidence": 0.95,
    "parsed_data": {
      "document_type": "electricity_bill",
      "confidence": 0.95,
      "bills": {
        "cus_details": [
          {
            "account_number": "ACC123456",
            "customer_name": "John Doe",
            "address": "123 Main St, Dublin"
          }
        ],
        "electricity": [
          {
            "billing_period": "2025-01-01 to 2025-01-31",
            "start_date": "2025-01-01",
            "end_date": "2025-01-31",
            "usage_kwh": 450.5,
            "total_charge": 125.50,
            "currency": "EUR",
            "meter_number": "MTR789456"
          }
        ]
      },
      "meter_reading": null
    },
    "customer": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+353871234567"
    }
  }
}
```

**Document Types:**
- `electricity_bill` - Electricity utility bill
- `gas_bill` - Gas utility bill
- `broadband_bill` - Internet/broadband bill
- `phone_bill` - Phone service bill
- `electricity_meter` - Electricity meter reading photo
- `gas_meter` - Gas meter reading photo
- `water_meter` - Water meter reading photo
- `invoice` - General invoice
- `receipt` - General receipt
- `statement` - Account statement
- `other` - Unidentified document

**Parse Status:**
Monitor the parse status via UI indicators:
- 🤖 **Green check**: Successfully parsed
- 🤖 **Red X**: Parse failed
- 🤖 **Spinning**: Parsing in progress

**Handling Parsed Data:**
```php
// Example PHP webhook handler
if ($payload['event'] === 'attachment.parsed') {
    $documentType = $payload['data']['document_type'];
    $parsedData = $payload['data']['parsed_data'];
    $confidence = $payload['data']['confidence'];
    
    if ($confidence > 0.8) {
        // High confidence - auto-process
        if ($documentType === 'electricity_bill') {
            $billData = $parsedData['bills']['electricity'][0];
            // Create bill record in your CRM
            createBillInCRM([
                'customer_id' => $payload['data']['customer']['id'],
                'usage' => $billData['usage_kwh'],
                'amount' => $billData['total_charge'],
                'period' => $billData['billing_period']
            ]);
        }
    } else {
        // Low confidence - flag for manual review
        flagForReview($payload['data']['message_id']);
    }
}
```

### Webhook Security

#### Signature Verification

All webhooks include an HMAC-SHA256 signature for verification.

**Headers:**
- `X-Webhook-Signature` - HMAC-SHA256 hash
- `X-Webhook-Timestamp` - Unix timestamp (milliseconds)

**Verification Example (Node.js):**
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, timestamp, secret) {
  // Check timestamp to prevent replay attacks (5 minute window)
  const currentTime = Date.now();
  if (Math.abs(currentTime - parseInt(timestamp)) > 300000) {
    return false;
  }

  // Generate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${JSON.stringify(payload)}`)
    .digest('hex');
  
  // Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Express.js middleware
app.post('/webhook', express.json(), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const secret = process.env.WEBHOOK_SECRET;

  if (!verifyWebhook(req.body, signature, timestamp, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook
  console.log('Webhook received:', req.body);
  res.json({ received: true });
});
```

**Verification Example (PHP):**
```php
function verifyWebhook($payload, $signature, $timestamp, $secret) {
    // Check timestamp (5 minute window)
    $currentTime = round(microtime(true) * 1000);
    if (abs($currentTime - (int)$timestamp) > 300000) {
        return false;
    }

    // Generate expected signature
    $expectedSignature = hash_hmac(
        'sha256',
        $timestamp . '.' . json_encode($payload),
        $secret
    );

    // Constant-time comparison
    return hash_equals($expectedSignature, $signature);
}

// Laravel controller
public function handleWebhook(Request $request) {
    $signature = $request->header('X-Webhook-Signature');
    $timestamp = $request->header('X-Webhook-Timestamp');
    $secret = env('WEBHOOK_SECRET');

    if (!$this->verifyWebhook($request->all(), $signature, $timestamp, $secret)) {
        return response()->json(['error' => 'Invalid signature'], 401);
    }

    $event = $request->input('event');
    
    if ($event === 'customer.created_via_chatbot') {
        $customer = $request->input('data.customer');
        // Create customer in your CRM
        CRM::createCustomer($customer);
    }

    if ($event === 'message.received') {
        $message = $request->input('data.message');
        $attachments = $request->input('data.attachments', []);
        
        // Process message in your CRM
        CRM::createMessage($message);
        
        // Download and process attachments
        foreach ($attachments as $attachment) {
            $blob = file_get_contents($attachment['download_url']);
            CRM::saveAttachment($attachment['filename'], $blob);
        }
    }

    return response()->json(['received' => true]);
}
```

### Retry Behavior

- **Automatic retries:** 3 attempts
- **Backoff strategy:** Exponential (1s, 3s, 9s)
- **Timeout:** 10 seconds per attempt
- **Success codes:** 200-299
- **Retry codes:** 429, 500-599
- **No retry codes:** 400-499 (except 429)

---

## Complete Integration Examples

### Example 1: Complete Inbox Integration

Build your own inbox UI that displays all conversations with real-time updates.

**Step 1: Fetch All Conversations**

```javascript
async function fetchInbox() {
  const response = await fetch(
    'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-conversations',
    {
      headers: { 'x-api-key': 'your-api-key' }
    }
  );
  
  const { conversations } = await response.json();
  
  conversations.forEach(conv => {
    console.log(`${conv.customer.name} - ${conv.last_message.content}`);
  });
}
```

**Step 2: Fetch Specific Conversation History**

```javascript
async function fetchConversation(customerId) {
  const response = await fetch(
    `https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-conversation-history?customer_id=${customerId}&limit=100`,
    {
      headers: { 'x-api-key': 'your-api-key' }
    }
  );
  
  const { messages } = await response.json();
  
  return messages.sort((a, b) => 
    new Date(a.created_at) - new Date(b.created_at)
  );
}
```

**Step 3: Send Message**

```javascript
async function sendMessage(customerId, content, channel = 'whatsapp') {
  const response = await fetch(
    'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-send-message',
    {
      method: 'POST',
      headers: {
        'x-api-key': 'your-api-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_id: customerId,
        content,
        channel
      })
    }
  );
  
  return response.json();
}
```

### Example 2: Customer-Specific Conversation View

Display a single customer's complete conversation history across all channels.

```javascript
async function buildCustomerView(customerId) {
  // Fetch customer details
  const customerResp = await fetch(
    'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-customer-fetch',
    {
      method: 'POST',
      headers: {
        'x-api-key': 'your-api-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: customerId })
    }
  );
  
  const { customer } = await customerResp.json();
  
  // Fetch all messages across all channels
  const historyResp = await fetch(
    `https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-conversation-history?customer_id=${customerId}&limit=500`,
    {
      headers: { 'x-api-key': 'your-api-key' }
    }
  );
  
  const { messages } = await historyResp.json();
  
  // Group by channel
  const byChannel = messages.reduce((acc, msg) => {
    acc[msg.platform] = acc[msg.platform] || [];
    acc[msg.platform].push(msg);
    return acc;
  }, {});
  
  return {
    customer,
    messages,
    byChannel,
    channels: Object.keys(byChannel)
  };
}
```

### Example 3: Automated Message Processing

Process incoming messages with AI and respond automatically.

```javascript
// Webhook endpoint
app.post('/webhook', async (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'message.received') {
    const { message, customer, attachments } = data;
    
    // Parse attachments if present
    for (const attachment of attachments) {
      if (attachment.type === 'application/pdf') {
        const parseResp = await fetch(
          'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-parse-attachment',
          {
            method: 'POST',
            headers: {
              'x-api-key': 'your-api-key',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              attachment_url: attachment.url,
              schema: yourCustomSchema
            })
          }
        );
        
        const { parsed_data } = await parseResp.json();
        
        // Store parsed data in your CRM
        await CRM.storeParsedDocument(customer.id, parsed_data);
      }
    }
    
    // Auto-respond
    await fetch(
      'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-send-message',
      {
        method: 'POST',
        headers: {
          'x-api-key': 'your-api-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: customer.id,
          content: 'Thank you, we received your document and will process it shortly.',
          channel: message.platform
        })
      }
    );
  }
  
  res.json({ received: true });
});
```

---

## Error Handling

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid API key)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

### Error Response Format

```json
{
  "error": "Invalid API key",
  "details": "The provided API key is invalid or has been revoked"
}
```

### Handling Errors (JavaScript)

```javascript
async function safeApiCall(url, options) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error ${response.status}: ${error.error}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    
    // Retry logic for rate limits
    if (error.message.includes('429')) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      return safeApiCall(url, options);
    }
    
    throw error;
  }
}
```

---

## Rate Limits

- **Default:** 60 requests per minute per API key
- **Bulk operations:** 1000 items per request max
- **Webhook retries:** 3 attempts with exponential backoff

### Rate Limit Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642089600
```

### Handling Rate Limits

```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message.includes('429') && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

---

## Testing

### Test Your API Key

```bash
curl -H "x-api-key: your-api-key" \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-customers
```

### Test Webhook Locally

Use tools like [ngrok](https://ngrok.com/) to expose your local server:

```bash
ngrok http 3000
```

Then set your webhook URL to: `https://your-subdomain.ngrok.io/webhook`

### Postman Collection

Import our [Postman Collection](#) to test all endpoints interactively.

---

## Support

For additional help:
- Email: support@yourdomain.com
- Documentation: https://docs.yourdomain.com
- API Status: https://status.yourdomain.com

---

**Last Updated:** 2025-11-04
**API Version:** 1.0
