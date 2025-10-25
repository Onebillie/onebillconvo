# Voice Calling System - Architecture & API Guide

## Overview

À La Carte Chat provides a complete voice calling solution that handles all call management, routing, and agent communication internally. The system is designed for CRM integration via APIs and webhooks, allowing external systems to receive call logs and recordings while À La Carte Chat handles the entire call flow.

**Key Principle**: Your CRM doesn't control calls - it receives call data from À La Carte Chat.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   À La Carte Chat (App)                     │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Call UI    │  │   Routing    │  │  Recording   │      │
│  │   Agent      │──│   Queues     │──│  Transcripts │      │
│  │   Controls   │  │   IVR Logic  │  │  Storage     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                           │                                   │
│                    ┌──────▼──────┐                          │
│                    │  Call Logs   │                          │
│                    │  & Events DB │                          │
│                    └──────┬──────┘                          │
└────────────────────────────┼──────────────────────────────┘
                             │
                             │ Webhooks & API
                             │
                ┌────────────▼────────────┐
                │   External CRM System   │
                │                         │
                │  • Receives call logs   │
                │  • Gets recordings      │
                │  • Syncs contacts       │
                └─────────────────────────┘
```

---

## Features

### Core Call Handling (Internal)
- **Agent UI**: Browser-based call widget with answer, hold, mute, transfer
- **Call Routing**: Department-based queues with round-robin, longest-idle strategies
- **IVR**: Interactive voice response with configurable menus
- **Business Hours**: Automatic after-hours handling and voicemail
- **Recording**: Automatic call recording with consent management
- **Transcription**: AI-powered call transcription
- **WebRTC**: Browser-based calling with fallback to phone callback

### CRM Integration (External APIs)
- **Call Logs Export**: Real-time and historical call data
- **Recording Access**: Signed URLs for secure recording downloads
- **Contact Sync**: Bi-directional contact synchronization
- **Webhooks**: Real-time call events pushed to your CRM
- **Department Management**: API-driven queue configuration

### Admin Features
- **Live Monitoring**: Real-time view of active calls and agent status
- **Call Supervision**: Silent monitor, barge-in, whisper coaching
- **Analytics**: Call metrics, duration, queue performance
- **Audit Logs**: Complete call history and event tracking

---

## Quick Start

### 1. Configure Twilio Credentials

Navigate to **Settings → Channels → Voice Calls (Beta)** and add your Twilio credentials as Supabase secrets:

```
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_API_KEY
TWILIO_API_SECRET
TWILIO_TWIML_APP_SID
```

### 2. Set Up Call Settings

Configure in **Settings → Channels → Voice Calls**:

- **Recording & Compliance**: Enable/disable recording, consent, transcription
- **Business Hours**: Set operating hours and voicemail settings
- **CRM Integration**: Add webhook URL and authorization token

### 3. Create Departments/Queues

Use the API to create call queues for different departments:

```bash
curl -X POST \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "sales",
    "display_name": "Sales Team",
    "phone_number": "+1234567890",
    "routing_strategy": "round-robin",
    "max_wait_time": 300,
    "after_hours_action": "voicemail"
  }' \
  https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-departments-manage
```

### 4. Configure Webhooks

Set your CRM webhook URL in call settings to receive real-time call events:

```json
{
  "crm_webhook_url": "https://your-crm.com/webhooks/calls",
  "crm_webhook_token": "your_bearer_token"
}
```

---

## API Reference

### Base URL
```
https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1
```

### Authentication
All API calls require an API key header:
```
x-api-key: YOUR_API_KEY
```

---

## Call Management APIs

### List Call Records
```bash
GET /api-calls-list?status=completed&limit=50
```

**Query Parameters:**
- `status`: Filter by call status (initiated, ringing, in-progress, completed, failed)
- `agent_id`: Filter by agent UUID
- `start_date`: ISO 8601 date (e.g., 2025-10-01T00:00:00Z)
- `end_date`: ISO 8601 date
- `limit`: Number of records (default: 50, max: 200)

**Response:**
```json
{
  "success": true,
  "calls": [
    {
      "id": "uuid",
      "twilio_call_sid": "CAxxxx",
      "direction": "inbound",
      "from_number": "+1234567890",
      "to_number": "+0987654321",
      "caller_name": "John Doe",
      "status": "completed",
      "duration_seconds": 180,
      "recording_url": "https://...",
      "transcript": "Call transcript...",
      "started_at": "2025-10-20T10:00:00Z",
      "ended_at": "2025-10-20T10:03:00Z",
      "agent": {
        "id": "uuid",
        "full_name": "Agent Name",
        "email": "agent@example.com"
      },
      "metadata": {}
    }
  ],
  "count": 50
}
```

### Get Call Details
```bash
GET /api-calls-details?call_id=uuid
```

Returns detailed call information including all events, recording consent, and metadata.

### Get Call Recording
```bash
GET /api-calls-recording?call_id=uuid
```

Returns a short-lived (1 hour) signed URL to download the recording.

**Response:**
```json
{
  "success": true,
  "recording_url": "https://api.twilio.com/...",
  "expires_at": "2025-10-20T11:00:00Z",
  "call_id": "uuid"
}
```

### Monitor Active Calls
```bash
GET /api-calls-monitor
```

Real-time dashboard data showing active calls, agent availability, and queue metrics.

**Response:**
```json
{
  "success": true,
  "metrics": {
    "active_calls": 5,
    "available_agents": 3,
    "busy_agents": 2,
    "total_agents": 5,
    "queued_calls": 1
  },
  "active_calls": [...],
  "agents": [...],
  "queues": [...]
}
```

---

## Department Management APIs

### List Departments
```bash
GET /api-departments-manage
```

### Create Department
```bash
POST /api-departments-manage
Content-Type: application/json

{
  "name": "support",
  "display_name": "Customer Support",
  "phone_number": "+1234567890",
  "routing_strategy": "longest-idle",
  "business_hours": {
    "monday": {"start": "09:00", "end": "17:00"},
    "tuesday": {"start": "09:00", "end": "17:00"}
  },
  "max_wait_time": 300,
  "music_url": "https://example.com/music.mp3",
  "after_hours_action": "voicemail"
}
```

**Routing Strategies:**
- `round-robin`: Distribute calls evenly among agents
- `longest-idle`: Route to agent who has been idle longest
- `most-idle`: Route to agent with most total idle time
- `skill-based`: Route based on agent skills (future)

### Update Department
```bash
PUT /api-departments-manage
Content-Type: application/json

{
  "queue_id": "uuid",
  "max_wait_time": 600,
  "enabled": true
}
```

### Delete Department
```bash
DELETE /api-departments-manage?queue_id=uuid
```

---

## Admin Call Actions

### Supervisor Controls
```bash
POST /api-calls-admin-action
Content-Type: application/json

{
  "call_sid": "CAxxxx",
  "action": "monitor",
  "supervisor_id": "+1234567890"
}
```

**Available Actions:**

1. **monitor** - Silent monitoring (supervisor can listen only)
2. **barge** - Barge-in (supervisor can speak to both parties)
3. **whisper** - Whisper coaching (supervisor can speak only to agent)
4. **disconnect** - End the call immediately

---

## Webhook Events

When configured, À La Carte Chat will POST call events to your CRM webhook URL.

### Event Payload Structure
```json
{
  "event": "call.status_update",
  "call": {
    "id": "uuid",
    "call_sid": "CAxxxx",
    "status": "completed",
    "direction": "inbound",
    "from_number": "+1234567890",
    "to_number": "+0987654321",
    "caller_name": "John Doe",
    "duration_seconds": 180,
    "started_at": "2025-10-20T10:00:00Z",
    "ended_at": "2025-10-20T10:03:00Z",
    "recording_url": "https://...",
    "transcript": "Call transcript...",
    "agent": {
      "id": "uuid",
      "name": "Agent Name"
    },
    "metadata": {}
  },
  "business": {
    "id": "uuid",
    "name": "Your Business"
  },
  "timestamp": "2025-10-20T10:03:00Z"
}
```

### Webhook Headers
```
Content-Type: application/json
Authorization: Bearer YOUR_WEBHOOK_TOKEN
X-Webhook-Event: call.status_update
X-Call-ID: uuid
```

### Event Types
- `call.status_update` - Call status changed (initiated, ringing, in-progress, completed, failed)

### Webhook Security
- Use HTTPS endpoints only
- Verify the `Authorization` header matches your token
- Validate the `X-Call-ID` header
- Return 2xx status codes to acknowledge receipt
- Implement idempotency using `call.id`

---

## Contact Synchronization

À La Carte Chat supports bi-directional contact sync with external CRMs through the existing Customers API.

### Push Contacts to À La Carte Chat
```bash
POST /api-customers-bulk-create
Content-Type: application/json

{
  "customers": [
    {
      "phone": "+1234567890",
      "name": "John Doe",
      "email": "john@example.com",
      "metadata": {
        "crm_id": "external_id_123",
        "account_type": "premium"
      }
    }
  ]
}
```

### Pull Contacts from À La Carte Chat
```bash
GET /api-customers?limit=100
```

### Update Contact
```bash
PUT /api-customers-update
Content-Type: application/json

{
  "customer_id": "uuid",
  "name": "John Doe Updated",
  "metadata": {...}
}
```

---

## Security & Compliance

### Call Recording Consent
- Configurable consent prompts before recording starts
- Recorded consent stored with each call
- Automatic compliance with recording laws

### Data Retention
- Configurable retention period (30-365 days)
- Automatic deletion of recordings and transcripts after retention period
- Audit logs for all access to recordings

### Access Control
- API keys with granular permissions
- Role-based access control for agents, supervisors, admins
- Signed, expiring URLs for recording access

### Data Protection
- Encryption in transit (HTTPS/TLS)
- Encryption at rest for recordings and transcripts
- GDPR-compliant data handling
- PII masking options for transcripts

---

## Best Practices

### For CRM Developers

1. **Implement Webhook Idempotency**: Use `call.id` to prevent duplicate processing
2. **Handle Webhook Retries**: Return 2xx quickly, process asynchronously
3. **Store Call IDs**: Map À La Carte Chat call IDs to your CRM records
4. **Use Signed URLs**: Download recordings immediately, don't store expired URLs
5. **Sync Contacts Regularly**: Keep customer data synchronized
6. **Monitor Webhook Health**: Track failed webhooks and retry

### For System Administrators

1. **Configure Business Hours**: Set accurate operating hours for proper routing
2. **Set Up Voicemail**: Configure voicemail greetings for after-hours
3. **Create Departments**: Organize agents into logical call queues
4. **Enable Recording**: Turn on call recording with consent for quality assurance
5. **Test Webhooks**: Verify webhook delivery to your CRM
6. **Monitor Metrics**: Track call volume, agent availability, abandonment rates

---

## Troubleshooting

### Calls Not Routing
- Verify Twilio credentials are configured correctly
- Check that agents have set their availability to "available"
- Ensure business hours are configured correctly
- Check queue settings and agent assignments

### Recordings Not Available
- Verify recording is enabled in call settings
- Check that consent was given (if required)
- Allow 1-2 minutes for recording to process after call ends
- Verify retention period hasn't expired

### Webhooks Not Firing
- Check webhook URL is accessible from the internet
- Verify authorization token is correct
- Check webhook logs in call events table
- Ensure endpoint returns 2xx status code

### Contact Sync Issues
- Verify API key has customer permissions
- Check phone number format (E.164: +1234567890)
- Ensure no duplicate phone numbers
- Check rate limits (1000 requests/hour)

---

## Rate Limits

- **API Calls**: 1000 requests/hour per API key
- **Webhooks**: Unlimited incoming webhooks
- **Concurrent Calls**: Based on Twilio account limits
- **Recording Storage**: Based on retention policy

Contact support to increase limits for enterprise accounts.

---

## Support

For technical support or questions:
- Email: support@alacartechat.com
- Documentation: https://alacartechat.com/docs
- API Status: https://status.alacartechat.com

---

## Changelog

### v1.0 (October 2025)
- Initial release
- Inbound/outbound calling
- Call recording and transcription
- Department routing with queues
- CRM webhook integration
- Admin supervision features
- Contact synchronization API
