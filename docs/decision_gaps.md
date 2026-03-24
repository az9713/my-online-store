# Decision Gaps — What We Need to Resolve Before Building

This document explains the technical decisions that the spec leaves open. Each section describes **what the gap is**, **why it matters**, **what the choices are**, and **what I'd recommend** for a small merch storefront.

Think of this like buying a house — the spec describes the floor plan, but we still need to pick the plumbing, electrical, and foundation. Bad choices here don't show up immediately but cause expensive rework later.

---

## Gap 1: Database — Where does data live?

### What this means

Every app needs somewhere to store data permanently. When a shopper adds something to their cart, when Printify sends a webhook saying "order shipped," when a product gets created — that information needs to survive server restarts, deployments, and crashes.

A **database** is that permanent storage. An **ORM** (Object-Relational Mapper) is a library that lets your code talk to the database using TypeScript instead of raw SQL queries.

### Why this matters now

The spec defines 7 data models (products, variants, carts, cart items, orders, webhook events, sync runs). Without choosing a database, we can't write any of the backend code that stores or retrieves this data. Every epic from EP-006 onward touches the database.

### The choices

#### Option A: PostgreSQL + Prisma

**PostgreSQL** is the most popular production database for web apps. It's powerful, reliable, and handles complex queries well.

**Prisma** is the most popular TypeScript ORM. You define your data models in a schema file, and Prisma generates type-safe code to query the database.

```
You write:  const product = await prisma.product.findUnique({ where: { slug: "cool-hat" } })
Prisma does: SELECT * FROM products WHERE slug = 'cool-hat'
You get:    A fully typed TypeScript object
```

**Pros:**
- Industry standard. If you Google any problem, there are answers.
- Prisma has excellent TypeScript integration — your IDE autocompletes database queries.
- Scales to millions of rows without breaking a sweat.
- Vercel has good Postgres hosting options (Neon, Supabase, or standalone).

**Cons:**
- Requires a hosted database (not just files on disk). You need a database URL — a connection string like `postgresql://user:pass@host:5432/dbname`.
- Slightly more setup than simpler options.
- Free tiers exist but have limits.

**Cost:** Free tier on Neon or Supabase covers a small storefront easily. You'd only pay at scale.

#### Option B: SQLite + Drizzle

**SQLite** is a database that lives in a single file on disk. No separate server needed.

**Drizzle** is a newer, lighter ORM that's closer to raw SQL but still type-safe.

**Pros:**
- Zero infrastructure. The database is literally a file in your project.
- Extremely fast for small datasets.
- No connection strings, no hosted database, no cost.
- Great for prototyping and small apps.

**Cons:**
- Doesn't work well on Vercel's serverless architecture. Vercel functions are stateless — they spin up and die — so a file-based database loses data between requests unless you use a service like Turso (hosted SQLite).
- Single-writer limitation: only one process can write at a time. Fine for small traffic, breaks under load.
- Less ecosystem support than Postgres.

**Cost:** Free locally. Turso (hosted SQLite) has a generous free tier.

#### Option C: No database — just API calls

Skip local storage entirely. Fetch products from Printify/Shopify APIs on every request. Store cart in the browser (localStorage or cookies).

**Pros:**
- Simplest architecture. No database to manage.
- Products are always up-to-date with the source.

**Cons:**
- Slow. Every page load hits an external API. If Printify is slow, your store is slow.
- Fragile. If Printify's API goes down, your store goes down.
- Can't store orders, webhook events, or sync state locally — the entire backend layer (EP-016) becomes impossible.
- Cart disappears if user clears cookies.

**Not recommended** for this project because the spec requires webhook storage and order sync.

### Why PostgreSQL specifically?

You need *some* database because the spec requires storing products, carts, orders, webhook events, and sync history. PostgreSQL over MySQL or SQLite because:

1. **Vercel's ecosystem assumes it.** Vercel's docs, templates, and first-party database integrations all default to Postgres. Swimming with the current, not against it.
2. **Native JSON support.** The spec has fields like `payloadJson`, `tagsJson`, `optionValuesJson`. Postgres has native JSON columns with indexing. MySQL's JSON support is weaker. SQLite's is minimal.
3. **Industry default for web apps.** Same reason you'd pick `gcc` for C or `javac` for Java — it's what everyone uses, so help is easy to find.

### Why Prisma (the ORM)? Do we even need it?

**You don't *need* an ORM.** Many production apps use raw SQL. Prisma is a convenience layer, not a requirement. But it solves three problems:

**Problem 1: SQL strings have no type checking.**

```typescript
// Raw SQL — typo in column name, no error until runtime
const result = await sql`SELECT * FROM prodcts WHERE slg = 'cool-hat'`
//                                      ^^^^^^         ^^^
//                                      typos — compiles fine, crashes at runtime
```

```typescript
// Prisma — typo caught by TypeScript before you run anything
const result = await prisma.prodct.findUnique({ where: { slg: 'cool-hat' } })
//                          ^^^^^^                        ^^^
//                          red squiggly line in your editor immediately
```

For someone from C/Java/C++, this is like the difference between calling a function through a typed interface vs. through a `void*` pointer. Prisma gives you the compiler checks back.

**Problem 2: Mapping database rows to objects is tedious.**

```typescript
// Raw SQL — you get untyped rows, must map manually
const row = await sql`SELECT id, slug, title, base_price FROM products WHERE slug = $1`
const product = {
  id: row[0].id,
  slug: row[0].slug,
  title: row[0].title,
  basePrice: row[0].base_price,  // column name doesn't match TypeScript convention
}
```

```typescript
// Prisma — returns typed objects matching your model
const product = await prisma.product.findUnique({ where: { slug: 'cool-hat' } })
// product.basePrice just works — Prisma handles the naming convention mapping
```

**Problem 3: Schema migrations.**

When you add a field to the Product model, you also need to `ALTER TABLE` in the database. Prisma tracks these changes and generates migration SQL automatically. Without it, you're writing `ALTER TABLE` statements by hand and hoping every environment (dev, staging, production) stays in sync.

**The alternative:** If the ORM feels like unnecessary magic, **Drizzle** is lighter — it feels more like writing SQL with type checking bolted on, less like a magic layer hiding the database.

### Database hosting: Neon vs. Supabase

Both are cloud-hosted PostgreSQL services. The database engine (Postgres) is identical. The difference is what comes with it.

**Neon** = a PostgreSQL server. That's it. You get a database and a connection string. Nothing else.

**Supabase** = a PostgreSQL server **plus** a bunch of extras:
- Built-in auth (user signup/login)
- File storage (images, uploads)
- Realtime subscriptions (live updates)
- Auto-generated REST API (it creates endpoints from your tables automatically)
- A web dashboard to browse/edit your data visually

Think of Neon as buying a bare engine. Supabase is buying the engine with a dashboard, GPS, and sound system pre-installed.

#### Why Neon might be better

Since we're using Prisma as our ORM and building our own API routes, most of Supabase's extras go unused:

- Auth? We chose anonymous sessions — don't need it.
- Auto-generated API? We're writing our own endpoints — don't need it.
- Realtime? Not in the spec — don't need it.
- File storage? Product images likely come from Printify/Shopify CDNs — don't need it.

With Neon, there's no confusion. Neon is a database. Prisma talks to it. That's the whole story. Simplest mental model.

#### Why Supabase might be better

**The dashboard is genuinely useful.** Supabase gives you a web UI where you can browse tables, run queries, see data, edit rows manually. During development, this is extremely handy — you can check "did that webhook actually save?" by looking at the table in your browser instead of writing SQL. Neon has a SQL console but it's bare-bones by comparison.

**You might want the extras later.** If EP-018 (Shopify) eventually needs user accounts, Supabase auth is already there. If you want to store product images locally, Supabase storage is there. You wouldn't add new services — just turn on features you already have.

**Better for beginners.** Supabase's dashboard makes it much easier to understand what's happening in your database when you're learning. More tutorials, YouTube videos, and beginner-friendly docs exist for the "Next.js + Supabase" combination than almost any other stack.

#### The philosophical tension with Supabase + Prisma

Supabase *wants* to be your backend — it generates APIs, manages auth, handles data. Prisma *also* wants to be your data layer. Using both means two tools competing for the same job:

```
Without Prisma:  Your code → Supabase client → Supabase's auto-API → PostgreSQL
With Prisma:     Your code → Prisma client → direct connection → PostgreSQL
                              (Supabase's auto-API sits there unused)
```

This is fine — you're just using Supabase as a dumb Postgres host. But you carry the mental overhead of "Supabase can do X, should I use Supabase's version or Prisma's version?" every time you add a feature.

#### Decision guide

| If you... | Pick |
|---|---|
| Want the simplest mental model (database is just a database) | Neon |
| Want a visual dashboard to browse data while learning | Supabase |
| Might want auth/storage/realtime later | Supabase |
| Want zero unused features in your stack | Neon |
| Are following YouTube tutorials (most use Supabase) | Supabase |

### My recommendation

**PostgreSQL + Prisma + Supabase** for this project.

Why: For someone new to this ecosystem, Supabase's visual dashboard is genuinely valuable during development and learning. The unused features don't hurt — they just sit there. The database itself is standard Postgres, so if you ever want to switch to Neon or self-hosted, you change one connection string and everything else stays the same. Prisma talks to Postgres regardless of who hosts it.

If you later find the Supabase extras confusing or want a cleaner setup, switching to Neon is a 5-minute change (update one environment variable).

---

## Gap 2: Product Data Source — Where do products come from?

### What this means

The storefront shows products — t-shirts, hoodies, hats, whatever. But where does that product information (title, price, images, variants) originate? Someone or something needs to create and manage the catalog.

This is different from the database question. The database is *where you store* data. This question is *where data enters the system in the first place*.

### Why this matters now

If we build the storefront without knowing the product source, we'll either:
- Build with fake/seed data and have to rip it out later, or
- Build the wrong data fetching layer and rewrite it when the real source is connected.

### The choices

#### Option A: Printify is the product source

Products are created and managed in Printify's dashboard. Your app fetches them via Printify's API and caches them locally in your database.

**How it works:**
1. You design a t-shirt in Printify's web dashboard.
2. Your app calls Printify's API to fetch the catalog.
3. Products are saved to your local database.
4. The storefront reads from the local database (fast).
5. A sync job periodically refreshes from Printify.

**Pros:**
- Printify is already integrated (EP-016). This extends that integration.
- Single source of truth for merch — you manage products where you manage fulfillment.
- The webhook handler can update local product data when things change in Printify.

**Cons:**
- Printify's API may not expose everything you want (custom descriptions, featured flags, etc.).
- You're dependent on Printify for catalog management — no Printify account, no products.

#### Option B: Shopify is the product source

Products are managed in Shopify's admin. Your app fetches them via Shopify's Storefront API.

**How it works:**
1. You add products in Shopify's admin dashboard.
2. Your app uses Shopify's Storefront API (GraphQL) to fetch products.
3. Products can be cached locally or fetched on demand.
4. Shopify handles inventory, pricing, and variants.

**Pros:**
- Shopify has a world-class product management UI.
- The Storefront API is designed for exactly this use case (headless storefronts).
- Aligns with EP-018 (Shopify Enablement).

**Cons:**
- Requires a Shopify store/account (paid, starts at ~$39/month for basic plan, or free with a development store).
- Adds Shopify as a hard dependency from day one.
- The spec suggests Shopify is being *enabled* (EP-018), not that it's the foundation — which implies the app already works without it.

#### Option C: Local/seed data — you manage products in your own database

Products are created directly in your database. Maybe through a simple admin page, or a seed script, or a JSON file that gets imported.

**How it works:**
1. You define products in a seed file or simple admin interface.
2. They're stored directly in your Postgres database.
3. The storefront reads from the database.
4. Later, Printify sync and Shopify can *enrich* or *replace* these products.

**Pros:**
- No external dependencies. The app works standalone.
- You control everything: descriptions, images, featured flags, pricing.
- Makes development easy — you can build the entire storefront before connecting any external service.
- The spec's domain model supports this with `commerceProvider: "native"`.

**Cons:**
- You need some way to manage products (admin UI or seed scripts).
- Products won't automatically sync with Printify/Shopify until those integrations are built.

#### Option D: Hybrid — local as default, with sync from providers

Start with local seed data. Build a sync mechanism that pulls products from Printify and/or Shopify into the same local database. The storefront always reads from the local database, regardless of where the product originated.

**How it works:**
1. Products table has a `commerceProvider` field ("native", "printify", "shopify").
2. Native products are created manually/via seed.
3. Printify sync (EP-016) imports products from Printify into the same table.
4. Shopify sync (EP-018) does the same for Shopify.
5. The storefront doesn't care where the product came from — it reads from one table.

**Pros:**
- Matches the spec's domain model exactly (the `commerceProvider` field exists for this reason).
- Decouples the storefront from any single provider.
- Development works immediately with seed data.
- Each integration epic adds a new sync source without rewriting the storefront.

**Cons:**
- Most complex to build correctly (sync conflicts, stale data, which source wins).
- Need to handle the case where the same product exists in multiple providers.

### My recommendation

**Option D: Hybrid with local as default.**

Why: The spec's domain model already has `commerceProvider` fields. The build order starts with the storefront shell (EP-001–005) before any integrations (EP-016, EP-018). Starting with local/seed data means we can build and test the entire storefront immediately, then layer on Printify and Shopify sync as their epics arrive.

For initial development, we'd use a **seed script** that populates the database with ~10 sample products. No admin UI needed yet.

---

## Gap 3: Cart Architecture — Client-side or server-side?

### What this means

When a shopper adds a product to their cart, where does that cart live?

- **Client-side:** The cart data is stored in the shopper's browser (localStorage or a cookie). The server never knows about the cart until checkout.
- **Server-side:** The cart data is stored in the database, linked to a session ID stored in a cookie. The server always knows what's in every cart.

### Why this matters now

Cart is a core flow (EP-005). The Shopify enablement (EP-018) explicitly changes cart components and data layer. If we pick client-side now and Shopify needs server-side, we rewrite everything.

### The choices

#### Option A: Client-side cart (localStorage)

Cart data lives entirely in the browser. A JavaScript object gets saved to `localStorage` after every change.

```
localStorage: {
  "cart": [
    { "productId": "abc", "variantId": "def", "quantity": 2, "price": 29.99 }
  ]
}
```

**Pros:**
- Dead simple. No database queries for cart operations.
- Instant. No network requests to add/remove items.
- No session management needed.
- Works offline.

**Cons:**
- Cart disappears if user clears browser data, switches devices, or uses incognito.
- Prices are stored client-side — a savvy user could theoretically manipulate them (you'd validate at checkout, but it's messy).
- Shopify's cart API is server-side. If EP-018 needs to sync with Shopify's cart, client-side is the wrong foundation.
- No analytics on abandoned carts (the server never sees them).
- The spec's Cart and CartItem database models become pointless.

#### Option B: Server-side cart (database-backed)

Cart data lives in the database. The browser holds only a session ID (in a cookie). Every cart operation is an API call.

```
Cookie: session_id=abc123
Database: Cart { id: "cart_1", sessionId: "abc123", items: [...] }
```

**Pros:**
- Carts survive across devices/browsers if the session persists.
- Prices are always server-validated — no client-side manipulation.
- Shopify cart sync (EP-018) works naturally — server can sync with Shopify's cart API.
- The spec's Cart/CartItem models are used as intended.
- Abandoned cart tracking is possible.

**Cons:**
- More complex. Every "add to cart" is a network request.
- Needs session management (generating session IDs, cookie handling).
- Slightly slower for the user (network round-trips vs instant localStorage).

#### Option C: Hybrid — client-side with server sync

Cart lives in the browser for speed, but syncs to the server periodically or at key moments (page load, pre-checkout).

**Pros:**
- Fast for the user (local-first).
- Server still knows about carts for analytics/sync.

**Cons:**
- Most complex to build. Conflict resolution between client and server state.
- Two sources of truth is a recipe for bugs.
- Overkill for a small storefront.

### My recommendation

**Option B: Server-side cart.**

Why: The spec defines Cart and CartItem as database models. EP-018 (Shopify) will need server-side cart sync. A server-side cart is slightly more work upfront but prevents a rewrite at EP-018. For a small storefront, the "slowness" of network requests is imperceptible (we're talking 50–100ms, not seconds).

Session management is straightforward: generate a UUID, store it in an httpOnly cookie, use it to look up the cart in the database.

---

## Gap 4: Checkout Flow — What happens when the user clicks "Checkout"?

### What this means

The cart page has items in it. The user wants to buy them. What happens next?

This seems like it should be in the spec, but it's conspicuously absent. The spec mentions "continue to checkout or checkout handoff" without defining what either means.

### Why this matters

Checkout involves **payment processing** — credit cards, fraud detection, tax calculation, shipping rates. This is the single most complex and legally sensitive part of any commerce app. Getting it wrong can mean lost money, chargebacks, or compliance issues.

### The choices

#### Option A: External checkout handoff to Shopify

When the user clicks "Checkout," redirect them to Shopify's hosted checkout page. Shopify handles payment, tax, shipping, and order creation. Your app never touches payment data.

**How it works:**
1. User clicks "Checkout" on your cart page.
2. Your server creates a Shopify checkout with the cart items via Shopify's API.
3. Shopify returns a checkout URL.
4. User is redirected to `checkout.shopify.com/...`.
5. After payment, Shopify redirects back to your "thank you" page.
6. Shopify sends a webhook to confirm the order.

**Pros:**
- You never handle payment data. No PCI compliance burden.
- Shopify handles tax, shipping rates, fraud detection, multiple currencies.
- Legally and financially the safest option.
- Aligns with EP-018 (Shopify Enablement).

**Cons:**
- User leaves your site during checkout (jarring UX, but standard for small stores).
- Requires a Shopify account.
- You lose control over the checkout experience.

#### Option B: External checkout handoff to Printify

Similar concept, but using Printify's checkout flow (if available).

**Pros/Cons:** Similar to Shopify, but Printify's checkout capabilities are more limited. Printify is primarily a fulfillment service, not a storefront platform.

**Not recommended** as the primary checkout path. Printify is better suited as a fulfillment backend, not a checkout frontend.

#### Option C: Build your own checkout with Stripe

Integrate Stripe directly. Build a checkout page with address forms, payment inputs, and order confirmation. Use Stripe's APIs to process payments.

**Pros:**
- Full control over the checkout experience.
- User stays on your site.
- Stripe handles the actual card processing (you still avoid touching raw card numbers).

**Cons:**
- Significant additional engineering work (shipping address forms, tax calculation, order confirmation emails, refund handling).
- You take on more responsibility for payment flows and edge cases.
- Tax calculation requires a service like TaxJar or Stripe Tax.
- Way beyond "simple CRUD app" scope.

**Not recommended** for an MVP.

#### Option D: Placeholder — "Checkout" is a coming-soon page

Don't build checkout yet. The "Checkout" button leads to a page that says "Checkout coming soon" or collects an email for notification.

**Pros:**
- Zero complexity.
- You can build the entire storefront and validate it without payments.
- Checkout is implemented later when Shopify enablement (EP-018) lands.

**Cons:**
- The storefront can't actually sell anything.
- Less impressive as a demo project.

### My recommendation

**Option A (Shopify checkout handoff)** as the target, with **Option D (placeholder)** until EP-018.

Why: Building your own checkout is a huge undertaking that the spec clearly doesn't intend. Shopify's hosted checkout is the industry standard for headless storefronts. Since EP-018 enables Shopify anyway, checkout handoff is the natural endpoint.

For epics 1–17, use a placeholder. At EP-018, wire up Shopify checkout.

---

## Gap 5: API Response Contracts — What does each endpoint return?

### What this means

The spec lists endpoints like `GET /api/products` and `GET /api/search?q=...`, but doesn't define what the response looks like. When the frontend calls `GET /api/products`, what JSON comes back?

### Why this matters

Without defined contracts, the frontend developer and backend developer will make different assumptions. The frontend might expect:

```json
{ "products": [{ "id": "1", "title": "Cool Hat", "price": 29.99 }] }
```

While the backend returns:

```json
{ "data": [{ "product_id": "1", "name": "Cool Hat", "base_price": "29.99" }] }
```

Different field names, different nesting, different types. This causes integration bugs that waste time.

### The choices

#### Option A: Define contracts now in a spec document

Write out the exact JSON shape for every endpoint before coding.

**Pros:** No ambiguity. Frontend and backend can be built in parallel.
**Cons:** Takes time upfront. Contracts may change as we learn more.

#### Option B: Let the domain model imply the contracts

Use the spec's domain models (Product, Cart, etc.) as the response shape. The API returns what the database stores, plus pagination metadata.

**Pros:** Fast. Models already exist. Less upfront documentation.
**Cons:** Database models and API responses shouldn't always be identical (you may want to hide internal fields, rename things, or nest differently).

#### Option C: Build API first, frontend adapts

Build the backend endpoints, document what they return, and have the frontend consume whatever comes back.

**Pros:** Realistic workflow. API is the source of truth.
**Cons:** Frontend work is blocked until backend is done.

### My recommendation

**Option B with light documentation.** Define a simple convention:

- All list endpoints return `{ data: [...], pagination: { page, pageSize, total } }`.
- All single-item endpoints return `{ data: { ... } }`.
- Field names match the domain model (camelCase).
- Errors return `{ error: { message, code } }`.

This can be a 1-page document. No need for a full OpenAPI spec at this scale.

---

## Gap 6: Authentication Model — Is the store anonymous?

### What this means

Can shoppers create accounts and log in? Or is everyone anonymous, identified only by a session cookie?

### Why this matters

User accounts affect:
- Cart persistence (does your cart survive across devices?)
- Order history (can you see past orders?)
- Checkout (pre-filled addresses, saved payment methods)
- The database schema (do we need a Users table?)

### The choices

#### Option A: Fully anonymous (session-only)

No user accounts. Every visitor gets a random session ID in a cookie. Cart is tied to that session. No login, no signup, no user profiles.

**Pros:**
- Simplest possible approach.
- No password storage, no auth flows, no security concerns around user data.
- Matches "simple CRUD app" characterization.
- Most small merch stores work this way.

**Cons:**
- No order history for repeat customers.
- Cart lost if cookies are cleared.
- No personalization.

#### Option B: Optional accounts (Shopify-managed)

If Shopify is enabled, Shopify can manage customer accounts. Your app doesn't store passwords — Shopify handles auth.

**Pros:**
- Accounts exist but you don't build auth infrastructure.
- Shopify handles the hard parts (passwords, email verification, etc.).
- Order history comes from Shopify.

**Cons:**
- Only works when Shopify is enabled (EP-018+).
- Adds complexity to the data layer.

#### Option C: Built-in accounts (email/password)

Build signup/login into the app. Store user records in your database. Use a library like NextAuth.js.

**Pros:**
- Full control over user experience.
- Works independently of any provider.

**Cons:**
- Significant engineering work (signup, login, password reset, email verification, session management, security).
- Way beyond MVP scope for a merch store.

### My recommendation

**Option A: Fully anonymous** for the MVP. Session cookie, no user accounts.

Why: The spec has no evidence of user accounts anywhere — no login page in the E2E flows, no User model in the domain, no auth middleware. A small merch store doesn't need accounts. If Shopify accounts are wanted later, that's EP-018+ scope.

---

## Gap 7: Printify Webhook Payloads — What events do we handle?

### What this means

Printify sends **webhooks** to your app when things happen — an order ships, a product changes, etc. A webhook is just an HTTP POST request that Printify sends to a URL you configure, with a JSON body describing what happened.

The spec says we need to handle webhooks with HMAC verification and event routing, but doesn't specify *which* events or what the payloads look like.

### Why this matters

The webhook handler (EP-016) needs to:
1. Know which event types to listen for.
2. Know what data each event contains.
3. Know how to map that data to our domain models.

### What we need to do

This isn't really a "choice" gap — it's a **research** gap. Printify's API documentation defines the webhook events and payload shapes. Before building EP-016, we need to:

1. Read Printify's webhook documentation.
2. Identify the relevant events (likely: `order.created`, `order.updated`, `order.shipped`, `product.published`, `product.updated`).
3. Document the payload schemas.
4. Map payload fields to our domain model fields.

### My recommendation

**Defer this to EP-016.** When we reach the Printify integration epic, we fetch the latest Printify API docs and build the handler against real schemas. No decision needed now — just awareness that this research step exists.

---

## Decision Summary

Here's what I need from you to start building:

| # | Decision | My Recommendation | Alternatives | Your Call |
|---|----------|-------------------|-------------|-----------|
| 1 | Database | PostgreSQL + Prisma + Supabase | SQLite + Turso + Drizzle, or Neon instead of Supabase | ? |
| 2 | Product source | Hybrid (seed data first, sync later) | Printify-only, Shopify-only | ? |
| 3 | Cart architecture | Server-side (DB-backed) | Client-side (localStorage) | ? |
| 4 | Checkout | Placeholder now, Shopify handoff at EP-018 | Build own with Stripe | ? |
| 5 | API contracts | Convention-based (domain model shapes) | Full OpenAPI spec | ? |
| 6 | Auth model | Anonymous (session cookie only) | Shopify-managed accounts | ? |
| 7 | Printify payloads | Research at EP-016 time | Document now | ? |

If you agree with all my recommendations, we can start building immediately with a clear, consistent technical foundation. If any of them feel wrong, let's discuss before committing.

---

## Glossary

This section explains every technical term and technology mentioned in this document. If you encounter a term elsewhere in the spec or codebase that isn't here, ask and I'll add it.

---

### General concepts

**API (Application Programming Interface)**
A way for two pieces of software to talk to each other using a defined set of rules. In this project, our storefront (frontend) talks to our server (backend) through an API — for example, "give me the list of products" is an API call. External services like Printify and Shopify also have APIs that let our app communicate with them.

**API endpoint**
A specific URL that does a specific thing. For example, `GET /api/products` is an endpoint that returns the product list. Think of it like a phone number — each endpoint has an address and a purpose.

**API contract / response shape**
An agreement about what data an API endpoint will return. Like a form template — the frontend knows "when I call this endpoint, I'll get back JSON with these exact fields." Without a contract, the frontend and backend might disagree on field names or data formats.

**Backend**
The part of the app that runs on the server. Users never see it directly. It handles data storage, business logic, API calls to external services, and security. In this project: API routes, webhook handlers, database queries.

**Frontend**
The part of the app that runs in the user's browser. Everything the shopper sees and interacts with — product pages, the cart, buttons, images. Built with React components in this project.

**Full-stack**
An app that has both a frontend (what users see) and a backend (server logic and data). This project is full-stack — it has shopper-facing pages *and* server-side webhook handling, API routes, and database operations.

**CRUD**
Stands for **Create, Read, Update, Delete** — the four basic operations you can do with data. A "CRUD app" is one that primarily lets you create, view, edit, and remove records. The spec calls this a "pretty simple CRUD app" meaning the core functionality is straightforward data operations, not complex algorithms.

**Serverless**
A hosting model where your code runs in short-lived functions that spin up on demand and shut down after responding. You don't manage a permanent server. Vercel uses this model — when someone visits your site, a function wakes up, handles the request, and goes back to sleep. This affects database choice because a file-based database (like plain SQLite) doesn't persist between function invocations.

**Deployment**
The process of putting your code on the internet so real users can access it. "Deploying to production" means making your latest code live at your real website URL. "Preview deployment" means creating a temporary URL for testing before going live.

**CI/CD (Continuous Integration / Continuous Deployment)**
Automated processes that run when you push code:
- **CI** = automatically run tests, linting, and checks to catch bugs before merging.
- **CD** = automatically deploy the app when code is merged to the main branch.
In this project, GitHub Actions handles both.

**Environment variables (env vars)**
Secret or configuration values that live outside your code. Things like database passwords, API keys, and feature flags. You set them in your hosting platform (Vercel) and they're available to your app at runtime. They're never committed to the code repository because they contain secrets.

Example: `DATABASE_URL=postgresql://user:password@host:5432/mydb`

**Feature flag**
A toggle in your code that enables or disables a feature. Like a light switch — you can turn Shopify support on or off without changing any code. Useful for gradually rolling out features or keeping unfinished work hidden. In this project, EP-018 uses a feature flag (`SHOPIFY_ENABLED=true/false`) to control whether Shopify behavior is active.

**JSON (JavaScript Object Notation)**
A standard text format for structured data. Looks like this:
```json
{ "name": "Cool Hat", "price": 29.99, "inStock": true }
```
Almost all APIs send and receive data as JSON. When our frontend asks the backend for products, the response is JSON.

**Session**
A way to remember a visitor across multiple page loads. When someone first visits the store, the server generates a unique ID (like `abc123`), stores it in a cookie in their browser, and uses that ID to track their cart. The session lasts until the cookie expires or is deleted.

**Cookie**
A small piece of data stored in the user's browser by a website. Used to remember things between page loads — like a session ID. An **httpOnly cookie** is one that JavaScript can't read (only the server can), which makes it more secure.

**UUID (Universally Unique Identifier)**
A randomly generated ID that's practically guaranteed to never collide with another ID. Looks like `550e8400-e29b-41d4-a716-446655440000`. Used for session IDs, cart IDs, and similar things where you need a unique identifier without a central counter.

**Webhook**
A message that an external service sends to your app when something happens. Instead of your app constantly asking "did anything change?" (polling), the service proactively tells you. Printify sends webhooks when orders ship, products change, etc. Your app receives these as HTTP POST requests to a specific URL.

**HMAC-SHA256**
A cryptographic verification method. When Printify sends a webhook, it includes a signature — a scrambled string created using a secret key only you and Printify know. Your app recalculates the signature and checks if it matches. If it does, the webhook is genuine. If not, someone is trying to fake a webhook. Think of it like a wax seal on a letter.

**Idempotency**
The property of an operation that produces the same result whether you run it once or multiple times. Important for webhooks because networks can deliver the same message twice. If Printify sends "order #123 shipped" twice, your app should process it once and ignore the duplicate, not create two shipping records.

**Slug**
A URL-friendly version of a name. The product "Cool Summer Hat" becomes the slug `cool-summer-hat`. Used in URLs like `/products/cool-summer-hat` instead of `/products/12345` because it's readable and good for SEO.

**Seed data / seed script**
Fake but realistic data used during development. A seed script fills the database with sample products (like "Test T-Shirt, $25.00") so you can build and test the storefront without connecting to real product sources. Gets replaced with real data before launch.

**Migration**
A versioned change to the database structure. When you add a new column to the products table or create a new table, that's a migration. Migrations are tracked in files so every developer (and the production server) applies the same changes in the same order. Prisma generates these automatically from your schema.

**Type-safe / type safety**
The guarantee that your code won't accidentally use the wrong kind of data. If a function expects a number and you pass it a string, a type-safe system catches that mistake before the code runs. TypeScript provides this, and Prisma extends it to database queries — your IDE tells you "this field doesn't exist on Product" before you even run the app.

**Pagination**
Returning data in chunks instead of all at once. Instead of returning all 500 products in one response (slow, wasteful), the API returns 20 at a time with metadata like `{ page: 1, pageSize: 20, total: 500 }`. The frontend can request page 2, page 3, etc.

**GraphQL**
A query language for APIs (alternative to REST). Instead of calling multiple endpoints, you write a query describing exactly what data you want:
```graphql
{ product(slug: "cool-hat") { title, price, images { url } } }
```
Shopify's Storefront API uses GraphQL. It's powerful but has a learning curve compared to simpler REST endpoints.

**REST (Representational State Transfer)**
The most common API style. Each URL represents a resource, and you use HTTP methods to interact with it:
- `GET /api/products` → list products
- `GET /api/products/cool-hat` → get one product
- `POST /api/cart/items` → add item to cart
- `DELETE /api/cart/items/123` → remove item from cart

This project's API uses REST-style endpoints.

**OpenAPI spec**
A formal, machine-readable document that describes every API endpoint — URLs, parameters, request bodies, response shapes, error codes. Like a very detailed manual. Useful for large teams but overkill for this project.

**PCI compliance**
Payment Card Industry rules about handling credit card data. If your app directly touches card numbers, you must follow strict security standards (expensive audits, specific infrastructure). By using Shopify's hosted checkout, we avoid this entirely — Shopify is PCI compliant, and card data never touches our servers.

---

### Technologies and tools

**Next.js**
A framework built on top of React for building web applications. It handles things React alone doesn't — routing (URLs mapping to pages), server-side rendering (generating HTML on the server for speed and SEO), API routes (backend endpoints living in the same project), and optimization (image compression, code splitting). Think of React as the engine and Next.js as the full car.

**React**
A JavaScript library for building user interfaces. Instead of writing HTML directly, you write "components" — reusable pieces of UI like a ProductCard, a SearchBar, or a CartDrawer. When data changes, React automatically updates only the parts of the page that need to change.

**TypeScript**
JavaScript with type checking. Regular JavaScript lets you do anything — pass a string where a number is expected, access a property that doesn't exist — and only fails when the code runs. TypeScript catches these mistakes while you write the code, before it ever runs. Almost all modern web projects use TypeScript. Every `.ts` and `.tsx` file in this project is TypeScript.

**Tailwind CSS**
A CSS framework that works differently from traditional CSS. Instead of writing separate style files, you add utility classes directly to HTML elements:
```html
<button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
  Add to Cart
</button>
```
Each class does one thing: `bg-blue-500` = blue background, `px-4` = horizontal padding, `rounded` = rounded corners. It's faster to develop with once you learn the class names, and it keeps styles consistent. The "token file" mentioned in the spec is where Tailwind's color/spacing values are customized.

**Vercel**
A hosting platform purpose-built for Next.js apps (they're made by the same company). You push code to GitHub, and Vercel automatically builds and deploys it. It provides:
- A production URL (your-store.vercel.app)
- Preview URLs for every pull request
- Serverless function hosting for API routes
- Edge caching for fast page loads worldwide
Free tier is generous for small projects.

**GitHub Actions**
An automation system built into GitHub. You define "workflows" — scripts that run automatically when things happen (code pushed, PR opened, etc.). This project uses 3 workflows:
1. **ci.yml** — runs tests and linting on every push
2. **deploy-preview.yml** — deploys a preview URL when a PR is opened
3. **deploy-production.yml** — deploys to production when code is merged to main

**PostgreSQL (Postgres)**
The most popular open-source relational database. Data is stored in tables with rows and columns, like a spreadsheet but much more powerful. It can handle complex queries, large datasets, and many simultaneous users. It's been around since 1996 and is extremely reliable.

**Neon**
A cloud-hosted PostgreSQL service designed for serverless apps. It gives you a Postgres database with a connection URL, handles backups, and scales automatically. The free tier includes 0.5 GB storage — more than enough for a small storefront. It's the most popular Postgres host for Vercel/Next.js apps.

**Supabase**
Another cloud-hosted PostgreSQL service, but with additional features (authentication, real-time subscriptions, file storage). More opinionated than Neon — it's a full backend-as-a-service platform. Good if you want extras, but we'd only be using the Postgres part.

**SQLite**
A lightweight database that stores everything in a single file (like `store.db`). No separate server process needed. Extremely fast for small datasets and simple to set up. The limitation is it doesn't naturally fit serverless hosting (the file needs to live somewhere persistent), which is why Turso exists.

**Turso**
A cloud hosting service for SQLite databases. It takes SQLite's simplicity and makes it work in serverless environments by hosting the database file remotely and replicating it to edge locations. Think "Neon but for SQLite."

**Prisma**
An ORM (see above) for TypeScript/JavaScript. You define your data models in a `.prisma` schema file:
```prisma
model Product {
  id          String   @id @default(uuid())
  slug        String   @unique
  title       String
  price       Float
  createdAt   DateTime @default(now())
}
```
Prisma then generates:
- TypeScript types matching your models
- A client library with autocomplete for queries
- Migration files to update the database structure
It's the most popular ORM in the TypeScript ecosystem.

**Drizzle**
A newer, lighter ORM alternative to Prisma. It stays closer to raw SQL, which some developers prefer. Where Prisma has its own schema language, Drizzle defines models in TypeScript directly. Good for people who know SQL well. Less magical, more explicit.

**Playwright**
A browser automation tool for testing. It launches real browsers (Chrome, Firefox, Safari) and simulates user actions — clicking buttons, typing in search boxes, navigating pages. This project uses it for E2E (end-to-end) tests that verify the whole storefront works as a user would experience it. 22 tests across 4 flows, running in 3 browsers.

**Vitest**
A fast test runner for unit tests. While Playwright tests the full app in a real browser, Vitest tests individual functions in isolation — like "does the HMAC verification function correctly reject a bad signature?" This project has 49 unit tests covering backend integration logic.

**axe-core**
An accessibility testing engine. It scans web pages and reports violations of accessibility standards (missing alt text, low contrast, keyboard traps, etc.). In this project, it's plugged into Playwright so accessibility checks run automatically during E2E tests.

**ESLint**
A tool that analyzes your JavaScript/TypeScript code for potential problems — unused variables, inconsistent formatting, suspicious patterns. It doesn't run the code; it reads it and flags issues. "Lint errors" are problems ESLint found.

**Prettier**
A code formatter that automatically formats your code to look consistent — indentation, quotes, spacing. You write messy code, hit save, and Prettier makes it uniform. Eliminates style debates.

**Lighthouse**
A tool (built into Chrome) that audits web pages for performance, accessibility, SEO, and best practices. It produces scores from 0–100. "Lighthouse thresholds" in the spec means setting minimum acceptable scores — like "performance must be above 90" — and failing the CI build if the score drops below that.

**Core Web Vitals**
Three specific metrics Google uses to measure how fast and smooth a website feels:
- **LCP (Largest Contentful Paint)** — how long until the main content appears (should be under 2.5 seconds)
- **INP (Interaction to Next Paint)** — how long between a user's click and the page responding (should be under 200ms)
- **CLS (Cumulative Layout Shift)** — how much the page content jumps around while loading (should be near 0)
These affect Google search rankings and user experience.

**Bundle analysis**
Examining how much JavaScript your app ships to the browser. Every library, component, and utility adds to the "bundle size." Larger bundles = slower page loads. Bundle analysis tools show which dependencies are largest, so you can remove or replace bloated ones.

**Stripe**
A payment processing service. Handles credit card transactions, fraud detection, and payouts. Used when you want to build your own checkout experience (as opposed to handing off to Shopify). Not recommended for this MVP because it adds significant complexity.

**NextAuth.js**
A library for adding user authentication (login/signup) to Next.js apps. Supports email/password, social logins (Google, GitHub), and session management. Not needed for this project since we're going with anonymous sessions.

**Headless storefront**
A storefront where the frontend (what shoppers see) is built separately from the commerce backend (product management, payments, fulfillment). The "head" is your custom Next.js site; the "body" is Shopify/Printify. They communicate through APIs. This is exactly what we're building.

**Shopify Storefront API**
Shopify's public API designed specifically for headless storefronts. It lets your app fetch products, create carts, and initiate checkouts using GraphQL. Different from Shopify's Admin API (which manages the store itself). The Storefront API is what powers EP-018.

**Printify API**
Printify's API for managing print-on-demand products and orders. Used to fetch product catalogs, submit orders for fulfillment, and receive status updates via webhooks. EP-016 integrates with this.

**localStorage**
A browser storage mechanism. Your JavaScript code can save data that persists across page loads — but only in that specific browser on that specific device. Clearing browser data erases it. Limited to ~5MB. Simpler than a database but far less reliable.

**httpOnly cookie**
A cookie with a security flag that prevents JavaScript from reading it. Only the server can access it. Used for session IDs to prevent cross-site scripting (XSS) attacks from stealing sessions. When we say "session ID in an httpOnly cookie," we mean the browser stores it but malicious scripts can't grab it.

**WCAG 2.1 AA**
Web Content Accessibility Guidelines, version 2.1, conformance level AA. A set of rules that make websites usable by people with disabilities — screen readers, keyboard-only navigation, sufficient color contrast, etc. "AA" is the middle level (A = minimum, AA = standard, AAA = strictest). Most organizations target AA. EP-019 audits the app against these rules.

**Focus trap**
When a modal or drawer opens (like a cart drawer), keyboard focus should be "trapped" inside it — pressing Tab cycles through the modal's elements instead of jumping to the page behind it. Without this, keyboard users can get lost behind the modal. EP-019 fixes focus trap issues.

**SEO (Search Engine Optimization)**
Making your website appear in Google search results. Involves meta tags, semantic HTML, fast load times, canonical URLs, and structured data. Next.js handles most of this well by default.

**Canonical URL**
The "official" URL for a page. If the same content is accessible at `/products/cool-hat` and `/products/cool-hat?ref=homepage`, the canonical URL tells Google which one is the "real" one to index. Prevents duplicate content problems.
