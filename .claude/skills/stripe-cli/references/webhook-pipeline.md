# Webhook Pipeline Testing Reference

## The full pipeline

```
stripe trigger checkout.session.completed
    ↓
Stripe API creates test fixtures (product, price, checkout session, payment)
    ↓
stripe listen receives events and POSTs each to localhost:3000/api/webhooks/stripe
    ↓
Webhook handler verifies HMAC-SHA256 signature
    ↓
Handler routes checkout.session.completed → order creation
    ↓
Prisma writes Order row to database
    ↓
Cart marked "converted", cart items deleted
    ↓
HTTP 200 returned → Stripe marks event as delivered
```

---

## Step 1: Start stripe listen (must be running before triggering)

Open a terminal and run:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Output:
```
> Ready! Webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Copy this webhook secret into `.env.local` as `STRIPE_WEBHOOK_SECRET`.**

Keep this terminal open. `stripe listen` must be running for webhooks to reach localhost.

Leave `stripe listen` running in the background. Every event Stripe fires will show up here with `-->` (incoming) and `<-- [200]` (your server's response).

---

## Step 2: Start the dev server (separate terminal)

```bash
npm run dev
# Server running on localhost:3000
```

Both `stripe listen` and `npm run dev` must be running simultaneously.

---

## Step 3: Trigger a test event

From a third terminal (or from Claude Code):
```bash
stripe trigger checkout.session.completed
```

This creates the following test fixtures automatically:

| Fixture | Description |
|---|---|
| `product` | A test product in Stripe |
| `price` | A $30.00 price for the product |
| `checkout_session` | The checkout session object |
| `payment_page` | The payment UI state |
| `payment_method` | The test card (4242 4242 4242 4242) |
| `payment_page_confirm` | The "Pay" button click |

Expected output:
```
Setting up fixture for: product               ✓
Setting up fixture for: price                 ✓
Setting up fixture for: checkout_session      ✓
Setting up fixture for: payment_page          ✓
Setting up fixture for: payment_method        ✓
Setting up fixture for: payment_page_confirm  ✓
Trigger succeeded! Check dashboard for event details.
```

---

## Step 4: Verify in stripe listen output

In the `stripe listen` terminal, you should see:
```
--> product.created          [evt_1TEZzSE...]
--> price.created             [evt_1TEZzTE...]
<-- [200] POST /api/webhooks/stripe [evt_1TEZzSE...]
<-- [200] POST /api/webhooks/stripe [evt_1TEZzTE...]
--> charge.succeeded          [evt_3TEZzUE...]
--> payment_intent.created    [evt_3TEZzUE...]
--> payment_intent.succeeded  [evt_3TEZzUE...]
--> checkout.session.completed [evt_1TEZzWE...]  ← THIS IS THE KEY EVENT
<-- [200] POST /api/webhooks/stripe [evt_3TEZzUE...]
<-- [200] POST /api/webhooks/stripe [evt_3TEZzUE...]
--> charge.updated            [evt_3TEZzUE...]
<-- [200] POST /api/webhooks/stripe [evt_1TEZzWE...]  ← ORDER CREATED
```

Reading the log:
- `-->` = event arriving from Stripe
- `<-- [200]` = your server responded successfully
- `<-- [400]` or `<-- [500]` = your server failed (see troubleshooting.md)

**All events should return `[200]`.** Any other code means something failed.

---

## Event types that fire during checkout.session.completed trigger

| Event | Meaning |
|---|---|
| `product.created` | Stripe created the test product fixture |
| `price.created` | Stripe created the test price fixture |
| `payment_intent.created` | Payment intent object created, tracking the payment |
| `charge.succeeded` | Card was actually charged |
| `payment_intent.succeeded` | Payment intent reached terminal success state |
| `checkout.session.completed` | ← The event your handler cares about |
| `charge.updated` | Charge updated with receipt URL, balance transaction |

The `checkout.session.completed` event contains:
- `data.object.amount_total` — total in cents (3000 = $30.00)
- `data.object.currency` — e.g., "usd"
- `data.object.customer_details.name` — customer name
- `data.object.customer_details.email` — customer email
- `data.object.payment_status` — must be "paid" before creating order
- `data.object.metadata.cartId` — your cart ID (if you set it when creating the session)
- `data.object.metadata.userId` — your user ID (if you set it)

---

## Replaying missed events

If a webhook was fired but your server was down (or returned 5xx), replay it:
```bash
stripe events resend evt_1TEZzWE...
```

Get the event ID from the `stripe listen` output or from the Stripe Dashboard → Events.

This is essential when:
- The dev server crashed mid-test
- `stripe listen` disconnected briefly
- You had a bug, fixed it, and want to retest without re-triggering

---

## Other useful CLI commands

### Query recent payment intents
```bash
stripe payment_intents list --limit 5
```

Shows recent test payments with status (`succeeded`, `requires_payment_method`, etc.)

### Simulate payment failure
```bash
stripe trigger payment_intent.payment_failed
```

### List recent events
```bash
stripe events list --limit 10
```

### Retrieve a specific event
```bash
stripe events retrieve evt_1TEZzWE...
```

---

## Webhook reconciliation fallback (belt and suspenders)

Even with `stripe listen`, webhooks can be missed if the dev server restarts mid-checkout. Implement a reconciliation fallback on the order success page:

```typescript
// src/app/order/success/page.tsx
async function reconcileOrder(sessionId: string) {
  // If order already exists, nothing to do
  const existing = await prisma.order.findFirst({
    where: { stripeSessionId: sessionId },
  });
  if (existing) return existing;

  // Webhook was missed — retrieve session from Stripe directly
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid') return null;

  // Create the order now (same logic as webhook handler)
  const order = await prisma.order.create({ data: { ... } });

  // Clear the cart
  if (session.metadata?.cartId) {
    await prisma.cartItem.deleteMany({ where: { cartId: session.metadata.cartId } });
    await prisma.cart.updateMany({
      where: { id: session.metadata.cartId },
      data: { status: 'converted' },
    });
  }

  return order;
}
```

When Stripe redirects to `/order/success?session_id=cs_test_...`, this function checks whether the webhook already ran. If not, it calls the Stripe API directly to verify payment and create the order. This makes the order creation idempotent — it runs once no matter who gets there first, the webhook or the page load.
