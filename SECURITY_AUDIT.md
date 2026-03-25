# Security Audit Report — Merch Storefront

**Audit Date:** 2026-03-24
**Stack:** Next.js 16 (App Router), Supabase Auth, Prisma/PostgreSQL, Stripe, Printify, Vercel
**Scope:** All API routes, webhooks, auth flows, frontend input handling, configuration

---

## How to Read This Report

Each finding includes:

- **What it is** — plain explanation of the problem
- **Where it is** — exact file and line number
- **Attack scenario** — a concrete example of how it could be exploited
- **How to fix it** — specific code you can drop in

Severity ratings run: **CRITICAL → HIGH → MEDIUM → LOW → INFO**

---

## Glossary

**Authentication**
Confirming who the caller is. "Is this request coming from a logged-in user, or a random person on the internet?"

**Authorization**
Deciding what a caller is allowed to do, even after you know who they are. A logged-in customer should not be able to trigger admin operations.

**CSRF (Cross-Site Request Forgery)**
A browser trick where a malicious website causes your browser to make a request to a different site — and your browser automatically includes that site's cookies. Example: you're logged into `yourstore.com`. You visit `evil.com`, which has a hidden form that submits to `yourstore.com/api/checkout`. Your browser sends the request with your cookies attached, and the store thinks it came from you.

**CSP (Content Security Policy)**
An HTTP response header that tells the browser which scripts, styles, and resources are allowed to run on your pages. Without one, any JavaScript that ends up on your page — from a compromised npm package, injected ad, or future bug — can do anything: read your cookies, redirect users, send data to an attacker's server.

**HSTS (HTTP Strict Transport Security)**
An HTTP header that instructs the browser to always connect to your site over HTTPS, never HTTP. Without it, a user's very first request could go over HTTP (before your server can redirect them to HTTPS), which an attacker on the same network can intercept.

**HMAC (Hash-based Message Authentication Code)**
A way to prove a message hasn't been tampered with. The sender and receiver share a secret key. The sender hashes the message with the key and sends the hash alongside the message. The receiver re-hashes the message with the same key — if the hashes match, the message is genuine.

**Injection**
When user-supplied input gets executed as code. The classic example is SQL injection: if you build a query by concatenating strings — `"SELECT * FROM users WHERE id = " + userId` — an attacker can set `userId` to `"1 OR 1=1"` and get all rows back. Prisma's parameterized queries prevent this, which is why this app has no SQL injection risk.

**Open Redirect**
When your site redirects users to a URL that comes from a query parameter, without checking where that URL actually goes. Attackers use this to craft links that look like they go to your legitimate domain but actually send users to a fake login page elsewhere.

**PII (Personally Identifiable Information)**
Any data that can identify a specific person: names, email addresses, shipping addresses, payment details. Storing more PII than you need, for longer than you need it, creates unnecessary risk and can create legal obligations under GDPR and CCPA.

**Rate Limiting**
Capping how many requests a single IP address (or user) can make within a time window. Without it, any route can be hammered — creating hundreds of Stripe checkout sessions, brute-forcing IDs, or flooding your database with writes.

**SameSite cookie attribute**
A cookie setting that controls whether the browser sends the cookie on cross-site requests.
- `strict` — never sent on cross-site requests
- `lax` — sent on top-level navigation (e.g. clicking a link), but not on cross-origin form submissions or API calls
- `none` — always sent (requires `secure` flag)

**Serverless / cold start**
On Vercel, each API route runs as an isolated function. There is no persistent server process. When the function hasn't been called recently, it starts fresh with empty memory. Any data stored in JavaScript module-level variables (like a `Map` or `Set`) is lost between these restarts and is never shared across multiple simultaneous instances.

**Webhook**
An HTTP POST request that a third-party service (Stripe, Printify) sends to your server when something happens — a payment completed, an order shipped. Because anyone could POST to your webhook URL, you need to verify the request actually came from the legitimate service, typically by checking a cryptographic signature on the request.

**XSS (Cross-Site Scripting)**
When attacker-controlled content is rendered as executable JavaScript in a user's browser. This can steal session tokens, impersonate the user, or silently redirect them. Avoided by never writing user-supplied data directly into the DOM as raw HTML.

**Zod**
A TypeScript library for validating data shapes at runtime. You define a schema describing exactly what your data should look like — field types, allowed ranges, string formats — and call `.parse()`. If the input doesn't match, it throws a descriptive error before the bad data reaches your database or business logic.

---

## CRITICAL

### C1 — Unauthenticated Admin Endpoint

**What it is:**
The Printify sync endpoint accepts POST requests from anyone with no authentication check whatsoever. No login required, no token, no secret — a completely open write endpoint.

**Where it is:**
`src/app/api/sync/printify/route.ts` — the entire `POST` handler (line 4) has no call to `getUser()`, no header check, nothing.

**Attack scenario:**
1. An attacker finds `/api/sync/printify` — easily discoverable by reading your JavaScript bundle or simply guessing common admin paths.
2. They write a script that POSTs to it thousands of times per minute.
3. Every single request executes `prisma.syncRun.create()` (line 8), filling your database with junk rows and consuming paid database compute.
4. Once the real Printify API integration is wired in, the same attack would fire hundreds of live Printify API calls — exhausting your quota, potentially creating garbage orders in Printify's system.

**How to fix it:**

Option A — Require a logged-in admin user (uses your existing Supabase auth):
```ts
// src/app/api/sync/printify/route.ts
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map(e => e.trim());
  if (!user || !ADMIN_EMAILS.includes(user.email!)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ... rest of handler
}
```
Add `ADMIN_EMAILS=you@yourdomain.com` to your `.env` and Vercel environment variables.

Option B — Shared secret header (better for CI/cron jobs that call this programmatically):
```ts
const apiKey = request.headers.get("x-api-key");
if (!apiKey || apiKey !== process.env.SYNC_API_KEY) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```
Generate a secret with `openssl rand -base64 32` and store it as `SYNC_API_KEY` in your environment variables.

---

## HIGH

### H1 — Rate Limiting Is Dead Code — Every Route Is Unthrottled

**What it is:**
A rate limiter was built and committed to the codebase, but zero routes actually use it. Every API endpoint accepts unlimited requests from any caller with no throttling.

**Where it is:**
- Rate limiter defined but unused: `src/lib/api/security.ts` lines 20–48
- No file in `src/app/api/` imports `rateLimit` at all

**Attack scenarios:**

*Stripe session abuse:* POST to `/api/checkout` in a tight loop. Each call creates a real Stripe Checkout session. At scale, Stripe charges per session and your DB takes a write every time.

*Product catalog scraping:* GET `/api/search?q=a`, `/api/search?q=b`, etc. with no throttle. An automated script can extract your entire catalog in seconds.

*Cart flooding:* POST to `/api/cart/items` thousands of times to bloat a single cart, causing every subsequent cart fetch to run a slow, large database query.

**How to fix it:**

The existing rate limiter (`security.ts`) **cannot work on Vercel** — see M5 for why. You need a Redis-backed solution. Upstash Redis has a free tier and a purpose-built rate limiting library:

Step 1 — Install:
```bash
npm install @upstash/ratelimit @upstash/redis
```

Step 2 — Replace the in-memory implementation in `src/lib/api/security.ts`:
```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Shared limiter instances — create one per policy
export const checkoutLimiter = new Ratelimit({
  redis: Redis.fromEnv(),               // reads UPSTASH_REDIS_REST_URL + TOKEN from env
  limiter: Ratelimit.slidingWindow(10, "60 s"),  // 10 requests per minute
  prefix: "rl:checkout",
});

export const apiLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(120, "60 s"), // 120 requests per minute
  prefix: "rl:api",
});
```

Step 3 — Wire it into sensitive routes. Example for checkout:
```ts
// src/app/api/checkout/route.ts
import { checkoutLimiter, rateLimitResponse } from "@/lib/api/security";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-real-ip") ?? "anonymous";
  const { success } = await checkoutLimiter.limit(ip);
  if (!success) return rateLimitResponse();

  // ... existing handler
}
```

Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to your Vercel environment variables (available free at upstash.com).

---

### H2 — Zod Validation Schemas Exist but Cart Routes Don't Use Them

**What it is:**
The codebase contains proper input validation schemas for the cart API (written in Zod). The actual route handlers ignore them and do loose manual checks instead, leaving gaps an attacker can exploit.

**Where it is:**
- Schemas that exist but aren't used: `src/lib/api/validation.ts` lines 1–22
- Error handler that exists but isn't used: `src/lib/api/errors.ts` lines 4–18
- Weak manual check in the add-to-cart route: `src/app/api/cart/items/route.ts` lines 9–13
- Weak manual check in the update route: `src/app/api/cart/items/[itemId]/route.ts`

**What the current manual checks miss:**

The add-to-cart route (line 7) does:
```ts
const { productId, variantId, quantity = 1 } = body;
if (!productId || !variantId) { ... }
```

Problems with this:
- `productId` and `variantId` are not checked to be valid UUIDs. Passing `"not-a-uuid"` or a 10,000-character string hits the database with a bad query before failing.
- `quantity` has no upper bound. A caller sending `{ quantity: 999999 }` causes the update on line 48 to do `existing.quantity + 999999`, which can exceed any reasonable cart limit and cause downstream display and order processing issues.
- `quantity` is not type-checked. Sending `{ quantity: "lots" }` or `{ quantity: true }` passes the check and reaches the database.

The Zod schema in `validation.ts` already handles all of this correctly — `quantity` is capped at 99, `productId` and `variantId` are validated as UUIDs. It just needs to be called.

**How to fix it:**

In `src/app/api/cart/items/route.ts`, replace the manual check:
```ts
// Before (manual, incomplete):
const { productId, variantId, quantity = 1 } = body;
if (!productId || !variantId) {
  return NextResponse.json({ error: ... }, { status: 400 });
}

// After (uses existing Zod schema):
import { addToCartSchema } from "@/lib/api/validation";
import { handleApiError } from "@/lib/api/errors";

let parsed;
try {
  parsed = addToCartSchema.parse(body);
} catch (error) {
  return handleApiError(error); // returns a clean 400 with field-level error messages
}
const { productId, variantId, quantity } = parsed;
```

Apply the same pattern to `src/app/api/cart/items/[itemId]/route.ts` using `updateCartItemSchema`.

---

### H3 — No Content Security Policy (CSP) Header

**What it is:**
Your site sends no Content Security Policy header. Without one, the browser applies no restrictions on what JavaScript is allowed to run on your pages. If any script is ever injected — from a compromised npm package, a vulnerable third-party widget, or a future bug — it can do anything a first-party script can do.

**Where it is:**
`next.config.ts` lines 16–28. You have several good security headers set here (X-Frame-Options, X-Content-Type-Options, etc.) but `Content-Security-Policy` is missing entirely.

**Why it matters for this app specifically:**
Your checkout flow does this in `src/app/cart/page.tsx` (line 173):
```ts
window.location.href = data.url; // redirects to Stripe
```
An injected script that runs before this line can intercept the Stripe URL and replace it with a phishing page URL. The user would be sent to a fake Stripe checkout that looks identical but captures their card number.

**How to fix it:**

Add to the headers array in `next.config.ts`. Start with `Report-Only` mode — the browser logs violations to the console but doesn't block anything, letting you check for false positives before enforcing:

```ts
// next.config.ts — inside the headers() array
{
  key: "Content-Security-Policy-Report-Only",
  value: [
    "default-src 'self'",
    "script-src 'self' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://images-api.printify.com https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com",
    "frame-src https://js.stripe.com",
  ].join("; "),
},
```

After running this in production for a week with no console violations, change `Content-Security-Policy-Report-Only` to `Content-Security-Policy` to start enforcing it.

---

### H4 — No HSTS Header

**What it is:**
Your site doesn't send a `Strict-Transport-Security` header. This means a user's browser has no built-in instruction to always use HTTPS. On a user's very first visit — or any visit after they clear their browser data — their browser may attempt an initial HTTP connection, which a network attacker (on the same Wi-Fi, corporate proxy, or at the ISP level) can intercept before your server gets a chance to redirect to HTTPS.

**Where it is:**
`next.config.ts` lines 16–28. Missing from the headers array.

**Note on Vercel:**
Vercel automatically redirects HTTP to HTTPS, but that redirect response itself travels over HTTP. HSTS moves the enforcement into the browser: after the first successful HTTPS visit, the browser remembers to never use HTTP again — so the interceptable HTTP redirect never happens on return visits.

**How to fix it:**

Add one entry to the headers array in `next.config.ts`:
```ts
{
  key: "Strict-Transport-Security",
  value: "max-age=63072000; includeSubDomains; preload"
}
```

`max-age=63072000` is two years in seconds — the standard recommendation. `includeSubDomains` applies the policy to all subdomains. `preload` makes you eligible for the browser HSTS preload list (https://hstspreload.org), which means browsers will know to use HTTPS even before your first response.

---

## MEDIUM

### M1 — Open Redirect in Auth Callback

**What it is:**
After a user clicks a Supabase magic link or completes OAuth, your callback route redirects them to wherever the `next` query parameter says. That parameter comes directly from the URL and is never validated — an attacker can set it to any destination.

**Where it is:**
`src/app/(auth)/callback/route.ts` lines 7 and 13:
```ts
const next = searchParams.get("next") ?? "/";
// ...
return NextResponse.redirect(`${origin}${next}`);
```

**Attack scenario:**
An attacker sends phishing emails that look like this:

> "Your order has shipped — click to view: `https://yourstore.com/auth/callback?code=abc123&next=//evil.com/fake-login`"

The link hostname is your legitimate domain. After Supabase processes the auth code, the user lands on `https://yourstore.com//evil.com/fake-login`. Because the path starts with `//`, most browsers treat this as a protocol-relative URL and interpret it as `https://evil.com/fake-login`. The fake page looks identical to your login page and steals the user's credentials.

**How to fix it:**

Validate that `next` is a plain relative path before using it:
```ts
// src/app/(auth)/callback/route.ts
const rawNext = searchParams.get("next") ?? "/";

// Only allow paths that start with a single /
// Reject anything that starts with // (protocol-relative) or http (absolute URL)
const next = rawNext.startsWith("/") && !rawNext.startsWith("//")
  ? rawNext
  : "/";

return NextResponse.redirect(`${origin}${next}`);
```

---

### M2 — Full Webhook Payloads Stored with Customer PII

**What it is:**
Every Stripe and Printify webhook event is saved to your database in full — including all the customer data inside the payload. Stripe's `checkout.session.completed` payload contains the customer's email, full name, and shipping address. This accumulates indefinitely with no expiry, no redaction, and no encryption.

**Where it is:**
- `src/app/api/webhooks/stripe/route.ts` lines 49–57: entire `event.data` object is stored as-is
- `src/app/api/webhooks/printify/route.ts` lines 71–79: entire parsed payload stored as-is
- `prisma/schema.prisma` line 138: `payload Json` — an unencrypted JSON column

**Why it matters:**
If your database is ever accessed by an unauthorized party — a leaked credential, a misconfigured Supabase Row Level Security policy, or a future bug — the attacker gets a complete history of every customer's name, email address, and shipping address from every order ever placed, including guests who never created an account.

From a legal standpoint, GDPR and CCPA both require that you only store personal data for as long as there's a legitimate reason to keep it. Storing full payment event payloads forever without a retention policy creates compliance exposure.

**How to fix it:**

Choose one or combine:

Option A — Strip PII before storing (store just the metadata you actually need for debugging):
```ts
// src/app/api/webhooks/stripe/route.ts
// Instead of: payload: event.data as unknown as Record<string, unknown>
payload: {
  id: event.id,
  type: event.type,
  amount_total: (event.data.object as any).amount_total,
  currency: (event.data.object as any).currency,
  // Never store: customer_details, shipping_details, customer_email
},
```

Option B — Add a scheduled database cleanup. In a Vercel cron job or Supabase scheduled function:
```sql
DELETE FROM "WebhookEvent"
WHERE "createdAt" < NOW() - INTERVAL '90 days';
```

Option C — Encrypt the payload column before inserting using a symmetric key stored in your environment variables. Add a utility function that encrypts before write and decrypts after read.

---

### M3 — Raw Error Messages Returned to API Callers

**What it is:**
Several routes catch an error and return its `.message` property directly in the HTTP response. Under normal conditions this is fine. But when something unexpected goes wrong — a database connection failure, a Stripe API error, a misconfigured environment — those error messages can contain internal details like table names, connection strings, file paths, or API endpoint structures.

**Where it is:**
- `src/app/api/checkout/route.ts` lines 52–55: Stripe error `.message` sent to client
- `src/app/api/sync/printify/route.ts` lines 59, 65–67: raw JS error message sent to client
- `src/app/api/products/[slug]/route.ts` line 17: user-supplied slug reflected back verbatim in the error response body

**The fix already exists in the codebase — it just isn't used:**

`src/lib/api/errors.ts` defines `handleApiError()`. It logs the full error to the server console (for your debugging) but returns only `"An unexpected error occurred"` to the client. No route imports it.

**How to fix it:**

In every route that has a `catch` block returning `error.message`, replace it:
```ts
// Before:
} catch (error) {
  const message = error instanceof Error ? error.message : "Checkout failed";
  return NextResponse.json({ error: { code: "CHECKOUT_FAILED", message } }, { status: 500 });
}

// After:
import { handleApiError } from "@/lib/api/errors";

} catch (error) {
  return handleApiError(error);
}
```

Files to update:
- `src/app/api/checkout/route.ts`
- `src/app/api/sync/printify/route.ts`
- `src/app/api/products/[slug]/route.ts`

---

### M4 — Weak, Human-Chosen Database Password

**What it is:**
The database connection string in `.env` uses the password `I_love_supabase_88`. While `.env` is correctly excluded from git, a human-memorable password is a significant risk if the file is ever exposed — accidentally committed, copied to a team member's machine, or included in a bug report.

**Where it is:**
`.env` lines 7–9 — `DATABASE_URL`, `DIRECT_URL`, and `CONNECTION_STRING` all use the same password.

**Why it matters:**
The same `.env` file also contains your `SUPABASE_SERVICE_ROLE_KEY`. That key bypasses Supabase's Row Level Security completely — it can read and write every row in every table with no restrictions. A single `.env` file leak gives an attacker full access to all customer data, all orders, and all auth records.

**How to fix it:**

1. Go to Supabase Dashboard → Project Settings → Database → Reset database password. Use the generated password (it will be random, not human-readable).
2. Go to Supabase Dashboard → Project Settings → API → Regenerate service role key.
3. Update `DATABASE_URL`, `DIRECT_URL`, `CONNECTION_STRING`, and `SUPABASE_SERVICE_ROLE_KEY` in both `.env` and `.env.local`.
4. Update the corresponding environment variables in your Vercel project dashboard (Settings → Environment Variables).
5. Redeploy.

Going forward, production secrets should live only in Vercel's environment variable vault — not in local `.env` files that could be accidentally shared.

---

### M5 — In-Memory Rate Limiter Can't Work on Vercel

**What it is:**
The rate limiter in `src/lib/api/security.ts` stores its request counts in a JavaScript `Map` in module memory. On Vercel's serverless infrastructure, this approach is broken by design: every function instance has its own isolated memory, there are multiple instances running in parallel, and each instance starts fresh after being idle for a few minutes.

**Where it is:**
`src/lib/api/security.ts` line 20:
```ts
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
```

**What actually happens at runtime:**

Imagine 3 parallel Vercel function instances handling requests. Each one has its own empty `Map`. A single attacker making 180 requests per minute could hit each instance 60 times and never exceed the per-instance limit, even if the limit is 60 requests/minute. The instances never communicate, so the global rate is never tracked.

Additionally, line 29 reads `x-forwarded-for` for the caller's IP address. This header can be forged by anyone sending requests directly to your Vercel URL (bypassing Cloudflare or similar), effectively allowing an attacker to supply any IP they want and never get rate limited.

**How to fix it:**
Replace with a Redis-backed solution as described in H1. Redis stores the counters externally, shared across all function instances. See the H1 fix for the full implementation. Also switch from `x-forwarded-for` to `x-real-ip`, which Vercel sets and callers cannot forge:

```ts
const ip = request.headers.get("x-real-ip") ?? "anonymous";
```

---

## LOW

### L1 — No CSRF Protection on Cart and Checkout Routes

**What it is:**
CSRF is when a malicious website causes your browser to make a request to your store's API, and your browser automatically includes your session cookies — making the store think the request came from you.

**Where it is:**
All state-changing routes: `POST /api/cart/items`, `PUT /api/cart/items/[id]`, `DELETE /api/cart/items/[id]`, `POST /api/checkout`

**Why the risk is currently limited:**
Your cart session cookie uses `sameSite: "lax"` (`src/lib/cart/session.ts` line 64). The `lax` setting prevents the cookie from being sent on cross-origin AJAX calls and form POSTs triggered by JavaScript. However, it does **not** prevent top-level form submissions — a standard HTML `<form method="POST">` on `evil.com` can still trigger a request to your API with the cookie attached.

The reason this doesn't cause major harm today: your routes expect `Content-Type: application/json` bodies, and a plain HTML form can only submit `application/x-www-form-urlencoded` or `multipart/form-data`. Your routes would fail to parse the body and reject the request. The attack surface is narrow but not zero.

**How to fix it:**

The simplest hardening for a JSON API is to require a custom request header. Browsers will not send custom headers on cross-origin requests without explicit CORS permission — and your site doesn't grant cross-origin CORS access. Add this to all state-changing routes:

```ts
// Server-side check (add to each route handler):
if (!request.headers.get("x-requested-with")) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

```ts
// Client-side (add to all fetch() calls in your frontend):
fetch("/api/cart/items", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",  // add this
  },
  body: JSON.stringify({ productId, variantId, quantity }),
});
```

---

### L2 — Anonymous Cart Merge Is Implemented but Never Called

**What it is:**
There's a complete, working function `mergeAnonymousCart()` in `src/lib/cart/session.ts` (lines 82–136) that is supposed to merge a guest user's cart into their account after they log in. It is never called anywhere. The result: users who add items to their cart before logging in silently lose their entire cart the moment they authenticate.

**Where it is:**
`src/lib/cart/session.ts` lines 82–136. There is no import of `mergeAnonymousCart` in any other file in the codebase.

**Why it matters beyond UX:**
Anonymous carts in the database (`Cart` rows with a `sessionId` but no `userId`) are never cleaned up through the normal merge-then-delete path. Over time, the `Cart` and `CartItem` tables accumulate stale rows from every anonymous browsing session that ever occurred, growing indefinitely.

**How to fix it:**

Call `mergeAnonymousCart()` in the auth callback immediately after a successful session exchange:

```ts
// src/app/(auth)/callback/route.ts
import { mergeAnonymousCart } from "@/lib/cart/session";

if (code) {
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) {
    // Merge any anonymous cart items into the user's account cart
    await mergeAnonymousCart().catch(() => {
      // Don't block the redirect if merge fails — log and continue
      console.error("Cart merge failed after login");
    });
    return NextResponse.redirect(`${origin}${next}`);
  }
}
```

---

### L3 — TypeScript Type Packages Listed as Production Dependencies

**What it is:**
`@types/node`, `@types/react`, `@types/react-dom`, and `@types/uuid` are listed under `dependencies` in `package.json` instead of `devDependencies`. These packages contain only TypeScript type declaration files (`.d.ts`). They contain zero runtime code, are only used by the TypeScript compiler during development and build, and should never be installed in a production environment.

**Where it is:**
`package.json` — `dependencies` section

**Impact:**
When someone runs `npm install --production` or when deployment environments install only production dependencies, these packages get pulled unnecessarily. They add to install time and package audit surface.

**How to fix it:**

Move them in `package.json`:
```json
{
  "devDependencies": {
    "@types/node": "^25.5.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@types/uuid": "^11.0.0"
  }
}
```
Then run `npm install` to update `package-lock.json`.

---

## INFO — What's Already Done Well

These areas were audited and found to be correctly implemented. They should be preserved as-is.

| Area | What was checked | Where |
|------|-----------------|-------|
| Stripe webhook verification | Uses `stripe.webhooks.constructEvent()` with the raw request body — the correct approach | `src/app/api/webhooks/stripe/route.ts:29` |
| Printify webhook HMAC | SHA-256 signature with `timingSafeEqual` (prevents timing attacks) | `src/lib/printify/verify-hmac.ts` |
| Database queries | All Prisma ORM — no raw SQL string concatenation anywhere, so no SQL injection surface | All files under `src/lib/`, `src/app/api/` |
| DOM injection | No `innerHTML`, `dangerouslySetInnerHTML`, or `eval()` anywhere in the frontend | All component files |
| Shell execution | No `child_process`, `exec()`, or shell command calls anywhere | Entire codebase |
| File uploads | No upload endpoints, no `multipart` parsing — no file-based attack surface | — |
| Cart session cookie | `httpOnly: true`, `secure: true` in production, `sameSite: "lax"` | `src/lib/cart/session.ts:61-67` |
| Secrets not in git | `.env` and `.env.local` are listed in `.gitignore` and confirmed not tracked | `.gitignore:27-28` |
| Security headers | X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy | `next.config.ts:16-28` |
| Error page in production | Stack traces are hidden in production; only a generic message is shown | `src/app/error.tsx:16-17` |
| Search query encoding | `encodeURIComponent()` applied before building search URLs | `src/components/layout/Header.tsx:18` |
| Remote image allowlist | Next.js image optimization only allows HTTPS sources from specific domains | `next.config.ts:4-14` |
| Webhook idempotency | Printify webhook handler checks whether an event ID was already processed before acting | `src/app/api/webhooks/printify/route.ts:57-68` |

---

## Summary Table

| # | Severity | Finding | File(s) |
|---|----------|---------|---------|
| C1 | **CRITICAL** | `/api/sync/printify` has no authentication — anyone can POST to it | `src/app/api/sync/printify/route.ts` |
| H1 | **HIGH** | Rate limiting code is never applied — all routes are unthrottled | `src/lib/api/security.ts`, all `/api/*` routes |
| H2 | **HIGH** | Zod validation schemas defined but cart routes use weaker manual checks | `src/lib/api/validation.ts`, `src/app/api/cart/items/route.ts` |
| H3 | **HIGH** | No Content Security Policy header configured | `next.config.ts` |
| H4 | **HIGH** | No HSTS header — first HTTP connection is interceptable | `next.config.ts` |
| M1 | **MEDIUM** | Open redirect via unvalidated `next` param in auth callback | `src/app/(auth)/callback/route.ts:7,13` |
| M2 | **MEDIUM** | Full webhook payloads including customer PII stored indefinitely | `src/app/api/webhooks/stripe/route.ts:49`, `prisma/schema.prisma:138` |
| M3 | **MEDIUM** | Raw internal error messages returned to API callers | `src/app/api/checkout/route.ts:52`, `src/app/api/sync/printify/route.ts:59` |
| M4 | **MEDIUM** | Database password is weak and human-chosen | `.env:7-9` |
| M5 | **MEDIUM** | In-memory rate limiter resets on every serverless cold start | `src/lib/api/security.ts:20` |
| L1 | **LOW** | No CSRF protection on cart and checkout mutations | `src/app/api/cart/*`, `src/app/api/checkout/route.ts` |
| L2 | **LOW** | `mergeAnonymousCart()` is fully implemented but never called | `src/lib/cart/session.ts:82` |
| L3 | **LOW** | `@types/*` packages listed under production dependencies | `package.json` |

---

## Recommended Fix Order

Ordered by risk reduced per effort required:

| Step | Fix | Estimated effort |
|------|-----|-----------------|
| 1 | Auth-gate `POST /api/sync/printify` | ~15 min |
| 2 | Add HSTS header to `next.config.ts` | ~5 min |
| 3 | Add CSP header to `next.config.ts` (report-only first) | ~30 min |
| 4 | Fix open redirect in auth callback — validate `next` param | ~5 min |
| 5 | Wire `handleApiError()` into all catch blocks | ~30 min |
| 6 | Wire Zod validation into cart routes | ~30 min |
| 7 | Replace in-memory rate limiter with Upstash Redis and wire it | ~2 hours |
| 8 | Strip PII from webhook payloads before storing | ~1 hour |
| 9 | Rotate database password and service role key | ~20 min |
| 10 | Wire `mergeAnonymousCart()` in auth callback | ~30 min |
| 11 | Add CSRF header check to cart/checkout routes | ~30 min |
| 12 | Move `@types/*` to `devDependencies` | ~5 min |
