# stripe-cli skill

A Claude Code skill that encodes all the hard-won lessons from setting up and using the Stripe CLI in a real Next.js + Supabase + Prisma project.

## What this skill does

When you ask Claude to help with anything Stripe CLI related, this skill gives Claude the full playbook:

- Installing and authenticating the Stripe CLI
- Understanding which API keys go in which env files
- The `.env` vs `.env.local` override confusion in Next.js (and how it causes silent failures)
- Setting up `stripe listen` to forward events to localhost
- Using `stripe trigger` to test the full webhook → database pipeline without opening a browser
- Replaying missed events with `stripe events resend`
- Debugging webhook failures (401, 400, 500, Prisma P1001)
- Implementing a webhook reconciliation fallback so missed events don't mean missed orders

## When Claude uses this skill

Claude reads this skill when you ask about:

- Stripe CLI commands (`stripe listen`, `stripe trigger`, `stripe events resend`)
- Setting up `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Why webhooks are returning 401 / 400 / 500
- Testing a payment pipeline without a browser
- Why orders aren't appearing after checkout
- Cart not clearing after payment
- The difference between the dashboard webhook secret and the CLI webhook secret
- `.env` vs `.env.local` confusion with Stripe keys

## File structure

```
stripe-cli/
├── SKILL.md                         # Main skill — loaded when skill triggers
├── README.md                        # This file
└── references/
    ├── setup.md                     # Installation, auth, API keys, env var mapping
    ├── webhook-pipeline.md          # stripe listen, stripe trigger, full pipeline test
    └── troubleshooting.md           # All errors and their fixes
```

## Key lessons encoded in this skill

### 1. The two webhook secrets

`STRIPE_WEBHOOK_SECRET` has two completely different values:

| Context | Value comes from | Use in |
|---|---|---|
| Local development | `stripe listen` terminal output | `.env.local` |
| Production | Stripe Dashboard → Developers → Webhooks | Vercel / production env vars |

Using the wrong one causes every webhook to fail silently with a signature mismatch error.

### 2. `.env` vs `.env.local` in Next.js

Next.js loads env files in priority order: `.env.local` > `.env.development` > `.env`

`.env.local` wins. If `STRIPE_WEBHOOK_SECRET` is in `.env` but not in `.env.local`, the webhook handler sees `undefined` and returns 500 on every call. The fix is to put the variable in `.env.local`.

### 3. Restart the dev server after env changes

`process.env` is read at startup, not live-reloaded. After editing `.env.local`, you must restart `npm run dev` for the new values to take effect.

### 4. stripe listen generates a new secret each session

Every time you stop and restart `stripe listen`, it prints a new `whsec_...` value. You must update `.env.local` with the new value and restart the dev server.

### 5. The full pipeline test (no browser required)

```bash
# Terminal 1: keep running
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 2: keep running
npm run dev

# Terminal 3: one-shot test
stripe trigger checkout.session.completed
```

If all events return `[200]`, the entire payment → database pipeline is working. No browser, no credit card, no checkout page.

### 6. Prisma P1001 with Supabase direct connection

The direct connection (port 5432) is occasionally unreachable from development environments. Fix: add `?connection_limit=5&connect_timeout=10` to `DATABASE_URL`. Switching to the pooler (port 6543) is not a straightforward fix — the pooler hostname is project-specific and the "Tenant or user not found" error appears when using the wrong region URL.

### 7. Webhook reconciliation as a belt-and-suspenders fix

Implement a reconciliation function on the order success page. When Stripe redirects to `/order/success?session_id=cs_test_...`, check if an order exists for that session in the database. If not, call `stripe.checkout.sessions.retrieve(sessionId)` directly and create the order from the response. This handles the case where the webhook was missed for any reason.

## Installation

This skill is installed locally in `.claude/skills/stripe-cli/`. Claude Code picks it up automatically from the project's `.claude/` directory.

To copy to the global skills directory (available in all projects):
```bash
cp -r .claude/skills/stripe-cli ~/.claude/skills/
```

## Stripe CLI coverage

This skill covers approximately 40–45% of the Stripe CLI's available commands — specifically the core local development workflow:

| Category | Coverage |
|---|---|
| Local dev tools (`listen`, `trigger`, `events resend`) | ~85% |
| Query tools (`list`, `retrieve`) | ~30% |
| Configuration (`login`, `config`) | ~80% |
| Advanced / rarely-used | ~10% |
| Stripe Terminal (hardware) | 0% |

The commands covered are the ones a developer uses every day during integration work.
