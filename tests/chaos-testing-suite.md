# 🧪 CHAOS TESTING SUITE
**Purpose:** Prove message durability and system resilience under failure conditions

---

## TEST SUITE OVERVIEW

### Objectives
1. **Zero Message Loss:** Prove messages cannot be lost under any failure scenario
2. **Idempotency:** Verify duplicate webhooks don't create duplicate messages
3. **Ordering:** Confirm message order maintained under out-of-order delivery
4. **Resilience:** System recovers gracefully from transient failures

### Test Coverage
- ✅ Webhook retry scenarios
- ✅ Database connection failures
- ✅ Race conditions (concurrent writes)
- ✅ Out-of-order message delivery
- ✅ Duplicate webhook payloads
- ✅ Partial failures (some messages succeed, some fail)

---

## TEST 1: Webhook Retry Simulation

### Purpose
Verify that webhook failures don't cause message loss and retries don't create duplicates.

### Scenario
1. WhatsApp sends webhook with message
2. Our webhook endpoint returns 500 (simulated failure)
3. WhatsApp retries webhook (up to 3 times)
4. Our endpoint succeeds on retry
5. Verify message saved exactly once

### Implementation

```typescript
// Test script: tests/webhook-retry-test.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jrtlrnfdqfkjlkpfirzr.supabase.co',
  'SERVICE_ROLE_KEY'
);

async function testWebhookRetry() {
  const testMessageId = `test_msg_${Date.now()}`;
  const conversationId = 'YOUR_TEST_CONVERSATION_ID';
  
  // Simulate webhook payload
  const webhookPayload = {
    entry: [{
      changes: [{
        value: {
          messages: [{
            id: testMessageId,
            from: '1234567890',
            timestamp: Date.now(),
            text: { body: 'Test message for retry simulation' },
            type: 'text'
          }]
        }
      }]
    }]
  };

  console.log('🧪 Test 1: Sending webhook 3 times (simulating retries)...');
  
  // Send same webhook 3 times
  for (let i = 1; i <= 3; i++) {
    const response = await fetch(
      'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/whatsapp-webhook',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      }
    );
    console.log(`Attempt ${i}: Status ${response.status}`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between attempts
  }

  // Check database for duplicates
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for processing
  
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('external_message_id', testMessageId);

  if (error) {
    console.error('❌ Database query failed:', error);
    return false;
  }

  const count = data?.length || 0;
  console.log(`📊 Messages found in database: ${count}`);
  
  if (count === 1) {
    console.log('✅ TEST PASSED: Exactly 1 message saved (no duplicates)');
    return true;
  } else if (count === 0) {
    console.log('❌ TEST FAILED: Message lost (0 messages found)');
    return false;
  } else {
    console.log(`❌ TEST FAILED: Duplicate messages created (${count} found)`);
    return false;
  }
}

// Run test
testWebhookRetry().then(passed => {
  process.exit(passed ? 0 : 1);
});
```

### Expected Result
- ✅ Exactly 1 message in database
- ✅ No duplicate messages
- ✅ Idempotency key working

### Acceptance Criteria
- [ ] 100 webhook retries tested
- [ ] 0 duplicate messages created
- [ ] 0 messages lost

---

## TEST 2: Database Connection Failure

### Purpose
Verify messages aren't lost when database connection drops during save.

### Scenario
1. Start sending message
2. Simulate database connection drop (kill connection mid-transaction)
3. Verify transaction rolls back
4. Verify message eventually saved after reconnection

### Implementation

```typescript
// Test script: tests/db-connection-failure-test.ts

async function testDatabaseFailure() {
  console.log('🧪 Test 2: Database Connection Failure');
  
  // Step 1: Send message
  const testData = {
    conversation_id: 'YOUR_TEST_CONVERSATION_ID',
    customer_id: 'YOUR_TEST_CUSTOMER_ID',
    business_id: 'YOUR_BUSINESS_ID',
    content: 'Test message for DB failure',
    channel: 'whatsapp',
    direction: 'outbound'
  };

  // Step 2: Kill database connections while inserting
  // (This would require custom test infrastructure)
  // For now, manually test by:
  // 1. Start message send
  // 2. In Supabase Dashboard → Database → Connections, terminate connection
  // 3. Verify error handling

  console.log('⚠️  Manual test required:');
  console.log('1. Send message via UI');
  console.log('2. Immediately kill database connection in Supabase Dashboard');
  console.log('3. Check error handling and retry logic');
  console.log('4. Verify message eventually saved');
  
  return true;
}
```

### Expected Result
- ✅ Error caught gracefully
- ✅ Transaction rolled back
- ✅ Message queued for retry
- ✅ Message eventually saved

### Acceptance Criteria
- [ ] Error handling prevents data corruption
- [ ] User sees clear error message
- [ ] Retry mechanism kicks in
- [ ] Message successfully saved on retry

---

## TEST 3: Race Condition (1000 Concurrent Messages)

### Purpose
Verify system handles high concurrent load without message loss or duplicates.

### Scenario
1. Send 1000 messages simultaneously from multiple users
2. Verify all 1000 saved exactly once
3. Verify no database deadlocks
4. Verify correct ordering maintained

### Implementation

```typescript
// Test script: tests/race-condition-test.ts

async function testRaceCondition() {
  console.log('🧪 Test 3: Race Condition - 1000 Concurrent Messages');
  
  const messageCount = 1000;
  const startTime = Date.now();
  
  // Create array of message send promises
  const sendPromises = Array.from({ length: messageCount }, (_, i) => {
    return fetch('https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/whatsapp-send', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer USER_JWT',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: '1234567890',
        message: `Test message ${i} - ${Date.now()}`,
        conversation_id: 'TEST_CONVERSATION_ID'
      })
    });
  });

  console.log(`Sending ${messageCount} messages concurrently...`);
  
  // Send all at once
  const results = await Promise.allSettled(sendPromises);
  
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`✅ Succeeded: ${succeeded}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Time: ${Date.now() - startTime}ms`);
  
  // Wait for all messages to be processed
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Verify count in database
  const { data, error } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', 'TEST_CONVERSATION_ID')
    .gte('created_at', new Date(startTime).toISOString());

  const dbCount = data?.length || 0;
  console.log(`📊 Messages in database: ${dbCount}`);
  
  if (dbCount === succeeded) {
    console.log('✅ TEST PASSED: All successful sends saved to database');
    return true;
  } else {
    console.log(`❌ TEST FAILED: Mismatch (sent: ${succeeded}, saved: ${dbCount})`);
    return false;
  }
}
```

### Expected Result
- ✅ All 1000 messages accepted
- ✅ All 1000 messages saved exactly once
- ✅ No database deadlocks
- ✅ P95 latency < 1.5s

### Acceptance Criteria
- [ ] 1000 concurrent messages tested
- [ ] 100% success rate
- [ ] 0 message loss
- [ ] 0 duplicates
- [ ] Database performance acceptable

---

## TEST 4: Out-of-Order Message Delivery

### Purpose
Verify message ordering maintained even when webhooks arrive out of order.

### Scenario
1. Send messages: A (timestamp 1000), B (timestamp 2000), C (timestamp 3000)
2. Deliver webhooks out of order: C, A, B
3. Verify messages displayed in correct order: A, B, C

### Implementation

```typescript
// Test script: tests/message-ordering-test.ts

async function testMessageOrdering() {
  console.log('🧪 Test 4: Out-of-Order Message Delivery');
  
  const messages = [
    { id: 'msg_A', timestamp: 1000, text: 'Message A (first)' },
    { id: 'msg_B', timestamp: 2000, text: 'Message B (second)' },
    { id: 'msg_C', timestamp: 3000, text: 'Message C (third)' }
  ];

  // Deliver in wrong order: C, A, B
  const deliveryOrder = [messages[2], messages[0], messages[1]];
  
  console.log('Delivering messages out of order: C → A → B');
  
  for (const msg of deliveryOrder) {
    await fetch('https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/whatsapp-webhook', {
      method: 'POST',
      body: JSON.stringify({
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: msg.id,
                timestamp: msg.timestamp,
                text: { body: msg.text }
              }]
            }
          }]
        }]
      })
    });
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Fetch from database
  const { data } = await supabase
    .from('messages')
    .select('external_message_id, content, created_at')
    .in('external_message_id', ['msg_A', 'msg_B', 'msg_C'])
    .order('created_at', { ascending: true });

  console.log('📊 Messages in database (ordered by created_at):');
  data?.forEach((msg, i) => {
    console.log(`  ${i + 1}. ${msg.external_message_id}: ${msg.content}`);
  });

  // Verify order
  const ids = data?.map(m => m.external_message_id) || [];
  const expectedOrder = ['msg_A', 'msg_B', 'msg_C'];
  
  const orderCorrect = JSON.stringify(ids) === JSON.stringify(expectedOrder);
  
  if (orderCorrect) {
    console.log('✅ TEST PASSED: Messages ordered correctly (A, B, C)');
    return true;
  } else {
    console.log(`❌ TEST FAILED: Incorrect order (got: ${ids.join(', ')})`);
    return false;
  }
}
```

### Expected Result
- ✅ Messages ordered by timestamp (A, B, C)
- ✅ Display order matches send order
- ✅ UI shows messages in correct sequence

### Acceptance Criteria
- [ ] 100 messages tested with random delivery order
- [ ] 100% correct ordering in database
- [ ] 100% correct ordering in UI

---

## TEST 5: Duplicate Webhook Detection

### Purpose
Verify system doesn't create duplicate messages when provider sends duplicate webhooks.

### Scenario
1. WhatsApp sends webhook for message X
2. Message X saved to database
3. WhatsApp sends same webhook again (duplicate)
4. Verify only 1 message X exists in database

### Implementation

```typescript
// Test script: tests/duplicate-detection-test.ts

async function testDuplicateDetection() {
  console.log('🧪 Test 5: Duplicate Webhook Detection');
  
  const messageId = `test_duplicate_${Date.now()}`;
  const payload = {
    entry: [{
      changes: [{
        value: {
          messages: [{
            id: messageId,
            from: '1234567890',
            timestamp: Date.now(),
            text: { body: 'Duplicate test message' },
            type: 'text'
          }]
        }
      }]
    }]
  };

  console.log('Sending webhook 5 times with same message ID...');
  
  // Send same webhook 5 times
  for (let i = 1; i <= 5; i++) {
    await fetch('https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/whatsapp-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log(`Attempt ${i} sent`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check database
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('external_message_id', messageId);

  const count = data?.length || 0;
  console.log(`📊 Messages in database: ${count}`);
  
  if (count === 1) {
    console.log('✅ TEST PASSED: Duplicate detection working (1 message)');
    return true;
  } else {
    console.log(`❌ TEST FAILED: Duplicates created (${count} messages)`);
    return false;
  }
}
```

### Expected Result
- ✅ Only 1 message saved (despite 5 webhook deliveries)
- ✅ Unique constraint or upsert logic working
- ✅ No database errors

### Acceptance Criteria
- [ ] 100 duplicate webhooks tested
- [ ] 0 duplicate messages created
- [ ] Database constraints preventing duplicates

---

## TEST 6: Partial Failure Recovery

### Purpose
Verify system handles scenarios where some messages succeed and some fail.

### Scenario
1. Send batch of 100 messages
2. Simulate 20% failure rate (20 messages fail)
3. Verify 80 messages saved successfully
4. Verify failed messages queued for retry
5. Verify all 100 eventually saved

### Implementation

```typescript
// Test script: tests/partial-failure-test.ts

async function testPartialFailures() {
  console.log('🧪 Test 6: Partial Failure Recovery');
  
  const totalMessages = 100;
  const messages = Array.from({ length: totalMessages }, (_, i) => ({
    id: `test_partial_${Date.now()}_${i}`,
    to: i % 5 === 0 ? 'INVALID_NUMBER' : '1234567890', // 20% invalid
    content: `Test message ${i}`
  }));

  console.log(`Sending ${totalMessages} messages (20% will fail)...`);
  
  const results = await Promise.allSettled(
    messages.map(msg =>
      supabase.functions.invoke('whatsapp-send', {
        body: {
          to: msg.to,
          message: msg.content,
          conversation_id: 'TEST_CONVERSATION_ID'
        }
      })
    )
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`✅ Succeeded: ${succeeded}`);
  console.log(`❌ Failed: ${failed}`);
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check database
  const { data } = await supabase
    .from('messages')
    .select('id, status')
    .eq('conversation_id', 'TEST_CONVERSATION_ID')
    .gte('created_at', new Date(Date.now() - 60000).toISOString());

  const savedCount = data?.filter(m => m.status === 'sent').length || 0;
  const failedCount = data?.filter(m => m.status === 'failed').length || 0;
  
  console.log(`📊 Database: ${savedCount} sent, ${failedCount} failed`);
  
  if (savedCount >= 80 && savedCount <= 100) {
    console.log('✅ TEST PASSED: Partial failures handled correctly');
    return true;
  } else {
    console.log(`❌ TEST FAILED: Unexpected counts`);
    return false;
  }
}
```

### Expected Result
- ✅ 80 messages sent successfully
- ✅ 20 messages marked as failed
- ✅ Failed messages visible to user
- ✅ Retry mechanism in place

### Acceptance Criteria
- [ ] Partial failure scenario tested
- [ ] Success count matches expectations
- [ ] Failed messages properly tracked
- [ ] No silent failures

---

## TEST 7: Message Loss Detection

### Purpose
Continuously monitor for any gaps in message sequences that indicate loss.

### Implementation

```sql
-- Run this query daily to detect gaps
WITH message_sequences AS (
  SELECT 
    conversation_id,
    external_message_id,
    created_at,
    LAG(created_at) OVER (PARTITION BY conversation_id ORDER BY created_at) as prev_time,
    created_at - LAG(created_at) OVER (PARTITION BY conversation_id ORDER BY created_at) as time_gap
  FROM messages
  WHERE created_at > NOW() - INTERVAL '24 hours'
    AND channel IN ('whatsapp', 'sms', 'email')
)
SELECT 
  conversation_id,
  COUNT(*) FILTER (WHERE time_gap > INTERVAL '30 minutes') as suspicious_gaps,
  MAX(time_gap) as largest_gap
FROM message_sequences
GROUP BY conversation_id
HAVING COUNT(*) FILTER (WHERE time_gap > INTERVAL '30 minutes') > 0
ORDER BY suspicious_gaps DESC;
```

### Expected Result
- ✅ 0 suspicious gaps detected
- ✅ All messages accounted for
- ✅ No silent message loss

### Acceptance Criteria
- [ ] Query runs daily
- [ ] Gaps reported via critical alert
- [ ] Manual investigation for any gaps >30 min

---

## TEST EXECUTION PLAN

### Phase 1: Automated Tests (2 hours)
1. Set up test environment
2. Run Tests 1, 3, 5
3. Document results

### Phase 2: Manual Tests (1 hour)
1. Run Test 2 (database failure)
2. Run Test 4 (ordering)
3. Run Test 6 (partial failures)

### Phase 3: Monitoring (Ongoing)
1. Deploy Test 7 as daily check
2. Monitor for 7 days pre-launch
3. Address any gaps found

---

## PASS/FAIL CRITERIA

### Must Pass All Tests:
- ✅ 0 messages lost in any scenario
- ✅ 0 duplicate messages created
- ✅ Correct ordering maintained
- ✅ Graceful failure handling
- ✅ Retry mechanisms working
- ✅ User-facing error messages clear

### If ANY Test Fails:
🚨 **DO NOT LAUNCH** until root cause fixed and retested.

---

## NEXT STEPS

1. **Set up test environment:**
   - Create test Supabase project OR use staging
   - Create test WhatsApp number
   - Create test conversation/customer records

2. **Run automated tests:**
   ```bash
   npm run test:chaos
   ```

3. **Document results:**
   - Create test report with pass/fail for each test
   - Record any issues found
   - Create fixes for failures

4. **Retest after fixes:**
   - Run full suite again
   - Verify 100% pass rate

---

**Status:** Test suite defined, awaiting execution  
**Owner:** QA + SRE Team  
**Priority:** P1 - Blocking Launch
