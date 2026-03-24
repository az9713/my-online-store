# Stripe CLI Troubleshooting Reference

All errors encountered during a real Next.js + Supabase + Stripe integration, with root causes and fixes.

---

## Error 1: Webhook returns 500, "Missing stripe secret"

**Symptom:**
```
<-- [500] POST /api/webhooks/stripe [evt_...]
```
Server logs show: `process.env.STRIPE_WEBHOOK_SECRET is undefined`

**Root cause:**
`STRIPE_WEBHOOK_SECRET` is set in `.env` but not in `.env.local`. Next.js loads `.env.local` first and it overrides `.env` — so the variable is never seen.

**Fix:**
Add `STRIPE_WEBHOOK_SECRET` to `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_8a3dab9f...  # from stripe listen output
```

**Important:** The value must be the `whsec_...` printed by `stripe listen`, not the webhook secret from the Stripe dashboard.

---

## Error 2: Webhook returns 400, "No signatures found matching the expected signature"

**Symptom:**
```
<-- [400] POST /api/webhooks/stripe [evt_...]
```
Server logs: `Webhook signature verification failed`

**Root causes (in order of likelihood):**

1. **Wrong secret value** — You used the Stripe dashboard webhook secret instead of the `stripe listen` CLI secret. These are different strings.
   - Fix: Copy the `whsec_...` from the `stripe listen` terminal output and put that in `.env.local`.

2. **Body was parsed before verification** — The webhook handler called `req.json()` instead of `req.text()`. Body parsing modifies the raw bytes, breaking the HMAC check.
   - Fix: Use `const body = await req.text()` (raw string), never `req.json()`.

3. **Stale CLI secret** — You stopped and restarted `stripe listen`. The CLI generates a new signing secret each session.
   - Fix: Copy the new `whsec_...` from the new `stripe listen` session and update `.env.local`, then restart the dev server (`npm run dev`) so it picks up the new value.

---

## Error 3: Webhook returns 500, Prisma P1001 "Can't reach database server"

**Symptom:**
```
<-- [500] POST /api/webhooks/stripe [evt_...]
```
Server logs: `PrismaClientInitializationError: Can't reach database server at db.xxx.supabase.co:5432`

**Root cause:**
Supabase's direct connection (port 5432) has intermittent connectivity issues, especially in development with many short-lived connections.

**Fix:**
Add connection parameters to `DATABASE_URL`:
```bash
DATABASE_URL=postgresql://postgres:PASSWORD@db.your-project.supabase.co:5432/postgres?connection_limit=5&connect_timeout=10
```

- `connection_limit=5` — prevents opening too many parallel connections
- `connect_timeout=10` — fails fast instead of hanging for 30+ seconds

**Alternative attempted (failed):**
Switching to the Supabase Transaction Pooler (port 6543) caused "Tenant or user not found" errors regardless of region tried (`aws-0-us-east-1.pooler.supabase.com`, `aws-0-eu-central-1`, etc.). The correct pooler hostname is project-specific and hard to determine. Stick with the direct connection + timeout params.

**Recovery:**
If you get P1001 once, wait 10–30 seconds and retry. It is usually intermittent. Do not re-architect around a single transient failure.

---

## Error 4: Orders not appearing in order history after checkout

**Symptom:**
Payment succeeded (Stripe shows it as paid), user redirected to `/order/success`, but `/account/orders` is empty.

**Root causes:**

1. **Webhook was missed** — `stripe listen` disconnected briefly right when `checkout.session.completed` was sent, or the dev server was restarting.

2. **Webhook handler threw an error** — Handler returned 5xx (see Errors 1–3 above) so the order was never created.

**Fix 1 (immediate):** Replay the missed event:
```bash
# Get the event ID from stripe listen output or Stripe Dashboard → Events
stripe events resend evt_1TEZzWE...
```

**Fix 2 (permanent code fix):** Implement order reconciliation on the success page. When Stripe redirects to `/order/success?session_id=cs_test_...`, check if an order exists for that session. If not, call `stripe.checkout.sessions.retrieve(sessionId)` directly and create the order from the response. See `webhook-pipeline.md` for the full reconciliation code pattern.

---

## Error 5: Cart not clearing after checkout

**Symptom:**
Cart still shows items after successful payment. The order was created but the cart items remain.

**Root cause:**
Same as Error 4 — webhook was missed. The cart-clearing logic runs inside the `checkout.session.completed` handler. If the event was never processed, the cart never clears.

**Fix:**
The order reconciliation function (Error 4, Fix 2) should also clear the cart. Make sure the reconciliation function deletes `CartItem` rows and updates `Cart.status` to `"converted"` — the same logic the webhook handler runs.

---

## Error 6: stripe trigger returns 500 for all events

**Symptom:**
All events from `stripe trigger` return 500, even `product.created` which has no database writes.

**Root cause:**
The webhook handler has an unhandled exception at the top level — before it even processes the event. Common causes:
- `STRIPE_WEBHOOK_SECRET` is undefined → crash at `constructEvent`
- Dev server hasn't restarted since `.env.local` was modified

**Fix:**
1. Restart the dev server: `Ctrl+C` then `npm run dev`
2. Verify `STRIPE_WEBHOOK_SECRET` is in `.env.local` and matches the current `stripe listen` session output

---

## Error 7: `sed` command corrupts .env files on Windows

**Symptom:**
Running `sed -i 's/old/new/' .env.local` on Windows (Git Bash / MSYS2) produces lines that are concatenated or malformed. File becomes unparseable.

**Root cause:**
Windows uses CRLF (`\r\n`) line endings. `sed -i` on Git Bash handles them differently from Linux `sed`, causing lines to bleed together.

**Fix:**
Never use `sed` to edit `.env` files on Windows. Use an editor (VS Code, Notepad++) or the Claude Code `Edit` tool which handles CRLF correctly.

---

## Error 8: "Unable to add remote origin" when pushing to GitHub

**Symptom:**
```
gh repo create username/my-store --public --source=. --remote=origin --push
error: Unable to add remote origin: remote origin already exists.
```

**Root cause:**
`git remote add origin ...` was already run. `gh repo create --remote=origin` tries to add the remote again.

**Fix:**
Just push directly:
```bash
git push -u origin main
```

---

## Error 9: stripe config --list shows different keys than Stripe Dashboard

**Symptom:**
`stripe config --list` shows a key starting with `sk_test_...` but the Stripe Dashboard shows a different `sk_test_...` key.

**Root cause:**
The CLI stores a **restricted** API key that it created internally during `stripe login`. The Dashboard shows your actual secret key. Both are valid for test mode. They belong to the same account.

**Which to use:**
- `STRIPE_SECRET_KEY` in `.env`: use the key from the **Stripe Dashboard** (Developers → API keys → Secret key). This is the standard secret key you have full control over.
- The CLI uses its own stored key internally — you never need to copy it manually.

---

## General debugging checklist for webhook issues

When `stripe listen` shows anything other than `[200]`:

1. Is `STRIPE_WEBHOOK_SECRET` in `.env.local`? (Not just `.env`)
2. Does the value in `.env.local` match what `stripe listen` printed THIS session?
3. Did you restart `npm run dev` after editing `.env.local`? (Required for env changes to take effect)
4. Does the webhook handler use `req.text()` not `req.json()`?
5. Is the dev server actually running on the port in `--forward-to localhost:3000/...`?
6. Is there a Prisma/database error in the Next.js console? (Check the `npm run dev` terminal, not the `stripe listen` terminal)
