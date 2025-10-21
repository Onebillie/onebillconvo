# AI Chatbot Enhancement Plan

## Executive Summary
This document outlines a comprehensive plan to transform À La Carte Chat's AI assistant into a market-leading, multi-provider AI chatbot solution that competes with platforms like Intercom, Zendesk, and Freshdesk.

## Current State Analysis

### What We Have ✓
- Basic AI assistant using Lovable AI (Google Gemini)
- Q&A training data system
- RAG documents for knowledge base
- Out-of-hours automation mode
- Approval queue functionality
- Response suggestions
- System prompt customization

### Limitations ⚠️
- Only supports Lovable AI (no BYOK)
- No sentiment analysis
- No intent detection
- No automatic language detection
- Limited conversation context
- No analytics/metrics
- No voice capabilities
- No image/file understanding
- Basic routing logic

## Competitive Feature Matrix

### Tier 1 Features (Intercom, Zendesk, Freshdesk Standard)
| Feature | Intercom | Zendesk | Freshdesk | À La Carte | Priority |
|---------|----------|---------|-----------|------------|----------|
| Multi-provider AI (BYOK) | ✓ | ✓ | ✓ | Partial | **HIGH** |
| Sentiment analysis | ✓ | ✓ | ✓ | ✗ | **HIGH** |
| Intent detection | ✓ | ✓ | ✓ | ✗ | **HIGH** |
| Language detection | ✓ | ✓ | ✓ | ✗ | HIGH |
| Conversation context | ✓ | ✓ | ✓ | Partial | MEDIUM |
| Knowledge base | ✓ | ✓ | ✓ | ✓ | ✓ |
| FAQs training | ✓ | ✓ | ✓ | ✓ | ✓ |
| Human handoff | ✓ | ✓ | ✓ | Manual | MEDIUM |
| Smart routing | ✓ | ✓ | ✓ | ✗ | HIGH |
| AI analytics | ✓ | ✓ | ✓ | ✗ | MEDIUM |

### Tier 2 Features (Advanced Capabilities)
| Feature | Competitors | À La Carte | Priority |
|---------|-------------|------------|----------|
| Voice AI (speech-to-text, text-to-speech) | Some | ✗ | MEDIUM |
| Image understanding | Some | ✗ | LOW |
| File/document Q&A | Some | ✗ | LOW |
| Predictive responses | Some | ✗ | LOW |
| CSAT prediction | Some | ✗ | LOW |
| Proactive messaging | Some | ✗ | LOW |

## Enhancement Roadmap

### Phase 1: BYOK & Multi-Provider Support (CRITICAL) 🔥

**Why:** Customers want to use their own AI accounts to:
1. Control costs directly
2. Stay within their existing AI contracts
3. Avoid platform lock-in
4. Use preferred models (GPT-5, Claude Opus, etc.)

**Implementation:**
1. **Secure API Key Storage**
   - Encrypted storage in `ai_api_keys` table
   - Per-business encryption keys
   - Never expose keys in frontend

2. **Supported Providers:**
   - ✅ OpenAI (GPT-5, GPT-5-mini, GPT-5-nano, GPT-4o, GPT-4o-mini)
   - ✅ Anthropic Claude (Opus 4, Sonnet 4.5, Haiku 3.5)
   - ✅ Google Gemini (via direct API, not Lovable)
   - ✅ Azure OpenAI
   - ✅ Custom OpenAI-compatible endpoints (Groq, Together.ai, Perplexity)

3. **Fallback System:**
   - Primary provider fails → fallback to secondary
   - Rate limit exceeded → queue and retry
   - Credit exhausted → notify admin

4. **Cost Tracking:**
   - Track tokens used per conversation
   - Display cost estimates in dashboard
   - Alert when approaching budget limits

### Phase 2: Sentiment & Intent Analysis (HIGH) 🎯

**Sentiment Analysis:**
- Detect customer emotion: positive, neutral, negative, frustrated, urgent
- Use lightweight model for real-time detection
- Visual indicators in conversation list
- Auto-prioritize negative sentiment conversations
- Escalate to senior staff for frustrated customers

**Intent Detection:**
- Classify intent: question, complaint, purchase, support, feedback, etc.
- Auto-route to appropriate team/department
- Suggest relevant templates
- Pre-fill ticket categories

**Implementation:**
```typescript
// Real-time sentiment analysis
interface SentimentResult {
  score: number; // -1 to 1
  label: 'positive' | 'neutral' | 'negative' | 'frustrated' | 'urgent';
  confidence: number;
}

// Intent classification
interface IntentResult {
  primary: string; // e.g., 'product_inquiry', 'complaint', 'billing'
  confidence: number;
  suggested_action: string;
}
```

### Phase 3: Smart Language Detection & Translation (HIGH) 🌍

**Auto-detect customer language:**
- Detect language from first message
- Tag conversation with language
- Route to agents speaking that language
- Show language badge in UI

**AI Translation:**
- Translate customer messages to staff language
- Translate staff responses to customer language
- Show original + translated side-by-side
- Support 50+ languages

### Phase 4: Advanced Context & Memory (MEDIUM) 🧠

**Enhanced Conversation Context:**
- Full conversation history (not just last 10 messages)
- Previous conversations with same customer
- Customer profile data (name, history, purchases)
- Related tickets/conversations
- Customer tags and notes

**Long-term Memory:**
- Customer preferences
- Previous issues resolved
- Product interests
- Communication style preferences

### Phase 5: AI Analytics Dashboard (MEDIUM) 📊

**Metrics to Track:**
- AI response accuracy (thumbs up/down)
- Resolution rate (% resolved without human)
- Average response time
- Customer satisfaction per AI conversation
- Cost per conversation
- Most common intents
- Sentiment trends
- Language distribution
- Escalation reasons

**Visualizations:**
- Response quality over time
- AI vs human resolution comparison
- Cost breakdown by provider/model
- Sentiment distribution
- Intent classification heatmap

### Phase 6: Voice AI (OPTIONAL) 🎤

**Speech-to-Text:**
- Convert voice messages to text
- Auto-generate AI response
- Support WhatsApp voice notes

**Text-to-Speech:**
- Generate voice responses
- Natural-sounding voices
- Multi-language support

### Phase 7: Advanced Capabilities (LOW) 🚀

- **Image Understanding:** Analyze product photos, screenshots
- **Document Q&A:** Answer questions from uploaded PDFs
- **Predictive Responses:** Suggest responses before customer finishes typing
- **Proactive Messaging:** Reach out based on behavior patterns
- **CSAT Prediction:** Predict if customer will be satisfied

## Technical Architecture

### New Database Tables

```sql
-- AI provider configurations (BYOK)
CREATE TABLE ai_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  provider TEXT NOT NULL, -- 'openai', 'anthropic', 'google', 'azure', 'custom'
  api_key_encrypted TEXT, -- Encrypted API key
  api_endpoint TEXT, -- For custom providers
  model TEXT NOT NULL, -- 'gpt-5', 'claude-sonnet-4-5', etc.
  is_primary BOOLEAN DEFAULT false,
  is_fallback BOOLEAN DEFAULT false,
  max_tokens INTEGER DEFAULT 1000,
  temperature DECIMAL DEFAULT 0.7,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sentiment tracking
CREATE TABLE message_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id),
  sentiment_score DECIMAL, -- -1 to 1
  sentiment_label TEXT, -- 'positive', 'negative', etc.
  confidence DECIMAL,
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intent tracking
CREATE TABLE message_intent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id),
  intent_primary TEXT, -- 'product_inquiry', 'complaint', etc.
  intent_confidence DECIMAL,
  suggested_action TEXT,
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Language detection
CREATE TABLE conversation_language (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  detected_language TEXT, -- ISO 639-1 code
  confidence DECIMAL,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI analytics
CREATE TABLE ai_response_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  message_id UUID REFERENCES messages(id),
  provider TEXT,
  model TEXT,
  tokens_used INTEGER,
  cost_usd DECIMAL,
  response_time_ms INTEGER,
  user_feedback TEXT, -- 'thumbs_up', 'thumbs_down', null
  resolved_without_human BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New Edge Functions

```typescript
// 1. ai-detect-sentiment
// Real-time sentiment analysis
// Returns: sentiment score, label, confidence

// 2. ai-detect-intent
// Intent classification
// Returns: intent, confidence, suggested_action

// 3. ai-detect-language
// Language detection
// Returns: language code, confidence

// 4. ai-translate
// Translate between languages
// Input: text, source_lang, target_lang
// Returns: translated text

// 5. ai-route-conversation
// Smart routing based on intent, language, sentiment
// Returns: suggested team/agent, reasoning

// 6. ai-provider-request
// Universal AI request handler for multiple providers
// Handles: OpenAI, Anthropic, Google, Azure, Custom
// Returns: AI response with usage/cost tracking
```

## UI Enhancements

### Settings Page Improvements

```typescript
// New sections to add:
1. AI Provider Management
   - Add/edit/remove providers
   - Test API keys
   - Set primary/fallback
   - View usage/costs

2. Sentiment Settings
   - Enable/disable sentiment analysis
   - Configure escalation rules
   - Set priority thresholds

3. Intent Configuration
   - Define custom intents
   - Map intents to teams
   - Configure routing rules

4. Language Settings
   - Set primary business language
   - Enable auto-translation
   - Configure language routing

5. AI Analytics
   - Performance dashboard
   - Cost tracking
   - Quality metrics
```

### Conversation UI Enhancements

```typescript
// Visual indicators:
- Sentiment badge (emoji + color)
- Intent label
- Language flag
- AI confidence indicator
- Cost estimate per conversation
- "AI handled" badge for autonomous resolutions
```

## Pricing Strategy

### Our Pricing vs Competitors

**Lovable AI (Included):**
- Professional: 1,000 responses/month, then $0.02/response
- Enterprise: Unlimited

**BYOK (Customer's Cost):**
- Customer pays their provider directly
- We charge platform fee:
  - Professional: $0.005/AI request (monitoring/analytics)
  - Enterprise: Included (unlimited)

**Sentiment/Intent/Language:**
- Uses same AI call, no extra charge
- Real-time processing included

**Competitor Pricing (Reference):**
- Intercom: $0.99 per AI resolution
- Zendesk: $1.00 per AI resolution
- Freshdesk: $0.75 per AI resolution

**Our Advantage:**
- Lower base price with BYOK
- More flexible provider options
- No resolution-based pricing (pay per request)
- Better for high-volume use cases

## Implementation Priority

### Phase 1 (NOW) - 2 weeks
✅ BYOK support for OpenAI
✅ BYOK support for Anthropic Claude
✅ Secure API key storage
✅ Provider testing UI
✅ Cost tracking

### Phase 2 (NEXT) - 2 weeks
✅ Sentiment analysis
✅ Intent detection
✅ Language detection
✅ Smart routing rules
✅ UI indicators

### Phase 3 (LATER) - 2 weeks
✅ Translation service
✅ Advanced context
✅ Analytics dashboard
✅ Performance metrics

### Phase 4 (FUTURE) - TBD
- Voice AI
- Image understanding
- Document Q&A
- Predictive features

## Success Metrics

**Adoption:**
- % of businesses enabling AI
- % using BYOK vs Lovable AI
- Average messages handled by AI

**Performance:**
- AI resolution rate (target: 40%+)
- Average response time (target: <2s)
- Customer satisfaction with AI (target: >4.0/5)
- Escalation rate (target: <20%)

**Business:**
- Cost savings vs hiring support agents
- Revenue from AI features
- Churn reduction
- NPS improvement

## Competitive Positioning

**Our Unique Value Proposition:**
1. **Cost Flexibility:** BYOK or included AI - customer chooses
2. **Provider Choice:** OpenAI, Claude, Gemini, or custom - not locked in
3. **Multi-channel Native:** WhatsApp, Email, SMS, IG, FB in one AI brain
4. **Transparent Pricing:** No per-resolution fees, just platform fee
5. **White Label Ready:** Can be branded for enterprise customers

## Next Steps

1. ✅ Review and approve this plan
2. ✅ Prioritize Phase 1 features
3. ✅ Design BYOK UI/UX
4. ✅ Implement secure key storage
5. ✅ Build provider abstraction layer
6. ✅ Test with pilot customers

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-21  
**Owner:** Product Team
