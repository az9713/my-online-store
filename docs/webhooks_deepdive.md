# Webhooks — A Deep Dive

This document explains webhooks from the ground up, using our merch storefront as the running example throughout. By the end you should understand what webhooks are, why they exist, how they work mechanically, how to build a webhook receiver, and what can go wrong.

---

## Part 1: The Problem Webhooks Solve

### The naive approach: polling

Imagine you run our merch store. A customer orders a hoodie. Printify handles the printing and shipping. At some point, Printify ships the hoodie — and you want to know when that happens so you can update the order status on your site.

Without webhooks, your app would have to **ask** Printify constantly:

```
Every 30 seconds:
  Your app → Printify: "Has order #123 shipped yet?"
  Printify → Your app: "No."

  Your app → Printify: "Has order #123 shipped yet?"
  Printify → Your app: "No."

  Your app → Printify: "Has order #123 shipped yet?"
  Printify → Your app: "No."

  ... 200 more times ...

  Your app → Printify: "Has order #123 shipped yet?"
  Printify → Your app: "Yes, it shipped 3 seconds ago."
```

This is called **polling**. It works, but it's wasteful:
- **Most requests return nothing new.** You asked 200 times and only the last one mattered.
- **It wastes Printify's resources.** Multiply this by thousands of stores and millions of orders, and Printify is drowning in "anything new?" requests.
- **There's a delay.** If you poll every 30 seconds, you might learn about the shipment up to 30 seconds late. Poll less often, and the delay grows.
- **It scales badly.** 10 pending orders = 10 polling loops. 1,000 orders = 1,000 loops.

### The webhook approach: "don't call us, we'll call you"

With webhooks, the flow reverses:

```
Printify ships order #123.
Printify → Your app: "Hey, order #123 just shipped. Here are the details."
Your app: "Got it. Updated."
```

That's it. One message, exactly when it matters. No wasted requests. No delay. No polling loops.

**A webhook is a message that an external service sends to your app when something happens.**

The word "webhook" comes from "web" + "hook" — it's a hook into someone else's system. You're saying: "When this event happens on your end, call this URL on my end."

---

## Part 2: How Webhooks Work Mechanically

### The setup

Before any webhooks can flow, you do a one-time configuration:

1. **You build a webhook receiver** — a URL on your server that accepts incoming messages. In our app, this is `POST /api/webhooks/printify`.

2. **You register that URL with the external service.** In Printify's dashboard (or via their API), you say: "Send webhook events to `https://my-store.vercel.app/api/webhooks/printify`."

3. **You choose which events to subscribe to.** Printify might offer dozens of event types. You pick the ones you care about — maybe `order.shipped`, `order.created`, `product.updated`.

4. **Printify gives you a shared secret.** A random string like `whsec_abc123xyz`. This is used to verify that incoming webhooks are genuinely from Printify (more on this later).

### The flow — step by step

Here's what happens when Printify ships an order, in complete mechanical detail:

#### Step 1: Something happens on Printify's end

A warehouse worker marks order #123 as shipped in Printify's system. Printify's internal code detects this state change and says: "This store is subscribed to `order.shipped` events. Time to send a webhook."

#### Step 2: Printify builds the payload

Printify constructs a JSON object with all the relevant information:

```json
{
  "event": "order.shipped",
  "timestamp": "2026-03-22T14:30:00Z",
  "data": {
    "order_id": "pfy_order_123",
    "external_id": "your_order_456",
    "status": "shipped",
    "tracking": {
      "carrier": "USPS",
      "number": "9400111899223456789012",
      "url": "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223456789012"
    },
    "shipped_at": "2026-03-22T14:28:00Z"
  }
}
```

This JSON is called the **payload** — the actual data being delivered.

#### Step 3: Printify signs the payload

Before sending, Printify creates a **signature** using the shared secret. This is the HMAC-SHA256 process:

```
Input:  the raw JSON payload (as a string) + the shared secret
Process: HMAC-SHA256 cryptographic hash function
Output: a signature string like "sha256=a1b2c3d4e5f6..."
```

Think of it like a wax seal on a letter. Only someone with the secret key can create the correct seal. If anyone tampers with the letter (payload), the seal won't match.

Printify puts this signature in an HTTP header:

```
X-Printify-Signature: sha256=a1b2c3d4e5f6...
```

#### Step 4: Printify sends the HTTP request

Printify's server makes an HTTP POST request to your registered URL:

```http
POST /api/webhooks/printify HTTP/1.1
Host: my-store.vercel.app
Content-Type: application/json
X-Printify-Signature: sha256=a1b2c3d4e5f6...
X-Printify-Event: order.shipped
X-Printify-Delivery-Id: del_789

{
  "event": "order.shipped",
  "timestamp": "2026-03-22T14:30:00Z",
  "data": {
    "order_id": "pfy_order_123",
    ...
  }
}
```

This looks exactly like what happens when you submit a form on a website — it's a standard HTTP request. The only difference is that a computer sends it automatically, not a human clicking a button.

#### Step 5: Your app receives the request

Your webhook handler at `/api/webhooks/printify` receives this request. Here's what it does, in order:

**5a. Read the raw body**

```typescript
const rawBody = await request.text()
```

You need the exact raw string that was sent, byte for byte, because the signature was computed over this exact string. If you parse it to JSON first and re-stringify it, the formatting might change and the signature won't match.

**5b. Verify the signature**

```typescript
const signature = request.headers.get('X-Printify-Signature')
const secret = process.env.PRINTIFY_WEBHOOK_SECRET  // "whsec_abc123xyz"

// Recreate the signature using the same algorithm Printify used
const expectedSignature = createHmac('sha256', secret)
  .update(rawBody)
  .digest('hex')

// Compare
if (signature !== `sha256=${expectedSignature}`) {
  // REJECT — this webhook is fake or tampered with
  return new Response('Invalid signature', { status: 401 })
}
```

This is the critical security step. Without it, anyone on the internet could send fake webhooks to your URL — "Hey, order #123 shipped!" — and your app would believe them.

**5c. Parse the payload**

```typescript
const payload = JSON.parse(rawBody)
// payload.event = "order.shipped"
// payload.data.order_id = "pfy_order_123"
```

Now you have structured data to work with.

**5d. Route the event**

Different events need different handling:

```typescript
switch (payload.event) {
  case 'order.shipped':
    await handleOrderShipped(payload.data)
    break
  case 'order.created':
    await handleOrderCreated(payload.data)
    break
  case 'product.updated':
    await handleProductUpdated(payload.data)
    break
  default:
    // Unknown event type — log it but don't crash
    console.log(`Unhandled event type: ${payload.event}`)
}
```

This is the **event routing** mentioned in the spec. Each event type triggers different business logic.

**5e. Process the event**

For `order.shipped`, the handler might:

```typescript
async function handleOrderShipped(data) {
  // 1. Find the order in our database
  const order = await db.order.findUnique({
    where: { externalOrderId: data.order_id }
  })

  // 2. Update its status
  await db.order.update({
    where: { id: order.id },
    data: {
      status: 'shipped',
      externalStatus: data.status,
      syncedAt: new Date()
    }
  })

  // 3. Log the webhook event
  await db.webhookEvent.create({
    data: {
      provider: 'printify',
      eventType: 'order.shipped',
      eventId: data.order_id,
      signatureValid: true,
      payloadJson: JSON.stringify(data),
      processingStatus: 'processed',
      processedAt: new Date(),
      relatedOrderId: order.id
    }
  })
}
```

**5f. Respond with 200 OK**

```typescript
return new Response('OK', { status: 200 })
```

You must respond quickly (typically within 5–30 seconds). This tells Printify: "I received your message and processed it." If you don't respond, or respond with an error code, Printify will assume delivery failed and retry (more on this below).

#### Step 6: Printify logs the delivery

Printify records that the webhook was delivered successfully (HTTP 200). It won't send it again unless you explicitly request a replay.

---

## Part 3: Why Webhooks Need Security

### The problem: your URL is public

Your webhook endpoint (`https://my-store.vercel.app/api/webhooks/printify`) is a public URL. Anyone who knows it (or guesses it) can send HTTP POST requests to it.

Without signature verification, an attacker could:

```http
POST /api/webhooks/printify
Content-Type: application/json

{
  "event": "order.shipped",
  "data": {
    "order_id": "pfy_order_999",
    "status": "shipped"
  }
}
```

Your app would happily process this fake webhook, mark an order as shipped when it wasn't, or worse — if you had auto-refund logic, trigger a refund for a fake shipment.

### The solution: HMAC-SHA256 signature verification

The signature verification process (Step 5b above) prevents this because:

1. The attacker doesn't know the shared secret (`whsec_abc123xyz`).
2. Without the secret, they can't produce a valid signature.
3. Your app rejects any request with an invalid or missing signature.

The only entities that can create a valid signature are:
- **Printify** (they generated the secret and know it)
- **Your app** (you stored the secret in your environment variables)

Nobody else.

### What HMAC-SHA256 actually does

HMAC stands for **Hash-based Message Authentication Code**. SHA-256 is the specific hash algorithm used.

In simple terms:
- A **hash function** takes any input and produces a fixed-size output (a "digest"). The same input always produces the same output, but you can't reverse it — you can't figure out the input from the output.
- **HMAC** adds a secret key to the hash process. So the output depends on both the message *and* the key. Without the key, you can't reproduce the output.

Think of it like this:
- **Hash without key:** Everyone who has the same letter gets the same wax seal. Useless for verification.
- **HMAC with key:** Only people with the secret stamp can create the correct wax seal.

### Timing attacks: a subtle vulnerability

There's one more security detail. When comparing signatures, you can't use normal string comparison (`===`). Why?

Normal comparison checks character by character and stops at the first mismatch:
```
"abcdef" vs "axcdef"
  a = a ✓
  b ≠ x ✗ → STOP, return false
```

An attacker can measure how long the comparison takes. If it takes slightly longer, it means more characters matched — revealing the correct signature one character at a time. This is called a **timing attack**.

The fix is **constant-time comparison** — a comparison that always takes the same amount of time regardless of where the mismatch is:

```typescript
import { timingSafeEqual } from 'crypto'

const isValid = timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(expectedSignature)
)
```

This is why the spec emphasizes HMAC-SHA256 specifically — it's not just "check a password." It's a cryptographic verification process with specific security requirements.

---

## Part 4: What Goes Wrong — Failure Modes

Webhooks sound simple, but the real world is messy. Here's what can go wrong and how to handle it.

### Problem 1: Your app is down

Printify ships an order and sends a webhook. Your Vercel function is temporarily unavailable (deployment in progress, cold start timeout, etc.). Printify gets no response.

**What happens:** Printify retries. Most webhook providers retry with **exponential backoff**:
- 1st retry: 1 minute later
- 2nd retry: 5 minutes later
- 3rd retry: 30 minutes later
- 4th retry: 2 hours later
- After several failures: give up and mark the delivery as failed

**What you should do:**
- Log every incoming webhook to the `webhook_events` table (this is why the spec has that table).
- Build a manual sync endpoint (`POST /api/sync/printify`) so you can re-fetch order state if a webhook was permanently lost.
- Monitor for failed deliveries in Printify's dashboard.

### Problem 2: Duplicate delivery

Network issues can cause the same webhook to arrive twice. Printify isn't sure if you received it (maybe your app responded but the response was lost in transit), so it retries.

If your handler naively processes every webhook, you might:
- Create duplicate order records
- Send duplicate "your order shipped!" emails
- Double-count analytics events

**What you should do:** Make your handler **idempotent**. Check if you've already processed this event:

```typescript
// Check if we've already processed this exact event
const existing = await db.webhookEvent.findFirst({
  where: {
    provider: 'printify',
    eventType: payload.event,
    eventId: payload.data.order_id
  }
})

if (existing) {
  // Already processed — acknowledge but skip
  return new Response('Already processed', { status: 200 })
}

// First time seeing this — process it
await processEvent(payload)
```

The `webhook_events` table in the spec serves double duty: it's both an audit log and a deduplication mechanism.

### Problem 3: Processing takes too long

Your handler needs to do a lot of work — update the database, trigger emails, sync with other services. But the webhook sender is waiting for your response. If you take too long (typically 5–30 seconds), they'll time out and retry.

Now you have a **double problem**: you're still processing the first attempt when the retry arrives.

**What you should do:** Respond immediately, process later:

```typescript
export async function POST(request) {
  // 1. Verify signature (fast)
  // 2. Parse payload (fast)
  // 3. Save raw event to database (fast)
  await db.webhookEvent.create({
    data: {
      provider: 'printify',
      eventType: payload.event,
      payloadJson: rawBody,
      processingStatus: 'pending',   // Not processed yet
      receivedAt: new Date()
    }
  })

  // 4. Respond immediately
  // Printify is happy — delivery confirmed
  return new Response('Accepted', { status: 202 })

  // 5. Process the event asynchronously (background job, queue, etc.)
  // This happens after the response is sent
}
```

This pattern is called **accept-then-process**. You acknowledge receipt immediately and do the heavy work in the background. The `processingStatus` field tracks whether the event has been fully processed.

For a small storefront on Vercel, this might be overkill — processing an order update is fast enough to do synchronously. But it's important to understand the pattern for when traffic grows.

### Problem 4: Payload format changes

Printify updates their API and adds new fields, renames existing ones, or changes the structure. Your handler expects the old format and breaks.

**What you should do:**
- Parse payloads defensively. Don't crash if a field is missing — log a warning and skip.
- Store the raw payload JSON in the `webhook_events` table so you can reprocess events after fixing your code.
- Pin to an API version if the provider supports it.

```typescript
// Defensive parsing
const trackingNumber = payload.data?.tracking?.number
if (!trackingNumber) {
  console.warn(`order.shipped event missing tracking number: ${payload.data.order_id}`)
  // Still save the event, but flag it for review
}
```

### Problem 5: Out-of-order delivery

Printify sends `order.created`, then `order.shipped` seconds later. Due to network timing, `order.shipped` arrives first. Your handler tries to update an order that doesn't exist yet.

**What you should do:**
- Check if prerequisite data exists. If not, either:
  - Queue the event for later processing, or
  - Fetch the missing data from Printify's API directly, or
  - Create the order on the spot (since the shipped event contains enough info)

This is more of an edge case for our small storefront, but it's a real problem at scale.

### Problem 6: Webhook URL leaks

Someone discovers your webhook URL and starts sending junk requests — not malicious fakes with forged signatures, just garbage data that wastes your server resources.

**What you should do:**
- Signature verification already handles this — invalid signatures are rejected before any processing happens.
- Optionally rate-limit the endpoint (e.g., max 100 requests per minute from any single IP).
- Optionally restrict to known IP ranges if the provider publishes them.

---

## Part 5: How This Maps to Our Storefront

### The webhook_events table — your audit log

Every webhook that arrives gets logged, regardless of whether processing succeeds:

```typescript
WebhookEvent {
  id                // Unique ID for this log entry
  provider          // "printify" — who sent it
  eventType         // "order.shipped" — what happened
  eventId           // Printify's ID for this event (for deduplication)
  signatureValid    // Did the HMAC check pass?
  payloadJson       // The raw JSON, stored verbatim
  processingStatus  // "pending" | "processed" | "failed"
  errorMessage      // If processing failed, why?
  receivedAt        // When we received it
  processedAt       // When we finished processing it
  relatedOrderId    // Links to our Order table
}
```

This table lets you:
- **Debug problems** — "Why is order #456 stuck? Let me check the webhook log."
- **Detect duplicates** — "We already processed this eventId, skip it."
- **Reprocess failures** — "3 events failed last night. Let me fix the bug and reprocess them from the stored payloads."
- **Audit security** — "Were there any invalid signature attempts? How many?"

### The sync endpoint — your safety net

The spec includes `POST /api/sync/printify` as a separate endpoint. This is your manual fallback:

- Webhook failed? Hit the sync endpoint to pull current state from Printify's API.
- Missed events during downtime? Sync endpoint catches up.
- Don't trust webhook data? Sync endpoint fetches the authoritative state.

Think of webhooks as **real-time push notifications** and the sync endpoint as **manual refresh**. You want both.

### The event router — your switchboard

The event router is just a `switch` statement or a map of handler functions:

```typescript
const handlers = {
  'order.created':    handleOrderCreated,
  'order.updated':    handleOrderUpdated,
  'order.shipped':    handleOrderShipped,
  'product.published': handleProductPublished,
  'product.updated':  handleProductUpdated,
}

const handler = handlers[payload.event]
if (handler) {
  await handler(payload.data)
} else {
  console.log(`No handler for event: ${payload.event}`)
}
```

Each handler is a focused function that knows how to process one type of event. This keeps the code organized — when you need to fix order shipping logic, you go to `handleOrderShipped`, not a 500-line if/else chain.

### The 49 unit tests — what they're testing

The spec says there are 49 unit tests for the webhook system. These likely cover:

**Signature verification:**
- Valid signature → accepted
- Invalid signature → rejected (401)
- Missing signature header → rejected
- Empty body → rejected
- Tampered body (valid sig for different body) → rejected

**Event routing:**
- Known event type → correct handler called
- Unknown event type → logged, not crashed
- Missing event type field → handled gracefully

**Individual handlers:**
- `order.shipped` with valid data → order status updated
- `order.shipped` for unknown order → handled (maybe created, maybe logged)
- `order.shipped` with missing tracking → warning logged, partial update
- Duplicate `order.shipped` → idempotent (no double processing)

**Payload parsing:**
- Well-formed JSON → parsed correctly
- Malformed JSON → rejected (400)
- Missing required fields → graceful error
- Extra unexpected fields → ignored (no crash)

**Sync endpoint:**
- Successful sync → data updated
- Printify API down → error logged, meaningful response
- Partial sync (some orders fail) → successes saved, failures reported

This is why the spec emphasizes the test count — the webhook system has many edge cases, and each one is a potential bug in production.

---

## Part 6: Webhooks vs. Other Integration Patterns

### Webhooks vs. Polling

| Aspect | Webhooks | Polling |
|--------|----------|---------|
| Trigger | Event-driven (push) | Time-driven (pull) |
| Latency | Near-instant | Depends on poll interval |
| Wasted requests | None | Most return nothing new |
| Complexity | Must build a receiver, handle security, retries, dedup | Simple loop, but must manage intervals |
| Reliability | Depends on delivery + retries | Depends on poll frequency |

**When to use webhooks:** When you need to react to events quickly and the external service supports them.

**When to use polling:** When the external service doesn't support webhooks, or when you need to reconcile/verify state periodically (like our sync endpoint).

**Best practice:** Use both. Webhooks for real-time updates, polling/sync for periodic reconciliation and catching missed events.

### Webhooks vs. WebSockets

**WebSockets** are persistent two-way connections between client and server. They stay open and either side can send messages at any time.

| Aspect | Webhooks | WebSockets |
|--------|----------|------------|
| Direction | One-way (server to server) | Two-way (bidirectional) |
| Connection | New HTTP request per event | Persistent open connection |
| Use case | Server-to-server notifications | Real-time client-server communication |
| Example | Printify notifying your app | Live chat, real-time dashboards |

Our storefront uses webhooks for Printify → our server communication. If we ever needed real-time updates in the shopper's browser (like "your order just shipped!" appearing live), we'd use WebSockets on the frontend side.

### Webhooks vs. Message Queues

**Message queues** (like RabbitMQ, AWS SQS, Kafka) are internal infrastructure for passing messages between parts of your own system.

| Aspect | Webhooks | Message Queues |
|--------|----------|---------------|
| Scope | Between different companies/services | Within your own infrastructure |
| Protocol | HTTP | Custom (AMQP, etc.) |
| Retry logic | Handled by sender | Handled by queue |
| Ordering | Not guaranteed | Can be guaranteed |

For our small storefront, message queues are overkill. But in a larger system, you might receive a webhook and immediately put it on an internal queue for processing — combining both patterns.

---

## Part 7: Webhook Checklist for Our App

When we build EP-016, here's everything we need:

### Infrastructure
- [ ] `POST /api/webhooks/printify` route exists and is publicly accessible
- [ ] `PRINTIFY_WEBHOOK_SECRET` environment variable is set
- [ ] Webhook URL is registered in Printify's dashboard

### Security
- [ ] Raw body is preserved before JSON parsing (for signature verification)
- [ ] HMAC-SHA256 signature is verified on every request
- [ ] Constant-time comparison is used for signature matching
- [ ] Invalid signatures return 401, not 200
- [ ] Missing signature header returns 401

### Reliability
- [ ] Events are logged to `webhook_events` table before processing
- [ ] Duplicate events are detected and skipped (idempotency)
- [ ] Processing failures are caught, logged, and don't crash the handler
- [ ] Handler responds within Printify's timeout window
- [ ] Failed events are marked with `processingStatus: 'failed'` and `errorMessage`

### Event handling
- [ ] Event router dispatches to type-specific handlers
- [ ] Unknown event types are logged, not crashed on
- [ ] Each handler validates its expected payload fields
- [ ] Missing optional fields degrade gracefully

### Observability
- [ ] All events are stored with full payload in `webhook_events`
- [ ] Signature validation failures are logged (potential security issue)
- [ ] Processing time is measurable from `receivedAt` vs `processedAt`

### Recovery
- [ ] `POST /api/sync/printify` endpoint exists for manual reconciliation
- [ ] Failed events can be reprocessed from stored payloads
- [ ] Sync endpoint can fetch current state from Printify's API

---

## Part 8: Glossary of Webhook-Specific Terms

**Payload** — The JSON data inside a webhook request. Contains the actual information about what happened (order ID, status, tracking number, etc.).

**Signature** — A cryptographic string that proves the webhook is genuine. Created by the sender using a shared secret and the HMAC-SHA256 algorithm.

**Shared secret / webhook secret** — A random string known only to you and the webhook sender. Used to create and verify signatures. Stored as an environment variable (`PRINTIFY_WEBHOOK_SECRET`), never in code.

**Event type** — A label describing what happened. Like `order.shipped`, `product.updated`, `order.created`. Each type triggers different processing logic.

**Event routing** — The code pattern of looking at the event type and calling the appropriate handler function. A switchboard for webhook events.

**Delivery** — A single attempt to send a webhook to your URL. One event may have multiple delivery attempts if retries occur.

**Retry / exponential backoff** — When delivery fails, the sender waits and tries again, with increasing delays between attempts (1 min, 5 min, 30 min, etc.). This prevents hammering a server that's already struggling.

**Idempotency** — Processing the same event multiple times produces the same result as processing it once. Essential because retries can cause duplicate deliveries.

**Deduplication** — Detecting and skipping events that have already been processed. Usually done by checking a unique event ID against your `webhook_events` table.

**Accept-then-process** — Responding to the webhook immediately (HTTP 202 Accepted) and processing the event asynchronously afterward. Prevents timeout issues for slow processing.

**Reconciliation / sync** — Periodically fetching the current state from the external service's API to catch any events that were missed, lost, or processed incorrectly. The safety net behind webhooks.

**Timing attack** — A security vulnerability where an attacker can deduce secret information by measuring how long operations take. Prevented by using constant-time comparison for signatures.

**Cold start** — On serverless platforms like Vercel, a function that hasn't been called recently needs to "wake up" before processing a request. This adds a delay (typically 100ms–2s) to the first request. If the cold start takes too long, the webhook sender might time out.

**Dead letter queue (DLQ)** — A place where failed webhook events go after all retries are exhausted. Not all providers support this, but it's a concept — "these events couldn't be delivered, here they are for manual review."

**Webhook replay** — Re-sending a previously delivered webhook. Some providers offer a "replay" button in their dashboard for debugging. Your app should handle replays the same as retries — check for duplicates and process idempotently.
