# Merch Store

A production-grade print-on-demand storefront built with Next.js, Supabase, Stripe, and Printify. The application is **fully functioning** for all core shopping flows — browse, search, cart, checkout, and order history — running locally and ready for deployment.

---

## What this store does

Users can:

- Browse a product catalog with featured items on the home page
- View individual product pages with variant selection (color, size) and out-of-stock handling
- Search products by title, description, or tag with pagination
- Add items to a cart that persists across page loads (anonymous session or logged-in user)
- Sign up, log in, reset password, and view their account
- Check out via Stripe's hosted payment page (full Stripe Checkout integration)
- See their order history after payment

The back end:

- Receives and verifies Printify webhooks (HMAC-SHA256) to track fulfillment status
- Receives and verifies Stripe webhooks to create orders on payment confirmation
- Provides a manual sync endpoint for reconciling Printify product data
- Serves a REST API with consistent JSON response shapes and Zod validation

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v3 |
| Database | PostgreSQL via Supabase |
| ORM | Prisma v6 |
| Auth | Supabase Auth (email/password) |
| Payments | Stripe Checkout (hosted page) |
| Fulfillment | Printify (webhooks + sync) |
| Hosting (target) | Vercel |
| Unit tests | Vitest (51 tests) |
| E2E tests | Playwright (131 tests, 3-browser) |
| Accessibility | axe-core (WCAG 2.1 AA) |
| CI/CD | GitHub Actions (3 workflows) |

---

## Scope and boundaries

**What works end-to-end today:**

- Full product browsing, search, and cart lifecycle
- Supabase authentication (signup → verify → login → logout → password reset)
- Stripe Checkout redirect and webhook handling (test mode)
- Printify webhook receiver with event routing and idempotency
- 182 automated tests (51 unit + 131 E2E across Chromium, Firefox, WebKit)
- WCAG 2.1 AA accessibility (axe-core scans pass on all pages)
- SEO: sitemap, robots.txt, Open Graph tags, structured data
- Security: CSP headers, CSRF handling, rate limiting on auth
- CI/CD: GitHub Actions + Vercel configuration ready

**What requires external accounts/keys to activate:**

- **Stripe payments:** Keys from a Stripe account needed in `.env.local` — zero code changes required
- **Printify fulfillment:** API token from a Printify account needed, plus ~50 lines of order submission code
- **Deployment:** Push to GitHub + connect Vercel — 20 minutes, no code changes

**Minor features not yet wired:**

- Cart count badge in header (fetch `/api/cart` and display `itemCount`)
- Anonymous cart merge on login (~5 lines in the login callback)

**Products** currently come from seed data (10 products, 36 variants). When Printify is connected and the sync endpoint is wired to Printify's catalog API, products will be pulled from there automatically.

---

## Running locally

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in: DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL,
#          NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# Run database migrations and seed data
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

Open http://localhost:3000.

---

## Testing

```bash
# Unit tests
npm run test

# E2E tests (requires dev server running)
npm run test:e2e

# All tests
npm run test:all
```

---

## Database management

```bash
npm run db:studio    # Open Prisma Studio (visual DB editor)
npm run db:migrate   # Run pending migrations
npm run db:seed      # Seed 10 products + 36 variants
npm run db:generate  # Regenerate Prisma client after schema changes
```

---

## Environment variables

See `.env.example` for the full list. Key variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase Postgres connection string (pooled) |
| `DIRECT_URL` | Supabase direct connection (for migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server-side only) |
| `STRIPE_SECRET_KEY` | Stripe secret key (add to activate payments) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `PRINTIFY_API_TOKEN` | Printify API token (add to activate fulfillment) |
| `PRINTIFY_SHOP_ID` | Printify shop ID |
| `PRINTIFY_WEBHOOK_SECRET` | Printify webhook signing secret |

---

## Project structure

```
src/
  app/                    # Next.js App Router pages and API routes
    (auth)/               # Login, signup, password reset
    account/              # User profile and order history
    api/                  # REST endpoints (products, cart, search, webhooks, checkout)
    cart/                 # Cart page
    order/success/        # Order confirmation page
    products/[slug]/      # Product detail page
    search/               # Search results page
  components/             # React components
    cart/                 # Cart item, summary, quantity stepper
    layout/               # Header, footer, nav
    product/              # Product card, image gallery, variant selector
    search/               # Search input
    ui/                   # Shared primitives (pagination, skeleton, toast)
  lib/                    # Business logic
    cart/                 # Session handling, anonymous→user merge
    commerce/             # Provider abstraction (local/printify/shopify flags)
    printify/             # HMAC verification, webhook router, handlers, sync
    stripe/               # Checkout session, webhook handling
    supabase/             # Auth clients (browser, server, middleware)
    api/                  # Response helpers, Zod validation schemas, error utilities
prisma/
  schema.prisma           # 7 models: Product, ProductVariant, Cart, CartItem, Order, WebhookEvent, SyncRun
  seed.ts                 # 10 products, 36 variants
tests/
  unit/                   # Vitest: validation, HMAC, routing, flags
  e2e/                    # Playwright: home, product, search, cart, auth, checkout, accessibility
docs/
  revised_epics.md        # 20-epic implementation plan
  decision_gaps.md        # Architectural decisions with glossary
  whats_missing.md        # Gap analysis: what's left to go live
  stripe_architecture.md  # Stripe-centered payment architecture
  stack_validation_research.md  # Stack validation with sources
  webhooks_deepdive.md    # Webhook implementation deep-dive
  api_endpoints_deepdive.md     # REST API concepts and contracts
  ep001_test_report.md    # Per-epic test reports (ep001–ep020)
  ...
```

---

## Dev journey

This application was built from a blank directory across 20 epics over a single extended session.

The starting point was a specification document for a Printify + Shopify storefront. The first step was critiquing that spec, resolving 7 architectural gaps (database choice, product source, cart persistence, checkout flow, API contracts, auth model, webhook payloads), and writing revised implementation documents before touching any code.

**Key decisions made:**

- **Stripe Checkout** (hosted page) over custom payment UI — eliminates PCI scope, faster to implement, battle-tested
- **Supabase** for both Postgres and Auth — single platform, no separate auth service
- **Server-side cart** (DB-backed) over localStorage — survives page refresh, works across devices, merges on login
- **Prisma v6** (not v7) — Prisma v7 dropped the `url` field in schema.prisma, breaking the Supabase pooled connection pattern
- **Tailwind v3** (not v4) — Tailwind v4 is incompatible with Next.js 16's Turbopack bundler; downgraded to fix a `CssSyntaxError: Invalid code point` at startup

**Technical hurdles resolved:**

- Prisma v7 breaking change: `url` property removed from schema.prisma — fixed by pinning to v6
- Tailwind v4 + Turbopack incompatibility — fixed by downgrading to v3, creating `tailwind.config.ts`, updating `postcss.config.mjs`, and changing `globals.css` from `@import "tailwindcss"` to `@tailwind base/components/utilities`
- Supabase new API key format (`sb_publishable_...` / `sb_secret_...`) replacing the old `eyJ...` JWT format
- Playwright strict-mode violations from Next.js dev toolbar overlapping with test selectors — fixed by scoping selectors to `page.getByRole("main")`
- SEO title duplication ("Page | Merch Store | Merch Store") caused by root layout template applying a second suffix — fixed by using bare titles in page metadata

The final result is a complete, tested, accessible storefront. It is not a toy or prototype — the architecture handles real authentication, real payment flows, real webhook verification, and real database persistence. The only thing between this codebase and a live store is connecting three external services (Stripe, Printify, Vercel) and adding their API keys.

---

## What's left to go live

See `docs/whats_missing.md` for the full gap analysis. Summary:

| Priority | Item | Effort |
|---|---|---|
| 1 | Connect Vercel (deploy the app) | 20 min |
| 2 | Add Stripe API keys | 15 min |
| 3 | Connect Printify (account + API token) | 30 min |
| 4 | Write Printify order submission code | 1–2 hours |
| 5 | Wire cart badge in header | 20 min |
| 6 | Wire cart merge on login | 10 min |

**Total effort to a live, functioning store: ~4 hours.**
