# What's Missing — Gap Between Current Build and Production Store

This document lists everything that's built, everything that's not, and what you need to do to go from "working local app" to "live store accepting real money."

---

## What IS built and working

| Feature | Status | Notes |
|---|---|---|
| Home page with featured products | Done | 5 featured products from seed data |
| Product detail with variant selection | Done | Color/size selectors, out-of-stock handling |
| Search with pagination | Done | Title + description search, case-insensitive |
| Server-side cart (add/update/remove) | Done | Session-based for anonymous, user-linked for logged-in |
| User signup/login/logout | Done | Supabase Auth, email/password |
| Account page + order history | Done | Shows user profile and order list (empty until checkout works) |
| Product API + Search API + Cart API | Done | Consistent JSON response format |
| Printify webhook receiver | Done | HMAC verification, event routing, 5 handlers, idempotency |
| Printify sync endpoint | Done | Placeholder — creates SyncRun records, ready for API wiring |
| Stripe checkout endpoint | Done | Creates Checkout Session, redirects to Stripe hosted page |
| Stripe webhook handler | Done | Handles checkout.session.completed, creates orders |
| Order success page | Done | "Order Confirmed!" with navigation |
| 404/500 error pages | Done | Branded, not default Next.js |
| SEO (sitemap, robots.txt, meta tags) | Done | Dynamic sitemap with all products |
| Security headers | Done | X-Frame-Options, CSP basics, referrer policy |
| Accessibility (WCAG 2.1 AA) | Done | axe-core scans pass on all pages, underlined links |
| Web Vitals tracking | Done | LCP/INP/CLS logging in layout |
| CI/CD config | Done | 3 GitHub Actions workflows, Vercel config |
| Database schema + seed data | Done | 7 models, 10 products, 36 variants in Supabase |
| 182 automated tests | Done | 51 unit + 131 E2E |

---

## What's NOT built — and what each needs

### 1. Stripe API Keys (BLOCKING — store can't take payments without this)

**What:** The checkout button exists and the code is written, but it returns "Stripe is not configured" because no API keys are set.

**What you need to do:**
1. Create a Stripe account at [stripe.com](https://stripe.com) (free)
2. Go to Developers → API keys (make sure Test mode is on)
3. Copy your `sk_test_...` (secret key) and `pk_test_...` (publishable key)
4. Add to `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_your_key_here
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
   ```
5. For local webhook testing, install Stripe CLI and run:
   ```
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   This gives you `whsec_...` — add as `STRIPE_WEBHOOK_SECRET` in `.env.local`

**Effort:** 15 minutes of account setup, zero code changes.

**After this:** You can test the full checkout flow with card `4242 4242 4242 4242`.

---

### 2. Printify API Connection (BLOCKING — store can't fulfill orders without this)

**What:** The webhook receiver and sync endpoint are built, but no connection to Printify's actual API exists. Products come from seed data, not from a real Printify catalog.

**What you need to do:**
1. Create a Printify account at [printify.com](https://printify.com) (free)
2. Create a shop and design some products
3. Go to Settings → API → generate an API token
4. Add to `.env.local`:
   ```
   PRINTIFY_API_TOKEN=your_token_here
   PRINTIFY_SHOP_ID=your_shop_id
   PRINTIFY_WEBHOOK_SECRET=your_webhook_secret
   ```
5. In Printify dashboard, configure webhook URL pointing to your deployed app: `https://your-store.vercel.app/api/webhooks/printify`

**Effort:** 30 minutes of Printify setup. The sync endpoint needs ~2 hours of code to call Printify's product catalog API and import products into the local database (replacing seed data).

**After this:** Products come from Printify. When someone pays via Stripe, the order is submitted to Printify for printing and shipping.

---

### 3. Printify Order Submission After Payment (CODE NEEDED)

**What:** When Stripe confirms payment (`checkout.session.completed`), the webhook handler creates an Order in the database but does NOT submit it to Printify for fulfillment. The `handleCheckoutComplete` function needs to call Printify's "Create Order" API.

**What's needed:** ~50 lines of code in `src/lib/printify/submit-order.ts` to:
1. Take the Order record
2. Map it to Printify's order format (line items, shipping address)
3. POST to `https://api.printify.com/v1/shops/{shop_id}/orders.json`
4. Store Printify's order ID in `order.externalOrderId`

**Effort:** 1-2 hours of code + testing with Printify's sandbox.

---

### 4. GitHub Repository + Vercel Deployment (BLOCKING — not on the internet yet)

**What:** The app runs locally but isn't deployed. Nobody else can access it.

**What you need to do:**
1. Create a GitHub repo (public or private)
2. `git init && git add . && git commit -m "Initial commit"`
3. `git remote add origin https://github.com/your-username/merch-store.git && git push`
4. Go to [vercel.com](https://vercel.com), sign in with GitHub, import the repo
5. Set all environment variables in Vercel dashboard (copy from `.env.local`)
6. Add GitHub secrets for CI: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

**Effort:** 20 minutes. Zero code changes.

**After this:** Your store is live at `https://your-store.vercel.app`. Push to main auto-deploys. PRs get preview URLs.

---

### 5. Real Product Images (COSMETIC — store works without them)

**What:** All products show a placeholder cart icon instead of real images. Seed data has no `imageUrl` values.

**Options:**
- **If using Printify:** Product images come from Printify's API when you sync. Printify generates mockup images of your designs on products.
- **Manual:** Upload images to Supabase Storage or a CDN, update the seed data with URLs.

**Effort:** Automatic if using Printify sync. Manual: 30 minutes to upload 10 images and update seed script.

---

### 6. Cart Merge on Login (CODE NEEDED — minor feature)

**What:** If an anonymous user adds items to cart, then logs in, the anonymous cart should merge into their user cart. The `mergeAnonymousCart` function exists in `src/lib/cart/session.ts` but is never called from the login flow.

**What's needed:** Call `mergeAnonymousCart(user.id, user.email)` after successful login — either in the login page's `handleLogin` function or in the auth callback route.

**Effort:** 10 minutes. ~5 lines of code.

---

### 7. Cart Badge in Header (COSMETIC — minor UX)

**What:** The header shows "Cart" as text but doesn't show a count badge (e.g., "Cart (3)"). Users can't see how many items are in their cart without navigating to the cart page.

**What's needed:** Fetch `GET /api/cart` from the Header component and display `itemCount` next to "Cart".

**Effort:** 20 minutes. ~15 lines of code.

---

### 8. Email Notifications (NICE TO HAVE)

**What:** No emails are sent for order confirmation, shipping updates, or password changes (beyond Supabase's built-in auth emails). Stripe sends a receipt automatically, but custom branded emails don't exist.

**Options:**
- Use Supabase's email templates (customize in dashboard)
- Use Resend, SendGrid, or Postmark for transactional emails
- Rely on Stripe receipts + Printify shipping notifications (both send their own emails)

**Effort:** 2-4 hours to set up a transactional email service and build email templates.

---

### 9. Product Admin / CMS (NICE TO HAVE)

**What:** Products are managed via seed script or Printify sync. There's no admin UI to add/edit/remove products directly in the app.

**Options:**
- Use Prisma Studio (`npm run db:studio`) as a basic admin tool
- Use Supabase Dashboard table editor
- Build a simple `/admin` page (significant effort)
- Rely entirely on Printify for product management

**Effort:** If using Printify/Supabase Dashboard: zero. Custom admin: 1-2 days.

---

### 10. Tailwind v4 Upgrade (TECHNICAL DEBT)

**What:** We downgraded from Tailwind v4 to v3 because v4 is incompatible with Next.js 16's Turbopack. This is a known issue that will be resolved by either Tailwind or Next.js in a future release.

**Impact:** None functionally. Tailwind v3 is stable and widely used. The CSS output is identical for the classes we use.

**When to upgrade:** When Tailwind v4 + Turbopack compatibility is confirmed. Check Tailwind's changelog.

---

## Priority order for going live

| Priority | Item | Effort | Impact |
|---|---|---|---|
| 1 | **GitHub + Vercel deployment** | 20 min | Store exists on the internet |
| 2 | **Stripe API keys** | 15 min | Store can accept payments |
| 3 | **Printify connection** | 30 min setup + 2hr code | Real products, real fulfillment |
| 4 | **Printify order submission** | 1-2 hours | Orders actually get printed and shipped |
| 5 | Cart badge in header | 20 min | Better UX |
| 6 | Cart merge on login | 10 min | Better UX for returning users |
| 7 | Real product images | Auto with Printify | Store looks professional |
| 8 | Email notifications | 2-4 hours | Professional customer communication |
| 9 | Product admin | Optional | Depends on workflow preference |

**Items 1-4 are required for a functioning store.** Everything else is polish.

**Total effort to go live: ~4 hours** (assuming Stripe and Printify accounts are created, and Printify order submission code is written).
