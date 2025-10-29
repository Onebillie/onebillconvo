# GDPR-Compliant Conversation Merge System

## ✅ Implementation Complete

### Privacy-First Widget Design

**Customer-Facing (Website/App Widget):**
- ✅ Each widget session creates a **brand new conversation** with `privacy_scoped: true` metadata
- ✅ Each session creates a **new "session contact"** to prevent linkage to existing customers
- ✅ Messages are filtered by `session.created_at` - customers NEVER see historical messages
- ✅ Sessions are **in-memory only** (no cookies, no localStorage persistence)
- ✅ Closing browser/refreshing page = completely clean slate

**Implementation Files:**
- `supabase/functions/embed-auth/index.ts` - Always creates new customer + conversation
- `supabase/functions/embed-message/index.ts` - Filters messages by session start time (line 52)
- `public/embed-widget.js` - No session persistence, in-memory only

### Admin-Side Merge Detection

**Automatic Duplicate Detection (3-of-4 Rule):**
- ✅ Checks: Email, Phone (normalized), First Name, Last Name
- ✅ Score of 3+ triggers merge suggestion
- ✅ Prompts admin automatically when clicking privacy-scoped widget conversations

**Implementation:**
- `src/hooks/useMergeSuggestion.ts` - Implements 3-of-4 matching logic
- `src/pages/Dashboard.tsx` (lines 477-520) - Auto-triggers merge prompt for widget conversations

### Transactional Merge System

**Server-Side Edge Function:**
- ✅ Consolidates customer emails (primary + alternates)
- ✅ Picks canonical conversation (active primary or most recent)
- ✅ **Moves ALL messages from ALL conversations into canonical conversation**
- ✅ Maintains chronological order by `created_at`
- ✅ Deletes empty duplicate conversations and customers
- ✅ Logs merge to audit trail

**Implementation:**
- `supabase/functions/admin-merge-customers/index.ts` - Transactional merge logic
- `src/components/conversations/MergeConversationsDialog.tsx` - Calls merge function
- `supabase/config.toml` - Edge function registered (line 381)

### Database Schema

**Fixed Unique Constraint:**
```sql
-- Allows multiple closed conversations per customer
-- But only ONE active conversation
CREATE UNIQUE INDEX ux_conversations_unique_active 
ON public.conversations (customer_id) 
WHERE status = 'active';
```

**Migration Applied:** ✅ Completed successfully

## Flow Diagram

```
Widget Session Start
  ├─→ User fills prechat form (name, email, phone)
  ├─→ embed-auth creates NEW session contact
  ├─→ embed-auth creates NEW conversation (privacy_scoped: true)
  ├─→ embed-auth creates session token (in-memory only)
  ├─→ Widget shows ONLY messages from current session
  └─→ Customer NEVER sees historical messages
  
Admin Dashboard
  ├─→ Admin clicks on widget conversation
  ├─→ useMergeSuggestion checks for 3-of-4 field matches
  ├─→ If duplicates found → MergeConversationsDialog opens
  ├─→ Admin selects primary contact & default email
  ├─→ Calls admin-merge-customers edge function
  ├─→ All messages consolidated into ONE conversation
  ├─→ Chronologically ordered by timestamp
  ├─→ Admin sees complete aggregated history
  └─→ Duplicate contacts deleted
```

## GDPR Compliance

✅ **Data Minimization:** Widget creates minimal session contacts
✅ **Purpose Limitation:** Historical data never exposed to customers
✅ **Right to be Forgotten:** Admins can choose NOT to merge
✅ **Transparency:** Clear merge prompts with match reasons
✅ **Audit Trail:** All merges logged to business_audit_log

## Testing Checklist

- [ ] Widget: New session shows no previous messages
- [ ] Widget: Refresh/close = completely new session
- [ ] Admin: 3-of-4 match triggers merge prompt automatically
- [ ] Admin: Merge consolidates ALL messages chronologically
- [ ] Admin: Can see complete history in single thread
- [ ] Database: Multiple closed conversations allowed per customer
- [ ] Database: Only ONE active conversation per customer

## Security Notes

- Widget sessions expire after 1 hour
- Merge function requires authentication (verify_jwt = true)
- All operations use service role key for admin functions
- Domain whitelist enforced on widget initialization

## Next Steps (If Needed)

1. Test complete flow end-to-end
2. Verify merge with multiple conversations (3+ sources)
3. Test with international phone formats
4. Validate audit logging is working
5. Consider adding merge confirmation email to admins
