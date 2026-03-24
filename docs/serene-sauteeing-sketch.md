# Implementation Plan — Printify + Stripe Merch Storefront

## Context

Build a production-grade merch storefront from greenfield. Not a prototype — a real store that handles real money, real fulfillment, and real users. All 20 epics, ending with a deployed, tested, accessible, performant application.

### Key decisions (from docs/decision_gaps.md)
- **Stack:** Next.js + TypeScript + Tailwind + Prisma + Supabase + Stripe + Printify + Vercel
- **Auth:** Supabase Auth, built into MVP from the start
- **Cart:** Server-side (DB-backed), linked to user accounts
- **Checkout:** Stripe Checkout (hosted) — redirect to Stripe, no custom payment UI
- **Products:** Seed data first, Printify sync later
- **Webhooks:** Printify (fulfillment) + Stripe (payments)
- **Shopify:** Dropped from MVP, saved for future

### Reference docs
- `docs/latest_printify_shopify_storefront_mvp_spec.md` — domain model, routes, architecture
- `docs/revised_epics.md` — epic sequence
- `docs/stripe_architecture.md` — Stripe-centered architecture
- `docs/decision_gaps.md` — all technical decisions
- `docs/stack_validation_research.md` — stack validation
- `docs/webhooks_deepdive.md` — webhook implementation patterns
- `docs/api_endpoints_deepdive.md` — API contracts and data shapes

---

## Epic Sequence

### EP-001 — Repo Bootstrap + App Shell + Supabase + Auth

**Goal:** Working Next.js app with auth, database, and base layout. Everything after builds on this foundation.

**Tasks:**
1. Initialize Next.js (App Router) + TypeScript + Tailwind CSS
2. Configure ESLint + Prettier
3. Set up Prisma with Supabase Postgres connection
4. Define initial Prisma schema (all 7 models from spec: Product, ProductVariant, Cart, CartItem, Order, WebhookEvent, SyncRun — plus User linkage via Supabase Auth ID)
5. Run initial migration
6. Set up Supabase Auth (email/password)
7. Build auth pages: signup, login, password reset
8. Build base layout: root layout with header, nav, footer
9. Auth middleware: protect routes that need login, allow anonymous browsing
10. Session handling: anonymous session cookie for non-logged-in users, Supabase JWT for logged-in users
11. Seed script: populate DB with ~10 sample products and variants
12. Environment variables: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Files created:**
- `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`
- `prisma/schema.prisma`, `prisma/seed.ts`
- `.env.local` (gitignored), `.env.example`
- `src/app/layout.tsx` (root layout)
- `src/app/(auth)/login/page.tsx`, `signup/page.tsx`, `reset-password/page.tsx`
- `src/components/layout/Header.tsx`, `Footer.tsx`, `Nav.tsx`
- `src/lib/supabase/client.ts`, `server.ts`, `middleware.ts`
- `src/lib/db/index.ts` (Prisma client singleton)
- `src/middleware.ts` (Next.js middleware for auth)

**Done when:** `npm run dev` serves a page with working signup/login, database has seed products, Prisma Studio shows data in Supabase.

---

### EP-002 — Home Page

**Goal:** Landing page showing featured products with navigation to product detail and search.

**Tasks:**
1. `GET /api/products?featured=true` endpoint — returns featured products from DB
2. Home page (`src/app/page.tsx`) with hero section and featured product grid
3. ProductCard component (image, title, price, link to detail page)
4. Responsive layout (mobile-first)
5. Loading states and error handling

**Files created/modified:**
- `src/app/page.tsx`
- `src/app/api/products/route.ts`
- `src/components/product/ProductCard.tsx`
- `src/components/ui/` (shared UI primitives as needed)

**Done when:** Home page renders seed products, cards link to `/products/[slug]`, looks good on mobile and desktop.

---

### EP-003 — Product Detail Page + Product Model

**Goal:** Individual product page with variant selection and add-to-cart.

**Tasks:**
1. `GET /api/products/[slug]` endpoint — returns product with variants
2. Product page (`src/app/products/[slug]/page.tsx`)
3. Image gallery component
4. Variant selector (size, color, etc. from `optionValuesJson`)
5. Price display (updates with variant selection)
6. "Add to Cart" button (wired to cart API in EP-005, disabled until then)
7. SEO metadata (title, description, Open Graph tags)

**Files created/modified:**
- `src/app/products/[slug]/page.tsx`
- `src/app/api/products/[slug]/route.ts`
- `src/components/product/ImageGallery.tsx`
- `src/components/product/VariantSelector.tsx`
- `src/components/product/AddToCartButton.tsx`

**Done when:** `/products/cool-hat` renders product details, variant selection works, metadata appears in page source.

---

### EP-004 — Search

**Goal:** Search page with query-based product filtering.

**Tasks:**
1. `GET /api/search?q=...&page=1` endpoint — full-text search against products
2. Search page (`src/app/search/page.tsx`)
3. Search input component (in header nav for global access + on search page)
4. Results grid using ProductCard component (reuse from EP-002)
5. Empty state ("No products found for...")
6. Pagination component
7. URL-based query state (search term in URL params, shareable/bookmarkable)

**Files created/modified:**
- `src/app/search/page.tsx`
- `src/app/api/search/route.ts`
- `src/components/search/SearchInput.tsx`
- `src/components/ui/Pagination.tsx`
- `src/components/layout/Header.tsx` (add search to nav)

**Done when:** Searching from header or search page returns matching products, pagination works, empty state shows for no results.

---

### EP-005 — Cart + Server-Side Cart State

**Goal:** Fully functional cart with server-side persistence linked to user/session.

**Tasks:**
1. Cart API endpoints:
   - `GET /api/cart` — get current cart (by session or user ID)
   - `POST /api/cart/items` — add item `{ productId, variantId, quantity }`
   - `PUT /api/cart/items/[itemId]` — update quantity `{ quantity }`
   - `DELETE /api/cart/items/[itemId]` — remove item
2. Session middleware: anonymous users get a session cookie (UUID), logged-in users use their Supabase user ID
3. Cart page (`src/app/cart/page.tsx`) — line items, quantities, subtotals, total
4. Cart item component (product image, title, variant, quantity stepper, remove button, line total)
5. Cart count in header nav (badge showing item count)
6. Cart migration: when anonymous user logs in, merge anonymous cart into user cart
7. Wire "Add to Cart" button from EP-003 to cart API
8. Optimistic UI updates (cart updates feel instant while API call happens in background)

**Files created/modified:**
- `src/app/cart/page.tsx`
- `src/app/api/cart/route.ts`
- `src/app/api/cart/items/route.ts`
- `src/app/api/cart/items/[itemId]/route.ts`
- `src/components/cart/CartItem.tsx`
- `src/components/cart/CartSummary.tsx`
- `src/components/cart/QuantityStepper.tsx`
- `src/components/layout/CartBadge.tsx`
- `src/lib/cart/session.ts` (session cookie handling)
- `src/lib/cart/merge.ts` (anonymous → user cart migration)

**Done when:** Full cart lifecycle works: add from product page → see in cart → update quantity → remove → cart persists across page loads. Anonymous and logged-in carts both work. Cart badge shows count in header.

---

### EP-006 — API Routes + Data Layer Hardening

**Goal:** Solidify the API layer with consistent patterns, error handling, validation, and the commerce provider abstraction.

**Tasks:**
1. API response convention enforcement:
   - Success: `{ data: ... }` or `{ data: [...], pagination: { page, pageSize, total } }`
   - Error: `{ error: { code: "MACHINE_READABLE", message: "Human readable" } }`
2. Input validation (Zod schemas for all request bodies)
3. Error handling middleware/utility (consistent error responses)
4. Commerce provider abstraction:
   - `src/lib/commerce/provider.ts` — interface definition
   - `src/lib/commerce/local/index.ts` — local/seed data provider (current implementation)
   - `src/lib/commerce/flags.ts` — feature flags for provider switching
5. Rate limiting on public endpoints (basic, using headers)
6. API route tests setup

**Files created/modified:**
- `src/lib/api/response.ts` (response helpers)
- `src/lib/api/validation.ts` (Zod schemas)
- `src/lib/api/errors.ts` (error utilities)
- `src/lib/commerce/provider.ts`
- `src/lib/commerce/local/index.ts`
- `src/lib/commerce/flags.ts`
- Refactor existing API routes to use new patterns

**Done when:** All API routes use consistent response format, invalid inputs return clear error messages, commerce provider boundary exists.

---

### EP-007 — Testing Infrastructure

**Goal:** Unit and E2E testing fully set up, initial test coverage for existing code.

**Tasks:**
1. Vitest setup and configuration
2. Playwright setup with 3-browser config (Chromium, Firefox, WebKit)
3. Test database setup (separate Supabase project or test schema)
4. Unit tests for:
   - Cart session logic
   - Cart merge logic
   - API response helpers
   - Validation schemas
   - Commerce provider interface
5. E2E tests for:
   - Home page loads and shows products
   - Product page loads by slug
   - Search returns results
   - Cart add/update/remove flow
   - Auth signup/login flow
6. CI-compatible test scripts in `package.json`

**Files created/modified:**
- `vitest.config.ts`
- `playwright.config.ts`
- `tests/unit/` (unit test files)
- `tests/e2e/` (E2E test files)
- `package.json` (test scripts)

**Done when:** `npm run test` passes unit tests, `npm run test:e2e` passes in 3 browsers, both are CI-ready.

---

### EP-008 — Auth Hardening + User Features

**Goal:** Auth is production-quality. Users get value from accounts.

**Tasks:**
1. Email verification flow (Supabase handles emails, app handles verification callback)
2. Password reset flow end-to-end
3. User profile page (email, account settings)
4. Order history page (empty for now, populated after EP-018)
5. Auth state management across the app (React context or Supabase's `onAuthStateChange`)
6. Protected route patterns finalized
7. Logout flow
8. Auth E2E tests

**Files created/modified:**
- `src/app/(auth)/verify/page.tsx`
- `src/app/(auth)/reset-password/confirm/page.tsx`
- `src/app/account/page.tsx`
- `src/app/account/orders/page.tsx`
- `src/lib/supabase/auth-context.tsx`
- `tests/e2e/auth.spec.ts`

**Done when:** Full auth lifecycle works: signup → verify email → login → view profile → reset password → logout. All flows have E2E coverage.

---

### EP-009–010 — Polish + Error States + SEO

**Goal:** App feels complete, not half-built. Error states, loading states, edge cases handled.

**Tasks:**
1. 404 page (custom, branded)
2. 500 error page
3. Loading skeletons for product grid, product page, cart
4. Empty states: empty cart, no search results, no featured products
5. SEO: sitemap generation, robots.txt, canonical URLs, structured data (JSON-LD for products)
6. Favicon, Open Graph images, manifest.json
7. Mobile responsiveness audit across all pages
8. Toast/notification system for cart actions ("Added to cart!", "Item removed")

**Files created/modified:**
- `src/app/not-found.tsx`
- `src/app/error.tsx`
- `src/components/ui/Skeleton.tsx`
- `src/components/ui/Toast.tsx`
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `public/favicon.ico`, `public/og-image.png`

**Done when:** Every page handles loading, error, and empty states. SEO metadata is present. No broken layouts on mobile.

---

### EP-011–014 — Foundation Hardening

**Goal:** Codebase is solid before adding external integrations.

**EP-011: Database hardening**
- Add database indexes for performance (product slug, cart sessionId, order externalOrderId)
- Connection pooling configuration for Supabase/Prisma on Vercel
- Database error handling (connection failures, timeouts)

**EP-012: Security hardening**
- CSRF protection on mutation endpoints
- Input sanitization
- Content Security Policy headers
- Secure cookie configuration audit
- Rate limiting on auth endpoints (prevent brute force)

**EP-013: Component library completion**
- Audit all components for consistency
- Extract shared patterns into reusable components
- Ensure all interactive elements have hover/focus/active states
- Dark mode support (if desired, or at least no hardcoded colors)

**EP-014: Code quality**
- ESLint rules finalized and all warnings resolved
- TypeScript strict mode enabled, all `any` types eliminated
- Remove dead code, unused imports
- Consistent file/folder naming conventions verified
- Add JSDoc to public API functions and commerce provider interface

**Done when:** No lint warnings, no TypeScript errors in strict mode, database queries are indexed, security headers are set.

---

### EP-015 — Vercel Deployment + CD Pipeline

**Goal:** Push to main deploys to production. PRs get preview URLs. Tests run in CI.

**Tasks:**
1. `vercel.json` configuration
2. Three GitHub Actions workflows:
   - `ci.yml`: install → lint → unit tests → Playwright (3-browser matrix)
   - `deploy-preview.yml`: on PR → build → deploy preview → post URL as PR comment
   - `deploy-production.yml`: on push to main → deploy production
3. Environment variables configured in Vercel dashboard:
   - `DATABASE_URL`, `DIRECT_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (added at EP-018, but slots documented now)
   - `PRINTIFY_API_TOKEN`, `PRINTIFY_WEBHOOK_SECRET` (added at EP-016, but slots documented now)
4. GitHub secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
5. Branch protection: require CI pass before merge to main
6. `.env.example` updated with all required variables

**Files created/modified:**
- `vercel.json`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-preview.yml`
- `.github/workflows/deploy-production.yml`
- `.env.example` (updated)

**Done when:** Merge to main auto-deploys. PRs get preview URLs with passing tests. Live at `https://your-store.vercel.app`.

---

### EP-016 — Printify Webhook Receiver + Order Sync

**Goal:** Receive and process Printify webhooks. Sync order state. Full unit test coverage.

**Tasks:**
1. `POST /api/webhooks/printify` route:
   - Read raw body (preserve for signature verification)
   - HMAC-SHA256 signature verification (constant-time comparison)
   - Reject invalid signatures (401)
   - Parse payload
   - Log to `webhook_events` table (before processing)
   - Route event to handler
   - Idempotency check (skip duplicate events)
2. Event handlers:
   - `order.created` → create/update local order record
   - `order.updated` → update order status
   - `order.shipped` → update status + store tracking info
   - `product.published` → sync product to local DB
   - `product.updated` → update local product
3. `POST /api/sync/printify` — manual reconciliation endpoint
4. Printify API client (`src/lib/printify/client.ts`)
5. Payload mappers (`src/lib/printify/mappers.ts`) — Printify format → our domain model
6. ~49 unit tests covering:
   - Signature verification (valid, invalid, missing, tampered)
   - Event routing (known types, unknown types, missing type)
   - Each handler (happy path, missing data, duplicate events)
   - Payload parsing (valid, malformed, missing fields)
   - Sync endpoint (success, API failure, partial failure)
7. Environment variables: `PRINTIFY_API_TOKEN`, `PRINTIFY_WEBHOOK_SECRET`, `PRINTIFY_SHOP_ID`

**Files created/modified:**
- `src/app/api/webhooks/printify/route.ts`
- `src/app/api/sync/printify/route.ts`
- `src/lib/printify/verify-hmac.ts`
- `src/lib/printify/router.ts`
- `src/lib/printify/handlers/order-created.ts`, `order-updated.ts`, `order-shipped.ts`, `product-published.ts`, `product-updated.ts`
- `src/lib/printify/client.ts`
- `src/lib/printify/mappers.ts`
- `src/lib/printify/sync.ts`
- `tests/unit/printify/` (~49 test files)

**Done when:** All 49+ unit tests pass. Webhook endpoint correctly verifies, routes, and processes events. Sync endpoint works as a manual fallback.

---

### EP-017 — Playwright E2E Tests — Core User Flows

**Goal:** 22+ E2E tests across 4 core flows, running in 3 browsers in CI.

**Tasks:**
1. Home flow tests:
   - Page loads with featured products
   - Product cards link to detail pages
   - Navigation works (header, footer links)
   - Search from header
2. Product flow tests:
   - Product page loads by slug
   - Images display
   - Variant selection updates price
   - Add to cart works
   - Invalid slug shows 404
3. Search flow tests:
   - Search returns matching results
   - Empty query shows appropriate state
   - Pagination works
   - No results shows empty state
4. Cart flow tests:
   - Add item from product page
   - Cart page shows items
   - Update quantity
   - Remove item
   - Cart persists across page navigation
   - Cart badge updates
5. Auth flow tests:
   - Signup, login, logout
   - Cart merges on login
6. CI integration: 3-browser matrix (Chromium, Firefox, WebKit)

**Files created/modified:**
- `tests/e2e/home.spec.ts`
- `tests/e2e/product.spec.ts`
- `tests/e2e/search.spec.ts`
- `tests/e2e/cart.spec.ts`
- `tests/e2e/auth.spec.ts`
- `playwright.config.ts` (finalize 3-browser matrix)
- `.github/workflows/ci.yml` (ensure Playwright runs in matrix)

**Done when:** 22+ tests pass across 3 browsers in CI. All 4 core flows + auth covered.

---

### EP-018 — Stripe Checkout Integration

**Goal:** Real payments work (in test mode). Full checkout → fulfillment flow.

**Tasks:**
1. `POST /api/checkout` — create Stripe Checkout Session from cart:
   - Convert cart items to Stripe line items
   - Include shipping address collection
   - Set success/cancel URLs
   - Link to Supabase user if logged in
2. `POST /api/webhooks/stripe` — Stripe webhook receiver:
   - Signature verification (Stripe's signing secret)
   - Handle `checkout.session.completed`:
     - Create Order in database
     - Submit order to Printify for fulfillment
     - Clear the cart
     - Link order to user account
   - Handle `payment_intent.payment_failed`: log failure
   - Handle `charge.refunded`: update order status
3. Order confirmation page (`/order/success`) — show order details, "thank you"
4. Order history populated (`/account/orders`) — user can see past orders with status
5. Stripe test mode: fake card numbers for development (`4242 4242 4242 4242`)
6. Cart page "Checkout" button → redirects to Stripe
7. Unit tests for checkout session creation and webhook handling
8. E2E test: add to cart → checkout redirect (can't test Stripe's hosted page, but test up to redirect)
9. Environment variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Files created/modified:**
- `src/app/api/checkout/route.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/app/order/success/page.tsx`
- `src/app/account/orders/page.tsx` (populate with real data)
- `src/lib/stripe/client.ts`
- `src/lib/stripe/checkout.ts`
- `src/lib/stripe/webhooks.ts`
- `src/lib/printify/submit-order.ts`
- `src/components/cart/CheckoutButton.tsx`
- `tests/unit/stripe/` (webhook + checkout tests)
- `tests/e2e/checkout.spec.ts`

**Done when:** Full flow works in test mode: browse → add to cart → click checkout → pay on Stripe (test card) → order created → Printify order submitted → order visible in account. Webhooks verified and tested.

---

### EP-019 — Accessibility Audit + WCAG 2.1 AA Fixes

**Goal:** App meets WCAG 2.1 AA. Keyboard navigable. Screen reader friendly. Automated checks in CI.

**Tasks:**
1. Component-by-component audit:
   - Header/nav: keyboard navigation, ARIA landmarks
   - Search input: label, autocomplete accessibility
   - Product image gallery: alt text, keyboard control
   - Variant selector: radio group semantics, focus states
   - Add-to-cart button: ARIA live region for feedback
   - Cart page: quantity stepper accessible, remove confirmation
   - Auth forms: labels, error messages linked to fields, focus management
   - Toast notifications: ARIA live regions
   - Footer: link semantics
2. Focus trap fixes:
   - Mobile menu (if drawer-based): trap focus when open
   - Any modal or overlay: trap focus, return focus on close
3. Color/contrast audit:
   - Audit Tailwind token file for semantic colors
   - Verify contrast ratios meet AA (4.5:1 for normal text, 3:1 for large text)
   - Focus indicators visible against all backgrounds
4. Semantic HTML:
   - Heading hierarchy (one h1 per page, logical h2/h3)
   - Landmark regions (main, nav, aside, footer)
   - Button vs. link semantics (buttons do actions, links navigate)
5. axe-core integration into Playwright:
   - Add `@axe-core/playwright` to E2E tests
   - Run accessibility checks on every page in every E2E flow
   - Fail on serious/critical violations
6. Vitest exclusion rule: ensure axe-core Playwright integration doesn't interfere with Vitest

**Files modified:** Potentially every component file, plus:
- `src/styles/tokens.ts` or `tailwind.config.ts` (color updates)
- `tests/e2e/*.spec.ts` (add axe-core checks)
- `package.json` (add `@axe-core/playwright`)

**Done when:** All E2E tests include axe-core checks with zero serious/critical violations. Full keyboard navigation works. Screen reader testing passes on core flows.

---

### EP-020 — Performance Monitoring + Core Web Vitals + Bundle Analysis

**Goal:** Performance is measured, monitored, and gated in CI. No regressions ship.

**Tasks:**
1. Analytics injection:
   - Add web-vitals reporting in root layout (`src/app/layout.tsx`)
   - Track LCP, INP, CLS
   - Send metrics to an analytics endpoint or console (production: could use Vercel Analytics)
2. Bundle analysis:
   - Add `@next/bundle-analyzer` to `next.config.ts`
   - Generate bundle report on build
   - Add `npm run analyze` script to `package.json`
   - Document current baseline bundle sizes
3. Lighthouse CI:
   - Add Lighthouse CI to GitHub Actions
   - Set thresholds: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 90, SEO ≥ 90
   - Fail CI if thresholds breached
4. Preservation rules (critical — read before editing):
   - Do NOT break existing `package.json` scripts
   - Do NOT break `next.config.ts` existing behavior
   - Read all 3 CI workflows before modifying any
5. Image optimization audit:
   - Ensure all images use `next/image` for automatic optimization
   - Lazy loading for below-fold images
6. Code splitting verification:
   - Ensure dynamic imports where appropriate
   - No single route bundle exceeds reasonable size

**Files modified:**
- `src/app/layout.tsx` (analytics injection)
- `next.config.ts` (bundle analyzer integration — preserve existing config)
- `package.json` (add `analyze` script — preserve existing scripts)
- `.github/workflows/ci.yml` (add Lighthouse CI step — preserve existing steps)
- `lighthouserc.js` or equivalent config

**Done when:** `npm run analyze` produces bundle report. Lighthouse CI runs in GitHub Actions with passing thresholds. Core Web Vitals are tracked. No existing CI workflows or scripts are broken.

---

## Verification plan

After all 20 epics, the following must be true:

### Functional verification
- [ ] User can sign up, verify email, log in, reset password, log out
- [ ] Home page shows featured products from seed data
- [ ] Product page loads by slug with variants and images
- [ ] Search returns relevant results with pagination
- [ ] Cart: add, update quantity, remove — persists across pages
- [ ] Anonymous cart merges into user cart on login
- [ ] Checkout redirects to Stripe, payment succeeds (test mode)
- [ ] Order appears in user's order history after payment
- [ ] Printify receives order submission after Stripe payment
- [ ] Printify webhook updates order status (simulated in tests)
- [ ] Stripe webhook handles payment confirmation and refunds

### Quality verification
- [ ] 49+ unit tests passing (Printify webhook + Stripe + cart + API logic)
- [ ] 22+ E2E tests passing across 3 browsers
- [ ] axe-core: zero serious/critical accessibility violations
- [ ] Lighthouse: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 90, SEO ≥ 90
- [ ] All TypeScript in strict mode, zero `any` types
- [ ] Zero ESLint warnings

### Deployment verification
- [ ] Push to main → production deploy on Vercel
- [ ] PR → preview URL with passing CI
- [ ] All environment variables documented in `.env.example`
- [ ] CI runs: lint → unit tests → E2E (3 browsers) → Lighthouse

### Production readiness
- [ ] Secure headers (CSP, CSRF protection)
- [ ] Rate limiting on auth and webhook endpoints
- [ ] Database indexes on query-hot columns
- [ ] Error pages (404, 500) are branded, not default
- [ ] Loading states on every async operation
- [ ] Mobile responsive on all pages
