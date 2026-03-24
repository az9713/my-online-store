---
name: stripe-cli
description: >
  Complete guide for setting up and using the Stripe CLI in a Next.js / full-stack project.
  Covers installation, authentication, API key setup, webhook signing secrets, the .env vs
  .env.local confusion in Next.js, running stripe listen, stripe trigger, stripe events resend,
  and testing the full webhook → database pipeline without a browser.
  Use this skill whenever the user mentions Stripe CLI, stripe listen, stripe trigger,
  webhook testing, STRIPE_WEBHOOK_SECRET setup, Stripe env vars, or wants to test a payment
  pipeline from the terminal. Also use when the user is confused about which Stripe keys to
  use, why webhooks return 401 or 500, or why orders aren't appearing after checkout.
---

# Stripe CLI Skill

This skill encodes hard-won lessons from a real Next.js + Supabase + Stripe integration.
Read it fully before responding — the env var confusion section alone saves hours of debugging.

## Reference files

- `references/setup.md` — Installation, auth, API key setup, env var mapping
- `references/webhook-pipeline.md` — stripe listen, stripe trigger, full pipeline test
- `references/troubleshooting.md` — All errors encountered and their fixes

Always read the relevant reference file(s) before taking action.

## When to read which reference

| User's situation | Read |
|---|---|
| Installing CLI, getting keys, setting up .env | `setup.md` |
| Testing webhooks, running stripe listen/trigger | `webhook-pipeline.md` |
| Getting 401, 500, P1001, missing orders, wrong secret | `troubleshooting.md` |
| General Stripe CLI question | All three |

## The single most important thing

**`STRIPE_WEBHOOK_SECRET` has two completely different values:**

1. The **dashboard webhook secret** (`whsec_...` from Stripe Dashboard → Developers → Webhooks) — used in **production/Vercel**.
2. The **CLI webhook secret** (printed by `stripe listen` when it starts) — used for **local development**.

They are different strings. If `stripe listen` prints `whsec_8a3dab9f...`, that value must be in your `.env.local`. Putting the dashboard value in `.env.local` will cause all local webhook calls to fail with signature mismatch (HTTP 401 or 400).

## Quick command reference

```bash
# Install (Windows)
winget install Stripe.StripeCLI

# Check version / update
stripe --version
winget upgrade Stripe.StripeCLI

# Authenticate (one-time, opens browser)
stripe login

# See stored keys
stripe config --list

# Start webhook forwarder (keep running in separate terminal)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger a full checkout test (no browser needed)
stripe trigger checkout.session.completed

# Replay a missed webhook
stripe events resend evt_1TEZzWE...

# Query recent payments
stripe payment_intents list --limit 5

# Simulate payment failure
stripe trigger payment_intent.payment_failed
```
