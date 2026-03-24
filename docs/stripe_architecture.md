# Stripe-Centered Architecture — Making It Work

This document presents a coherent architecture that uses Stripe for payments. It explains which combinations work, which don't, and recommends the path with the least unnecessary complexity.

---

## The core question: if Stripe handles payments, what does Shopify do?

Shopify's main value is **checkout + payments**. If Stripe handles payments, Shopify becomes an expensive product catalog ($39/month) when you could just manage products yourself. The natural Stripe architecture **drops Shopify** or reduces it to an optional sync source.

Here are three coherent Stripe paths, from simplest to most complex.

---

## Path 1: Stripe Checkout (hosted) — Recommended

### The idea

Use **Stripe Checkout** — a hosted payment page that Stripe provides. You don't build any checkout UI. When the user clicks "Checkout," they're redirected to a Stripe-hosted page that handles everything: payment form, tax, shipping address collection, order confirmation.

This is the Stripe equivalent of the Shopify checkout handoff — same concept, different provider.

### How it works

```
1. Shopper browses your store, adds items to cart
2. Shopper clicks "Checkout"
3. Your server creates a Stripe Checkout Session:
   - Line items (products, quantities, prices)
   - Success URL (where to redirect after payment)
   - Cancel URL (where to redirect if they bail)
4. Shopper is redirected to checkout.stripe.com
5. Stripe handles: payment form, address, tax, card processing
6. On success: Stripe redirects to your "thank you" page
7. Stripe sends a webhook: "payment succeeded"
8. Your server creates the order and submits it to Printify for fulfillment
```

### What you build vs. what Stripe handles

```
YOU BUILD:                          STRIPE HANDLES:
─────────────                       ──────────────
Product pages                       Payment form UI
Cart page                           Credit card processing
"Create checkout session" API       Tax calculation (with Stripe Tax)
Webhook receiver for Stripe         Address collection
Order creation after payment        Fraud detection
Printify order submission           Receipts / confirmation emails
                                    PCI compliance
                                    Refunds (via Stripe dashboard)
```

### The full stack

```
PostgreSQL + Prisma + Supabase     — database
Local seed data → Printify sync    — products come from your DB, synced from Printify
Server-side cart                   — cart in database
Stripe Checkout (hosted)           — payments (you redirect to Stripe, they handle the rest)
Supabase Auth or anonymous         — your choice, either works
Printify webhooks                  — fulfillment updates (order shipped, etc.)
Stripe webhooks                    — payment updates (payment succeeded, refund issued, etc.)
```

### Code example: creating a checkout session

```typescript
// When the user clicks "Checkout" on the cart page
// This is the ONLY Stripe code you write on the server side

import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  // 1. Get the cart from the database
  const cart = await getCartFromSession(request)

  // 2. Convert cart items to Stripe line items
  const lineItems = cart.items.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.product.title,
        description: item.variant.title,
        images: [item.variant.imageUrl],
      },
      unit_amount: Math.round(item.unitPrice * 100), // Stripe uses cents
    },
    quantity: item.quantity,
  }))

  // 3. Create the Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB'] },
    success_url: 'https://my-store.com/order/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://my-store.com/cart',
  })

  // 4. Redirect the user to Stripe's hosted checkout page
  return Response.json({ url: session.url })
}
```

That's it. The frontend does:

```typescript
const response = await fetch('/api/checkout', { method: 'POST' })
const { url } = await response.json()
window.location.href = url  // Redirect to Stripe
```

No payment forms. No card inputs. No address fields. No tax logic. Stripe handles all of that on their hosted page.

### After payment: the webhook flow

```
Stripe: "Payment succeeded for session sess_abc123"
    ↓
Your webhook handler at POST /api/webhooks/stripe:
    1. Verify Stripe signature (same HMAC concept as Printify)
    2. Fetch the session details from Stripe
    3. Create an Order in your database
    4. Submit the order to Printify for fulfillment
    5. Clear the cart
    ↓
Printify: receives the order, starts printing
    ↓
Later, Printify: "Order shipped" (webhook to POST /api/webhooks/printify)
    ↓
Your webhook handler:
    1. Update order status to "shipped"
    2. Store tracking info
```

### What this means for the spec's epics

| Epic | Change |
|---|---|
| EP-001–005 | Unchanged — storefront shell, pages, cart |
| EP-006 | Add Stripe client library to API routes |
| EP-007 | Add checkout session creation tests |
| EP-015 | Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to env vars |
| EP-016 | **Two webhook receivers now:** Printify (fulfillment) AND Stripe (payments) |
| EP-017 | E2E tests for checkout flow (up to Stripe redirect) |
| EP-018 | **Redefine:** no longer "Shopify Enablement" — becomes "Stripe Checkout Integration" or Shopify becomes optional product sync |
| EP-019–020 | Unchanged |

### Cost

- **Stripe:** 2.9% + 30¢ per transaction. No monthly fee. You only pay when you make sales.
- **No Shopify fee.** Products live in your database, synced from Printify.

### Pros

- You never build a checkout UI — Stripe's hosted page is production-ready, mobile-optimized, and PCI compliant
- Printify stays as the fulfillment backend (spec-faithful)
- No Shopify dependency or monthly fee
- Stripe is the most developer-friendly payment platform — excellent docs, TypeScript SDK, test mode with fake card numbers
- The webhook pattern you learn for Printify (EP-016) applies directly to Stripe webhooks

### Cons

- User leaves your site during checkout (same as Shopify handoff)
- You handle order-to-Printify submission yourself (Shopify could automate some of this)
- Shipping rate calculation is on you (Stripe can collect addresses but doesn't calculate shipping — you'd use flat rates or Printify's shipping API)

---

## Path 2: Stripe Elements (embedded) — More work, more control

### The idea

Instead of redirecting to Stripe's hosted page, embed Stripe's payment form directly in your site using **Stripe Elements** — pre-built UI components that you style to match your store.

### How it differs from Path 1

```
Path 1 (Checkout):  Your cart → redirect to checkout.stripe.com → redirect back
Path 2 (Elements):  Your cart → your checkout page with embedded Stripe form → stay on your site
```

### What you build additionally (compared to Path 1)

- A checkout page (`/checkout`) with:
  - Shipping address form (you build this)
  - Shipping method selector (you build this)
  - Order summary (you build this)
  - Embedded Stripe payment form (Stripe provides the component, you embed it)
- Shipping rate calculation logic
- Tax calculation (via Stripe Tax or manual)
- Order confirmation page
- Confirmation email sending

### Code example: embedded payment form

```typescript
// Your checkout page — React component
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

function CheckoutForm() {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Stripe handles the payment form — you just call confirmPayment
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: 'https://my-store.com/order/success',
      },
    })

    if (error) {
      // Show error to the user
      setError(error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Your shipping address fields */}
      <input name="address" ... />
      <input name="city" ... />

      {/* Stripe's payment form — embedded in your page */}
      <PaymentElement />

      <button type="submit">Pay Now</button>
    </form>
  )
}
```

### When to choose this over Path 1

- You want the shopper to **stay on your site** throughout checkout
- You want **full control** over the checkout design
- You're willing to build and maintain the checkout page

### My take

This is significantly more work for a marginal UX improvement. For an MVP, Path 1 (hosted Checkout) gets you to market faster. You can upgrade to Elements later without changing anything else — it's the same Stripe backend, just a different frontend.

---

## Path 3: Stripe + Shopify as product catalog — Most complex

### The idea

Keep Shopify for product management (nice admin UI) but use Stripe for payments instead of Shopify's checkout.

### Why this is problematic

- You're paying Shopify $39/month to be a product catalog
- Shopify's main value (checkout) is unused
- You need to sync products from Shopify AND manage Stripe pricing — two systems to keep in sync
- If a product costs $29.99 in Shopify, you need to pass $29.99 to Stripe at checkout — prices live in two places

### When it makes sense

Only if you specifically need Shopify's product management UI and don't want to build your own. For a small merch store with <100 products managed via seed data and Printify sync, this is unnecessary overhead.

**Not recommended.** If you want Shopify, use Shopify's checkout. If you want Stripe, manage products yourself.

---

## Revised decision set — Stripe-compatible

Here's the coherent set that works with Stripe:

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Database | **PostgreSQL + Prisma + Supabase** | ✓ unchanged |
| 2 | Product source | **Hybrid — seed data first, Printify sync later** | Products in your DB. No Shopify needed. Printify sync adds real catalog when ready. |
| 3 | Cart | **Server-side** | ✓ unchanged. Cart contents feed into Stripe Checkout Session. |
| 4 | Checkout | **Stripe Checkout (hosted)** | Redirect to Stripe's hosted page. No checkout UI to build. Upgrade to Elements later if you want. |
| 5 | API contracts | **Option B — domain model shapes** | ✓ unchanged |
| 6 | Auth | **Supabase Auth** | Since you want accounts AND you're using Supabase, use what's already there. Don't build auth from scratch with NextAuth.js when Supabase provides it. |
| 7 | Webhooks | **Both: Printify + Stripe** | Printify webhooks for fulfillment (order shipped, product updated). Stripe webhooks for payments (payment succeeded, refund issued). Same webhook pattern, two providers. |

### What changes from the original spec

| Spec element | Before | After |
|---|---|---|
| EP-018 | "Shopify Enablement" | Becomes **"Stripe Checkout Integration"** — create checkout sessions, handle payment webhooks, submit orders to Printify |
| Shopify | Core integration | **Optional future addition** — could add Shopify as a product sync source later, but not needed for MVP |
| Checkout | Undefined / placeholder | **Stripe Checkout hosted page** — actual working payments from EP-018 onward |
| Auth | Anonymous only | **Supabase Auth** — signup/login available, but not required for shopping (anonymous carts still work) |
| Webhook handlers | Printify only | **Printify + Stripe** — two webhook receivers, same pattern |

### What Shopify becomes in this architecture

Shopify is no longer an EP-018 "enablement" epic. Instead, it becomes an **optional future epic** — "add Shopify as an alternative product sync source and checkout path." It's not needed for the MVP to work end-to-end.

The MVP flow becomes:

```
Shopper → browses store (your Next.js frontend)
       → adds items to cart (server-side, your DB)
       → clicks Checkout (redirected to Stripe)
       → pays on Stripe's hosted page
       → Stripe webhook → your server creates order
       → your server submits order to Printify
       → Printify prints and ships
       → Printify webhook → your server updates order status
       → shopper can check order status on your site
```

Every piece has a clear owner. No redundant services. Stripe for money, Printify for fulfillment, your app for everything else.

---

## Auth decision: Supabase Auth vs. built-in vs. anonymous

Since you want user accounts (Gap 6) and you're already using Supabase (Gap 1), here's why **Supabase Auth** is the right call over building your own:

### What Supabase Auth gives you for free

- Email + password signup/login
- Password reset emails
- Email verification
- Session management (JWT tokens)
- OAuth providers (Google, GitHub, etc.) if you want them later
- Row-level security (database rows visible only to their owner)
- React hooks (`useUser()`, `useSession()`)

### What building your own with NextAuth.js means

- Install and configure NextAuth.js
- Set up a database adapter for session storage
- Build signup/login pages
- Implement password hashing (bcrypt)
- Build password reset flow (generate token, send email, verify token, update password)
- Build email verification flow
- Handle session tokens and cookies
- Build middleware to protect routes

That's 2-3 days of work to replicate what Supabase already provides in your stack.

### How auth connects to the rest

```
Anonymous shopper:
  → Gets a session cookie (UUID)
  → Cart tied to session
  → Can checkout via Stripe
  → Receives order confirmation email from Stripe

Logged-in shopper (with Supabase Auth):
  → Gets a Supabase JWT token
  → Cart tied to user ID (persists across devices)
  → Can see order history
  → Can checkout via Stripe with pre-filled email
  → Receives order confirmation email from Stripe
```

Both paths work. Auth adds persistence and history, not a fundamentally different flow.

---

## Revised epic sequence with Stripe

### EP-001 — Repo Bootstrap + App Shell + Tailwind + Supabase
- Next.js + TypeScript + Tailwind setup
- Supabase project creation and connection
- Prisma schema with Supabase Postgres
- Base layout, nav, footer

### EP-002 — Home Page

### EP-003 — Product Detail Page + Product Model

### EP-004 — Search

### EP-005 — Cart + Server-Side Cart State

### EP-006 — API Routes + Data Layer

### EP-007 — Testing Infrastructure

### EP-008 — Supabase Auth Integration
- Signup/login pages
- Supabase Auth configuration
- Session middleware
- Cart migration (anonymous session → logged-in user)
- Protected routes (order history)

### EP-009–010 — Gap / polish

### EP-011–014 — Gap / foundation work

### EP-015 — Vercel Deployment + CD Pipeline
- Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` to secrets list
- Add `SUPABASE_URL`, `SUPABASE_ANON_KEY` to secrets list

### EP-016 — Printify Webhook Receiver + Order Sync
- Unchanged from original spec
- HMAC-SHA256 verification
- Event routing
- 49 unit tests

### EP-017 — Playwright E2E Tests

### EP-018 — Stripe Checkout Integration (was: Shopify Enablement)
- Stripe Checkout Session creation endpoint
- Stripe webhook receiver (`payment_intent.succeeded`, `checkout.session.completed`)
- Order creation after successful payment
- Printify order submission after payment
- Cart clearing after successful checkout
- Order confirmation / thank-you page
- Test mode with Stripe's fake card numbers

### EP-019 — Accessibility Audit + WCAG 2.1 AA Fixes

### EP-020 — Performance Monitoring

---

## Cost summary

| Service | Cost |
|---|---|
| Supabase (database + auth) | Free tier (0.5 GB, 50,000 monthly active users) |
| Stripe | 2.9% + 30¢ per transaction (no monthly fee) |
| Printify | Free (you pay per item when orders are placed) |
| Vercel | Free tier (hobby plan) |
| **Total fixed cost** | **$0/month** — you only pay when you make sales |

Compare with the Shopify path: $39/month before your first sale.
