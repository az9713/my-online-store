# EP-018 Test Report — Stripe Checkout Integration

**Date:** March 2026
**Test file:** `tests/e2e/ep018-stripe-checkout.spec.ts`
**Runner:** Playwright (Chromium)
**Result:** 8/8 passed in 24.4s (all passed on first run)

---

## What was built

- **Stripe client** (`src/lib/stripe/client.ts`) — singleton Stripe SDK instance
- **Checkout session creator** (`src/lib/stripe/checkout.ts`) — converts cart items to Stripe line items, creates Checkout Session with shipping address collection
- **Checkout API** (`/api/checkout`) — creates Stripe Checkout Session from server-side cart, redirects user
- **Stripe webhook handler** (`/api/webhooks/stripe`) — signature verification, handles `checkout.session.completed`, `payment_intent.payment_failed`, `charge.refunded`
- **Order creation** — on successful payment, creates Order record, clears cart, links to user
- **Order success page** (`/order/success`) — "Order Confirmed!" with links to orders and home
- **Cart checkout button** — now calls `/api/checkout` and redirects to Stripe's hosted page

---

## What was tested

### Tests 1–2: Checkout API
- Returns 503 when `STRIPE_SECRET_KEY` not configured (clear error, not a crash)
- Returns 400+ for empty cart

### Tests 3–4: Stripe webhook
- Rejects requests without `stripe-signature` header
- Rejects requests with invalid signature

### Tests 5–6: Order success page
- Renders "Order Confirmed!" heading, thank-you message, "View Orders" and "Continue Shopping" links
- "Continue Shopping" navigates to home page

### Tests 7–8: Cart checkout UX
- Checkout button appears on cart page with items
- Clicking Checkout when Stripe isn't configured shows an error message (not a crash)

---

## What was NOT tested and why

### 1. Actual Stripe Checkout flow
Creating a real Stripe Checkout Session requires a valid `STRIPE_SECRET_KEY`. The checkout API returns 503 in the test environment. Full flow testing (redirect to Stripe → pay with test card → webhook → order created) requires Stripe test credentials configured.

**To test with Stripe:** Set `STRIPE_SECRET_KEY=sk_test_...` in `.env.local`, then:
1. Add item to cart
2. Click Checkout → redirected to Stripe's test page
3. Use card `4242 4242 4242 4242`, any future expiry, any CVC
4. Complete payment → redirected to order success page

### 2. Webhook order creation
The `handleCheckoutComplete` function creates an Order record and clears the cart. Testing this requires a valid Stripe webhook signature, which requires the `STRIPE_WEBHOOK_SECRET`. Can be tested locally using `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

### 3. Refund handling
The `charge.refunded` handler logs the refund but doesn't update the order status (would need to link payment_intent_id to orders). Deferred to a future refinement.

### 4. Printify order submission after payment
The plan calls for submitting orders to Printify after Stripe confirms payment. This requires `PRINTIFY_API_TOKEN` and the Printify order creation API. The placeholder is ready — `handleCheckoutComplete` creates the Order record, and a future step would call Printify's API to submit for fulfillment.

---

## What you need to go live with Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your test keys from Stripe Dashboard → Developers → API keys
3. Add to `.env.local`:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (from `stripe listen` or Stripe Dashboard)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`
4. Test the full flow with the test card `4242 4242 4242 4242`
5. When ready for production, switch to live keys

---

## Issues discovered during testing

None. All 8 tests passed on the first run. The Stripe integration gracefully handles the missing API key case (503 with clear message) rather than crashing.
