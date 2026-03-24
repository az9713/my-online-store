# Stripe CLI Setup Reference

## 1. Installation

### Windows (WinGet)
```bash
winget install Stripe.StripeCLI
```

Verify:
```bash
stripe --version
# stripe version 1.38.2
```

Update to latest:
```bash
winget upgrade Stripe.StripeCLI
```

### macOS
```bash
brew install stripe/stripe-cli/stripe
```

### Linux
Download the latest `.deb` / `.rpm` / `.tar.gz` from GitHub releases.

---

## 2. Authentication

Run once per machine:
```bash
stripe login
```

This opens a browser, asks you to log in to your Stripe account, and stores a restricted API key locally. You never need to pass an API key on the command line after this.

After login:
```bash
stripe config --list
# Shows your stored keys for test and live modes
```

**Important:** `stripe login` stores keys for the Stripe account you log in to. If you have multiple Stripe accounts (personal + client), use `stripe config --list` and `stripe login --reuse-api-key` to manage them.

---

## 3. API keys — which key goes where

Stripe gives you four keys per account. Here is exactly what each one does and where it belongs:

| Key | Prefix | Where it lives | Used by |
|---|---|---|---|
| Secret key (test) | `sk_test_...` | `.env` / `.env.local` (server-only) | Server-side API calls (create checkout session, retrieve session) |
| Publishable key (test) | `pk_test_...` | `.env` / `.env.local` as `NEXT_PUBLIC_...` | Client-side JS (Stripe.js, loadStripe()) |
| Webhook signing secret (dashboard) | `whsec_...` | Vercel env vars / production `.env` | Production webhook verification |
| Webhook signing secret (CLI) | `whsec_...` | `.env.local` only | Local webhook verification via `stripe listen` |

### Where to find the keys

**Secret and publishable keys:**
Go to [https://dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys).
Make sure you're on the **Test** tab (toggle at top of dashboard).

**CLI-generated webhook secret:**
This is printed every time you run `stripe listen`. Copy it from the terminal output:
```
> Ready! Webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

This value changes each time you run `stripe listen`. Copy the fresh value into `.env.local`.

**Dashboard webhook secret (for production):**
Only relevant when you have a deployed URL. Go to Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret.

---

## 4. Environment variable setup for Next.js

### The .env vs .env.local confusion

Next.js loads environment files in this priority order (highest wins):
```
.env.local          ← highest priority, ALWAYS takes precedence
.env.development    ← only in dev
.env                ← lowest priority baseline
.env.example        ← never loaded, just a template
```

**The bug this causes:** If `STRIPE_WEBHOOK_SECRET` is set in `.env` but NOT in `.env.local`, and `.env.local` exists (which it usually does), Next.js uses `.env.local` for everything else and ignores the `.env` value. The webhook handler reads `process.env.STRIPE_WEBHOOK_SECRET` and gets `undefined`. Result: every webhook returns 500 or 400.

**Fix:** Put `STRIPE_WEBHOOK_SECRET` in **both** `.env` and `.env.local`, or only in `.env.local`.

### Complete `.env.local` for local development

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Database
DATABASE_URL=postgresql://postgres:PASSWORD@db.your-project.supabase.co:5432/postgres?connection_limit=5&connect_timeout=10
DIRECT_URL=postgresql://postgres:PASSWORD@db.your-project.supabase.co:5432/postgres

# Stripe — SECRET key, never expose to client
STRIPE_SECRET_KEY=sk_test_51...

# Stripe — PUBLISHABLE key, safe for client
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...

# Stripe — WEBHOOK SECRET from `stripe listen` output (not from dashboard)
STRIPE_WEBHOOK_SECRET=whsec_8a3dab9f...
```

### Why the CLI webhook secret is different from the dashboard secret

- The **dashboard secret** authenticates webhooks coming from Stripe's production servers to your deployed URL.
- The **CLI secret** authenticates webhooks coming from the `stripe listen` process on your laptop to `localhost`.

They are separate signing keys. Using the dashboard secret locally will make every local test fail. Using the CLI secret in production will make every real payment fail.

---

## 5. Setting up the webhook handler

Your webhook endpoint must:
1. Read the **raw** request body (not parsed JSON — Stripe's signature covers the raw bytes)
2. Read the `Stripe-Signature` header
3. Call `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`
4. Return HTTP 200 after processing

```typescript
// src/app/api/webhooks/stripe/route.ts
import Stripe from 'stripe';

export async function POST(req: Request) {
  const body = await req.text(); // RAW body — do not use req.json()
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return new Response('Missing signature or secret', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${err}`, { status: 400 });
  }

  // Process event...
  return new Response('OK', { status: 200 });
}
```

**Critical:** Use `req.text()` not `req.json()`. Body parsers modify the raw bytes, breaking HMAC verification.
