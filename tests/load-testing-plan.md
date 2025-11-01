# 📊 LOAD TESTING PLAN
**Purpose:** Verify system can handle production scale (1000s of businesses, 100,000s of customers)

---

## LOAD TESTING OBJECTIVES

### Capacity Goals
- **100 concurrent users per business** - Support medium-sized teams
- **1,000 msg/sec system-wide** - Handle peak traffic
- **10,000 simultaneous dashboard opens** - Marketing campaign traffic spike
- **P95 latency < 1.5s** - Maintain responsiveness under load
- **Database CPU < 70%** - Headroom for traffic spikes
- **Edge function success rate > 99.9%** - High reliability

### Test Scenarios
1. Normal load (baseline)
2. Peak load (3x normal)
3. Spike load (10x normal for 5 minutes)
4. Sustained load (2x normal for 1 hour)
5. Gradual ramp-up (0 to 10x over 30 minutes)

---

## TEST ENVIRONMENT

### Infrastructure
- **Tool:** k6 (Grafana's load testing tool)
- **Environment:** Production-like staging OR isolated Supabase project
- **Monitoring:** Supabase Dashboard + custom metrics

### Test Data
- **Businesses:** 50 test businesses
- **Users:** 500 test user accounts
- **Conversations:** 5,000 test conversations
- **Messages:** 50,000 historical messages

---

## TEST 1: Dashboard Load Test

### Objective
Verify dashboard can handle many concurrent users loading conversations.

### k6 Script

```javascript
// tests/k6/dashboard-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 500 },   // Ramp to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'], // 95% of requests < 1.5s
    http_req_failed: ['rate<0.01'],    // < 1% failures
    errors: ['rate<0.01'],
  },
};

const SUPABASE_URL = 'https://jrtlrnfdqfkjlkpfirzr.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpydGxybmZkcWZramxrcGZpcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5NTcsImV4cCI6MjA3Mzc3MDk1N30.9mXWW_V8jJEjxiohExZWrh4rNRlKf2yocahkSNkjJHs';

// Test user JWTs (pre-generated for test users)
const testTokens = [
  'JWT_TOKEN_1',
  'JWT_TOKEN_2',
  // ... 50 test tokens
];

export default function () {
  const token = testTokens[__VU % testTokens.length];
  
  // Load conversations
  const conversationsRes = http.get(
    `${SUPABASE_URL}/rest/v1/conversations?select=*&order=last_message_at.desc&limit=50`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': ANON_KEY,
      },
    }
  );

  const success = check(conversationsRes, {
    'status is 200': (r) => r.status === 200,
    'response time < 1.5s': (r) => r.timings.duration < 1500,
  });

  errorRate.add(!success);

  // Load messages for first conversation
  if (conversationsRes.json() && conversationsRes.json().length > 0) {
    const firstConvId = conversationsRes.json()[0].id;
    
    const messagesRes = http.get(
      `${SUPABASE_URL}/rest/v1/messages?conversation_id=eq.${firstConvId}&order=created_at.desc&limit=50`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': ANON_KEY,
        },
      }
    );

    check(messagesRes, {
      'messages loaded': (r) => r.status === 200,
      'messages response time < 1s': (r) => r.timings.duration < 1000,
    });
  }

  sleep(1); // Think time between requests
}
```

### Success Criteria
- ✅ P95 < 1.5s for conversation loading
- ✅ P95 < 1s for message loading
- ✅ < 1% error rate
- ✅ Database CPU < 70%
- ✅ No connection pool exhaustion

---

## TEST 2: Message Sending Load Test

### Objective
Verify system can handle 1,000 messages per second across all channels.

### k6 Script

```javascript
// tests/k6/message-send-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    whatsapp: {
      executor: 'constant-arrival-rate',
      rate: 600, // 600 msg/sec
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 100,
      exec: 'sendWhatsApp',
    },
    email: {
      executor: 'constant-arrival-rate',
      rate: 300, // 300 msg/sec
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 25,
      maxVUs: 50,
      exec: 'sendEmail',
    },
    sms: {
      executor: 'constant-arrival-rate',
      rate: 100, // 100 msg/sec
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 10,
      maxVUs: 25,
      exec: 'sendSms',
    },
  },
  thresholds: {
    'http_req_duration{scenario:whatsapp}': ['p(95)<500'],
    'http_req_duration{scenario:email}': ['p(95)<800'],
    'http_req_duration{scenario:sms}': ['p(95)<500'],
    'http_req_failed': ['rate<0.001'], // < 0.1% failures
  },
};

export function sendWhatsApp() {
  const res = http.post(
    'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/whatsapp-send',
    JSON.stringify({
      to: '1234567890',
      message: `Load test message ${Date.now()}`,
      conversation_id: 'LOAD_TEST_CONVERSATION'
    }),
    {
      headers: {
        'Authorization': 'Bearer TEST_JWT',
        'Content-Type': 'application/json',
      },
    }
  );

  check(res, { 'whatsapp send success': (r) => r.status === 200 });
}

export function sendEmail() {
  const res = http.post(
    'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/email-send-smtp',
    JSON.stringify({
      to: 'test@example.com',
      subject: `Load test email ${Date.now()}`,
      content: 'This is a load test email',
      account_id: 'TEST_EMAIL_ACCOUNT'
    }),
    {
      headers: {
        'Authorization': 'Bearer TEST_JWT',
        'Content-Type': 'application/json',
      },
    }
  );

  check(res, { 'email send success': (r) => r.status === 200 });
}

export function sendSms() {
  const res = http.post(
    'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/sms-send',
    JSON.stringify({
      to: '+1234567890',
      body: `Load test SMS ${Date.now()}`,
      conversation_id: 'LOAD_TEST_CONVERSATION'
    }),
    {
      headers: {
        'Authorization': 'Bearer TEST_JWT',
        'Content-Type': 'application/json',
      },
    }
  );

  check(res, { 'sms send success': (r) => r.status === 200 });
}
```

### Success Criteria
- ✅ 1,000 msg/sec sustained for 5 minutes
- ✅ < 0.1% failure rate
- ✅ P95 latency within targets
- ✅ No database errors
- ✅ No rate limit errors

---

## TEST 3: Realtime Subscription Load Test

### Objective
Verify realtime updates work under load with many concurrent subscriptions.

### k6 Script

```javascript
// tests/k6/realtime-load-test.js
import ws from 'k6/ws';
import { check } from 'k6';

export const options = {
  vus: 1000, // 1000 concurrent WebSocket connections
  duration: '5m',
};

export default function () {
  const url = 'wss://jrtlrnfdqfkjlkpfirzr.supabase.co/realtime/v1/websocket?apikey=ANON_KEY&vsn=1.0.0';

  const res = ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      // Subscribe to conversations
      socket.send(JSON.stringify({
        topic: 'realtime:public:conversations',
        event: 'phx_join',
        payload: {},
        ref: '1',
      }));

      // Subscribe to messages
      socket.send(JSON.stringify({
        topic: 'realtime:public:messages',
        event: 'phx_join',
        payload: {},
        ref: '2',
      }));
    });

    socket.on('message', (msg) => {
      // Verify messages received
      check(msg, {
        'message received': (m) => m.length > 0,
      });
    });

    socket.setTimeout(() => {
      socket.close();
    }, 300000); // 5 minutes
  });

  check(res, { 'status is 101': (r) => r && r.status === 101 });
}
```

### Success Criteria
- ✅ 1,000 concurrent WebSocket connections
- ✅ All subscriptions successful
- ✅ Real-time updates delivered
- ✅ < 100ms message latency
- ✅ No connection drops

---

## TEST 4: Database Query Performance

### Objective
Verify database can handle query load from many concurrent users.

### Test Queries

```sql
-- Query 1: Load conversations (most common)
EXPLAIN ANALYZE
SELECT * FROM conversations 
WHERE business_id = 'TEST_BUSINESS_ID'
ORDER BY last_message_at DESC 
LIMIT 50;

-- Query 2: Load messages (second most common)
EXPLAIN ANALYZE
SELECT * FROM messages 
WHERE conversation_id = 'TEST_CONVERSATION_ID'
ORDER BY created_at DESC 
LIMIT 100;

-- Query 3: Search messages (expensive)
EXPLAIN ANALYZE
SELECT * FROM messages 
WHERE business_id = 'TEST_BUSINESS_ID'
  AND content ILIKE '%search term%'
LIMIT 50;

-- Query 4: Aggregate analytics (expensive)
EXPLAIN ANALYZE
SELECT 
  channel,
  COUNT(*) as message_count,
  COUNT(DISTINCT conversation_id) as conversation_count
FROM messages
WHERE business_id = 'TEST_BUSINESS_ID'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY channel;
```

### Success Criteria
- ✅ Query 1 execution time < 50ms
- ✅ Query 2 execution time < 100ms
- ✅ Query 3 execution time < 500ms
- ✅ Query 4 execution time < 1s
- ✅ Proper indexes used (no sequential scans)

---

## TEST 5: Edge Function Cold Start

### Objective
Verify edge functions perform well even after being cold (not recently used).

### Test Method

```javascript
// tests/k6/cold-start-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    cold_start: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 10,
      maxDuration: '5m',
    },
  },
};

const functions = [
  'check-subscription',
  'whatsapp-send',
  'email-send-smtp',
  'sms-send',
  'create-checkout',
];

export default function () {
  functions.forEach(funcName => {
    // Wait 3 minutes between calls to ensure cold start
    console.log(`Testing ${funcName} cold start...`);
    
    const res = http.post(
      `https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/${funcName}`,
      JSON.stringify({}),
      {
        headers: {
          'Authorization': 'Bearer TEST_JWT',
          'Content-Type': 'application/json',
        },
      }
    );

    check(res, {
      [`${funcName} cold start < 3s`]: (r) => r.timings.duration < 3000,
    });

    sleep(180); // Wait 3 minutes for next test
  });
}
```

### Success Criteria
- ✅ All functions cold start < 3s
- ✅ Warm start < 500ms
- ✅ No timeout errors

---

## TEST 6: Storage & File Upload Load

### Objective
Verify file upload performance under concurrent load.

### k6 Script

```javascript
// tests/k6/file-upload-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 50,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Generate random file content (1MB)
  const fileData = 'x'.repeat(1024 * 1024);
  
  const formData = {
    file: http.file(fileData, `test-file-${__VU}-${Date.now()}.pdf`),
  };

  const res = http.post(
    'https://jrtlrnfdqfkjlkpfirzr.supabase.co/storage/v1/object/customer_media/test/' + __VU + '.pdf',
    formData,
    {
      headers: {
        'Authorization': `Bearer TEST_JWT`,
      },
    }
  );

  check(res, {
    'upload success': (r) => r.status === 200,
    'upload time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}
```

### Success Criteria
- ✅ 50 concurrent uploads sustained
- ✅ P95 upload time < 2s
- ✅ < 1% failure rate
- ✅ Storage bucket healthy

---

## TEST 7: Payment System Load Test

### Objective
Verify Stripe checkout can handle concurrent subscription purchases.

### k6 Script

```javascript
// tests/k6/payment-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  // Create checkout session
  const res = http.post(
    'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/create-checkout',
    JSON.stringify({
      priceId: 'price_1SGKezGwvNoo6Q8zqFoPV1vU',
      quantity: 1
    }),
    {
      headers: {
        'Authorization': `Bearer TEST_JWT_${__VU}`,
        'Content-Type': 'application/json',
      },
    }
  );

  check(res, {
    'checkout created': (r) => r.status === 200,
    'has url': (r) => r.json('url') !== undefined,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(3);
}
```

### Success Criteria
- ✅ 20 concurrent checkouts sustained
- ✅ P95 < 2s
- ✅ All sessions valid
- ✅ No Stripe rate limit errors

---

## TEST 8: API Rate Limiting

### Objective
Verify rate limiting prevents abuse without blocking legitimate traffic.

### Test Method

```javascript
// tests/k6/rate-limit-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    rate_limit_test: {
      executor: 'constant-arrival-rate',
      rate: 2000, // 2000 req/hr = way over 1000 limit
      timeUnit: '1h',
      duration: '1m',
      preAllocatedVUs: 10,
    },
  },
};

export default function () {
  const res = http.get(
    'https://jrtlrnfdqfkjlkpfirzr.supabase.co/rest/v1/conversations?select=count',
    {
      headers: {
        'Authorization': 'Bearer TEST_JWT',
        'apikey': 'ANON_KEY',
      },
    }
  );

  if (res.status === 429) {
    check(res, {
      'rate limit triggered': (r) => r.status === 429,
      'has retry-after header': (r) => r.headers['Retry-After'] !== undefined,
    });
  }
}
```

### Success Criteria
- ✅ Rate limit triggers at 1,000 req/hr
- ✅ 429 status returned
- ✅ Retry-After header present
- ✅ Legitimate traffic not blocked

---

## TEST EXECUTION PLAN

### Phase 1: Baseline (30 min)
1. Run TEST 1 with 10 users
2. Establish baseline performance
3. Document P50, P95, P99 latencies

### Phase 2: Normal Load (1 hour)
1. Run TEST 1 with 100 users
2. Run TEST 2 with 200 msg/sec
3. Monitor database performance
4. Check for errors

### Phase 3: Peak Load (1 hour)
1. Run TEST 1 with 500 users
2. Run TEST 2 with 1,000 msg/sec
3. Run TEST 3 with 1,000 WebSockets
4. Monitor all systems
5. Document degradation (if any)

### Phase 4: Spike Test (30 min)
1. Ramp to 5,000 users in 1 minute
2. Sustain for 5 minutes
3. Verify system recovers
4. Check for errors

### Phase 5: Soak Test (2 hours)
1. Run at 2x normal load
2. Monitor for memory leaks
3. Check connection pool stability
4. Verify no degradation over time

---

## MONITORING DURING TESTS

### Metrics to Watch

**Supabase Dashboard:**
- Database CPU %
- Database memory usage
- Active connections count
- Edge function invocations
- Edge function error rate
- Edge function duration (P95)

**Custom Metrics:**
- Message delivery success rate
- Conversation load time (P95)
- Message send latency (P95)
- Realtime update latency
- Webhook processing time

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Database CPU | >70% | >85% |
| DB Connections | >80 | >95 |
| Error Rate | >1% | >5% |
| P95 Latency | >2s | >3s |
| Message Loss | >0 | >0 |

---

## RESULTS DOCUMENTATION

### Template

```markdown
# Load Test Results - YYYY-MM-DD

## Test Configuration
- Duration: X minutes
- Users: Y concurrent
- Message rate: Z/sec

## Performance Metrics
| Metric | P50 | P95 | P99 | Max |
|--------|-----|-----|-----|-----|
| Dashboard Load | Xms | Xms | Xms | Xms |
| Message Send | Xms | Xms | Xms | Xms |
| Message Receive | Xms | Xms | Xms | Xms |

## Resource Utilization
- Database CPU: X% (peak)
- Database RAM: X% (peak)
- DB Connections: X (peak)
- Edge Function Errors: X%

## Issues Found
1. [Issue description]
   - Severity: [P1/P2/P3]
   - Reproduction: [Steps]
   - Fix: [Solution]

## Bottlenecks Identified
1. [Bottleneck description]
   - Impact: [Performance impact]
   - Mitigation: [How to fix]

## Capacity Limits
- Max concurrent users: X
- Max messages/sec: X
- Max WebSocket connections: X

## Recommendations
1. [Recommendation 1]
2. [Recommendation 2]

## PASS/FAIL
- [ ] All performance thresholds met
- [ ] < 1% error rate
- [ ] No message loss
- [ ] System recovered after spike
```

---

## TOOLS & SETUP

### Install k6

```bash
# macOS
brew install k6

# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

### Run Tests

```bash
# Run dashboard load test
k6 run tests/k6/dashboard-load-test.js

# Run message sending load test
k6 run tests/k6/message-send-test.js

# Generate HTML report
k6 run --out json=results.json tests/k6/dashboard-load-test.js
# Convert to HTML with k6-reporter or similar tool
```

---

## EMERGENCY PROCEDURES

### If Load Test Causes Production Issues

1. **STOP TEST IMMEDIATELY**
```bash
# Kill k6 process
pkill -9 k6
```

2. **Assess damage:**
```sql
-- Check for any corrupted data
SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '10 minutes';
-- Check database health
SELECT * FROM pg_stat_activity;
```

3. **Recovery:**
- Scale database if needed
- Clear connection pool
- Verify data integrity
- Notify affected users

---

## ESTIMATED TIMELINE

| Phase | Duration | Resources |
|-------|----------|-----------|
| Setup & baseline | 1 hour | 1 SRE |
| Normal load tests | 2 hours | 1 SRE |
| Peak load tests | 2 hours | 1 SRE + 1 Dev |
| Analysis & fixes | 4 hours | 2 Dev |
| Retest | 2 hours | 1 SRE |
| **Total** | **11 hours** | **Team effort** |

---

**Status:** Plan defined, ready for execution  
**Owner:** SRE Team  
**Priority:** P1 - Blocking Launch
