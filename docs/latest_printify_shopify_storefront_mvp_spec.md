# Printify + Shopify Merch Storefront MVP Spec (Latest Update)

## 0. Evidence base and what changed

This spec is a reconstruction from three evidence sources:

1. **Transcript evidence**
   - John’s demo side project is a **small full-stack app** with explicit **frontend / backend / architecture** agent roles.
   - He describes it as a **“pretty simple CRUD app.”** fileciteturn14file1

2. **Earlier screenshots**
   - `vercel.json` plus **deploy/preview GitHub Actions workflows**
   - push to `main` auto-deploys, PRs get preview URLs
   - **Printify webhook handler** with **HMAC-SHA256 auth**, **event routing**, a **sync endpoint**, and **49 unit tests**
   - **22 Playwright E2E tests** across **4 flows**: `home`, `product`, `search`, `cart`
   - tests wired into CI across **3 browsers**
   - repo secrets required for deploy workflows:
     - `VERCEL_TOKEN`
     - `VERCEL_ORG_ID`
     - `VERCEL_PROJECT_ID`

3. **Newest screenshot**
   - Sprint 3 backlog items:
     - **EP-018: Shopify Enablement**
     - **EP-019: Accessibility Audit + WCAG 2.1 AA Fixes**
     - **EP-020: Performance Monitoring – Core Web Vitals + Bundle Analysis**
   - Detailed task guidance:
     - Shopify: exact files for the flag, data layer, cart components, E2E rewrites, env vars, pre-existing lint errors to ignore
     - Accessibility: every component to audit, focus-trap fixes, Tailwind token file with colors, how `axe-core` plugs into the existing Playwright setup, Vitest exclusion rule
     - Performance: exact layout file for analytics injection, all 3 CI workflows to read before editing, current `package.json` scripts, what to preserve in `next.config.ts`, Lighthouse thresholds

## Revised conclusion

The product is now best understood as:

> a **small Vercel-hosted customer-facing merch storefront** with `home`, `product`, `search`, and `cart` flows, already integrated with **Printify** for webhook/order sync, and entering a Sprint 3 phase focused on **Shopify enablement**, **accessibility hardening**, and **performance instrumentation**.

This is more precise than the prior inference of “Printify storefront only.” The new evidence suggests a storefront architecture with an existing commerce core and a new integration/enablement layer around Shopify.

---

## 1. Product thesis

Build a small, production-oriented merch storefront that:

- serves shoppers through a simple browse/search/cart experience,
- integrates fulfillment/order synchronization through Printify,
- is being prepared for Shopify-related enablement,
- is hardened for accessibility and performance,
- ships through GitHub Actions + Vercel preview/production workflows,
- and is protected by unit tests plus Playwright E2E coverage.

The best mental model is:

> **a compact e-commerce storefront repo with fulfillment plumbing, deployment automation, and a serious quality bar despite a small codebase.**

---

## 2. Product scope

## In scope

### Customer-facing flows
- home page
- product detail page
- search page
- cart page

### Commerce/integration
- Printify webhook ingestion
- HMAC-SHA256 verification
- event routing
- order sync endpoint
- Shopify enablement workstream

### Delivery/quality
- Vercel preview + production deployment
- GitHub Actions workflows
- unit tests around integration/backend logic
- Playwright E2E for core storefront flows
- accessibility audit + WCAG 2.1 AA fixes
- performance monitoring + bundle analysis

## Likely near-term scope for Sprint 3
- feature-flagged Shopify work
- cart/data-layer adjustments
- E2E rewrites where Shopify changes affected flows
- `axe-core` integration into Playwright checks
- performance analytics injection
- Lighthouse thresholds in CI or release gating

## Out of scope
- enterprise commerce platform scope
- advanced CMS
- broad multi-tenant SaaS merchant tooling
- complex recommendation systems
- advanced warehouse/inventory orchestration
- marketplace seller tooling

---

## 3. Revised product interpretation

The repo now appears to have **three layers**:

### Layer A: storefront UX
Grounded by E2E flows:
- home
- product
- search
- cart

### Layer B: commerce + fulfillment integration
Grounded by backend tasking:
- Printify webhook receiver
- order sync
- HMAC-SHA256 verification
- sync endpoint

### Layer C: platform hardening / extensibility
Grounded by Sprint 3:
- Shopify enablement
- accessibility conformance
- performance instrumentation and CI preservation

That means the app is **not just a thin storefront** and **not just a merchant dashboard**. It is a small but real commerce surface with production engineering concerns.

---

## 4. Updated likely tech stack

## Strongest inferred stack
- **Next.js** app on Vercel
- **GitHub Actions** for CI + preview/prod deployment
- **Playwright** for E2E
- **Vitest** for unit/component-level testing
- **Tailwind CSS**
- **axe-core** for accessibility assertions in E2E
- some server runtime/API layer colocated in the app repo
- likely **Postgres** + ORM for persistence if order/cart state is stored locally

## Why these are now stronger inferences
The new screenshot explicitly references:
- `next.config.ts`
- `package.json` scripts
- Tailwind token file
- `axe-core` integration into Playwright
- Vitest exclusion rules
- analytics injection in a layout file

This pushes the inferred stack much closer to:
- **Next.js + Tailwind + Playwright + Vitest + Vercel**

---

## 5. Architecture overview

```text
[ Shopper ]
    |
    v
[ Next.js Storefront on Vercel ]
    |             |              |
    |             |              +--> Public routes: home / product / search / cart
    |             |
    |             +--> API/server routes:
    |                    - Printify webhook receiver
    |                    - sync endpoint
    |                    - product/search/cart endpoints
    |
    +--> CI/CD via GitHub Actions
    |      - preview deploy on PR
    |      - production deploy on main
    |      - unit + E2E + browser matrix
    |
    +--> Quality instrumentation
    |      - Playwright
    |      - Vitest
    |      - axe-core
    |      - Lighthouse/Core Web Vitals
    |
    +--> Commerce integrations
           - Printify (existing)
           - Shopify enablement (Sprint 3)
```

---

## 6. Updated feature roadmap by evidence

## Completed / already in codebase

### EP-015
**Vercel Deployment + CD Pipeline**
- `vercel.json`
- GitHub Actions deploy/preview workflows
- push to `main` => prod deploy
- PR => preview URL

### EP-016
**Printify Webhook Receiver + Order Sync**
- HMAC-SHA256 verification
- event routing
- sync endpoint
- 49 unit tests

### EP-017
**Playwright E2E Tests – key user flows**
- 22 tests
- flows: home, product, search, cart
- 3 browsers in CI

## Open / Sprint 3

### EP-018
**Shopify Enablement**
Key clues:
- feature flag file(s)
- data layer changes
- cart component changes
- E2E rewrites
- env vars
- lint-error ignore list

Interpretation:
- Shopify is not just a marketing label; it likely changes data and cart behavior.
- rollout may be behind a flag.
- existing tests break under the new path unless selectively updated.

### EP-019
**Accessibility Audit + WCAG 2.1 AA Fixes**
Key clues:
- component-by-component audit
- focus trap fixes
- Tailwind token/color source file
- `axe-core` plugin into existing Playwright
- Vitest exclusion rule to avoid breakage

Interpretation:
- accessibility work is expected to be systematic, not cosmetic.
- modal/drawer/cart overlay behavior is likely one of the problem areas.
- they are integrating accessibility checks into the test pipeline, not just manually patching issues.

### EP-020
**Performance Monitoring – Core Web Vitals + Bundle Analysis**
Key clues:
- exact layout file for analytics injection
- all 3 existing CI workflows must be preserved/read first
- current `package.json` scripts matter
- preserve behavior in `next.config.ts`
- Lighthouse thresholds exist or will be enforced

Interpretation:
- performance instrumentation is being added in a nontrivial repo where careless edits could break deployment/test workflows.
- the team cares about both runtime UX metrics and bundle-level regressions.

---

## 7. Product requirements document (updated MVP)

## 7.1 Shopper-facing requirements

### Home
- render hero/brand section
- show featured or recent merch
- allow navigation to product and search
- remain stable under preview/prod deploys
- preserve good performance/LCP baseline

### Product page
- load by slug
- display title, images, price, description
- support variant selection if variants exist
- add to cart reliably
- be accessible to keyboard and screen reader users

### Search
- query products
- show result grid/list
- support empty state
- preserve performance under repeated interactions

### Cart
- show line items
- update quantity
- remove items
- continue to checkout or checkout handoff
- ensure focus management if cart is modal/drawer-based

---

## 7.2 Commerce / data requirements

### Printify integration
- receive webhook events
- verify HMAC-SHA256 signature
- route events by type
- sync canonical external order state locally
- log failures and retry safely
- tolerate duplicate event delivery

### Shopify enablement
The screenshot is not explicit enough to prove the exact Shopify pattern, so the spec should stay disciplined.

Most defensible interpretation:

- there is a **feature-flagged Shopify path**
- it affects:
  - data layer
  - cart components
  - E2E coverage
  - required env vars
- it may coexist with pre-existing store logic rather than replace it outright

So the MVP spec should include:

- a **commerce provider abstraction** or at least a feature-flagged conditional path
- clear env-var contract for Shopify-related behavior
- compatibility plan for cart flows

---

## 8. Revised domain model

Because Shopify enablement now exists, the data model should no longer be hardwired only around Printify.

## 8.1 products

```ts
Product {
  id
  slug
  title
  description
  status
  basePrice
  currency
  featured
  tagsJson
  commerceProvider       // "native" | "shopify" | "mixed"
  providerProductId
  createdAt
  updatedAt
}
```

## 8.2 product_variants

```ts
ProductVariant {
  id
  productId
  title
  sku
  optionValuesJson
  price
  imageUrl
  providerVariantId
  providerName          // "printify" | "shopify" | null
  inStock
  createdAt
  updatedAt
}
```

## 8.3 carts

```ts
Cart {
  id
  sessionId
  email
  currency
  status                // active | converted | abandoned
  providerName          // "local" | "shopify"
  providerCartId
  createdAt
  updatedAt
}
```

## 8.4 cart_items

```ts
CartItem {
  id
  cartId
  productId
  variantId
  quantity
  unitPrice
  createdAt
  updatedAt
}
```

## 8.5 orders

```ts
Order {
  id
  externalOrderId
  orderNumber
  email
  customerName
  status
  externalStatus
  totalAmount
  currency
  sourceProvider        // "local" | "shopify" | "printify_sync"
  shippingAddressJson
  placedAt
  syncedAt
  createdAt
  updatedAt
}
```

## 8.6 webhook_events

```ts
WebhookEvent {
  id
  provider
  eventType
  eventId
  signatureValid
  payloadJson
  processingStatus
  errorMessage
  receivedAt
  processedAt
  relatedOrderId
}
```

## 8.7 sync_runs

```ts
SyncRun {
  id
  triggerType
  targetType
  targetExternalId
  status
  startedAt
  finishedAt
  errorMessage
  resultSummaryJson
}
```

### Design note
This is still an inferred schema, but it now better accommodates the new evidence that commerce behavior may branch via Shopify-related logic.

---

## 9. Public routes

## Required public routes
- `/`
- `/products/[slug]`
- `/search`
- `/cart`

## Optional additional public routes
- `/checkout`
- `/collections/[slug]`

## Optional private/support routes
- `/admin/events`
- `/admin/sync`
- `/admin/orders`

The support routes remain optional because the evidence does not prove they exist; they remain useful for building a credible equivalent app.

---

## 10. API and server responsibilities

## Public/storefront APIs
- `GET /api/products`
- `GET /api/products/:slug`
- `GET /api/search?q=...`
- cart read/write endpoints

## Integration APIs
- `POST /api/webhooks/printify`
- `POST /api/sync/printify`

## Shopify-related enablement points
The screenshot implies these exist at one or more of:
- feature flag config
- data layer adapter
- cart handling path
- env-var driven provider wiring

So the spec should include:

### Commerce provider boundary
Create an abstraction boundary like:

```text
lib/commerce/
  provider.ts
  flags.ts
  shopify/
  printify/
  local/
```

This prevents cart/data logic from becoming a tangle as Shopify support is introduced.

---

## 11. Shopify enablement spec

Because the screenshot gives unusually concrete operator hints, this section can be more prescriptive.

## Required engineering constraints
- identify the **exact flag file**
- identify the **data layer file(s)**
- identify the **cart components**
- identify which **E2E tests require rewriting**
- document required **env vars**
- preserve known-ignore handling for **pre-existing lint errors**

## Functional interpretation
The Shopify work likely requires:

1. **feature-flagged activation**
   - disable/enable without destabilizing current flows

2. **data-layer adaptation**
   - product/cart/order fetching may branch by provider

3. **cart component compatibility**
   - cart UI cannot assume only one backing cart model

4. **test-path revision**
   - E2E assertions likely change under provider-specific cart behavior

5. **env-var documentation**
   - missing envs should fail clearly, not silently

## Recommended env-var placeholders
These are speculative placeholders for a replica implementation:

- `SHOPIFY_ENABLED`
- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_STOREFRONT_API_TOKEN`
- `SHOPIFY_API_VERSION`

These are not screenshot facts; they are reasonable placeholders for an equivalent build.

---

## 12. Accessibility spec

This section becomes first-class now.

## Accessibility target
- **WCAG 2.1 AA**

## Required audit scope
The screenshot says:
- every component to audit
- focus trap fixes
- Tailwind token file with colors
- `axe-core` into existing Playwright
- Vitest exclusion rule

### Therefore the spec should require:

#### Component audit list
At minimum audit:
- nav/header
- search input/results
- product image gallery
- product variant selectors
- add-to-cart button
- cart drawer or modal
- quantity steppers
- footer links
- toast/status messages

#### Focus management
Especially for:
- cart drawer/modal
- search overlay if any
- mobile menu if any

#### Color/token audit
- confirm token file for semantic colors
- verify contrast ratios for text, buttons, badges, links, focus indicators

#### Automated accessibility checks
- wire `axe-core` into Playwright test runs
- fail or warn on serious violations
- keep unit-test runner isolation so Vitest does not interfere

### Accessibility acceptance criteria
- full keyboard navigation
- visible focus states
- no major contrast violations
- modal/cart focus trapping works
- semantic headings/labels in core flows
- screen-reader legibility for product/cart interactions

---

## 13. Performance spec

This section is also now first-class.

## Stated scope from screenshot
- Core Web Vitals
- bundle analysis
- analytics injection in exact layout file
- preserve all 3 CI workflows
- preserve existing `package.json` scripts
- preserve important `next.config.ts` behavior
- Lighthouse thresholds

## Performance workstream requirements

### Analytics injection
- identify correct root/layout file
- inject analytics in a way that does not break hydration or routing
- document metric collection path

### Core Web Vitals
Track at least:
- LCP
- INP
- CLS

### Bundle analysis
- produce build-time bundle reports
- catch regressions by route/chunk where possible

### Lighthouse thresholds
Establish thresholds for:
- performance
- accessibility
- best practices
- SEO

Only performance is explicitly in the sprint item, but Lighthouse thresholds suggest broader quality gating may exist.

### Preservation rules
This is unusually important from the screenshot:
- do **not** casually rewrite `next.config.ts`
- do **not** break existing `package.json` scripts
- inspect all 3 CI workflows before editing

That implies the codebase has hidden coupling in build/test/deploy scripts.

---

## 14. Deployment and CI (updated)

## Known CI/CD behavior
- 3 existing CI workflows
- preview deploys on PR
- production deploys on main
- Playwright in CI
- 3-browser matrix
- GitHub Actions + Vercel

## Required GitHub secrets
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Recommended workflow split
A credible equivalent implementation should use:

1. **ci.yml**
   - install
   - lint
   - unit tests
   - Playwright matrix

2. **deploy-preview.yml**
   - on PR
   - build and deploy preview
   - publish preview URL

3. **deploy-production.yml**
   - on push/merge to `main`
   - deploy production

This aligns with the screenshot’s “all 3 existing CI workflows” wording.

---

## 15. Testing spec (latest)

## Unit tests
Grounded fact:
- **49 unit tests**

Expected coverage areas:
- HMAC verification
- event routing
- malformed payload handling
- duplicate event handling
- sync logic
- data mapping
- error paths

## E2E tests
Grounded fact:
- **22 Playwright tests**
- **4 flows**
- **3 browsers**

### Required flows
- home
- product
- search
- cart

## Accessibility-in-test requirements
Because of EP-019:
- integrate `axe-core` into relevant Playwright scenarios
- preserve Playwright/Vitest isolation

## Shopify-induced test churn
Because of EP-018:
- explicitly mark tests that depend on current cart/data behavior
- rewrite only those affected by Shopify-enabled paths
- preserve stable non-provider-specific coverage

---

## 16. Repo structure (updated)

```text
.
├─ .github/
│  └─ workflows/
│     ├─ ci.yml
│     ├─ deploy-preview.yml
│     └─ deploy-production.yml
├─ app/ or src/app/
│  ├─ page.tsx
│  ├─ products/[slug]/page.tsx
│  ├─ search/page.tsx
│  ├─ cart/page.tsx
│  ├─ api/
│  │  ├─ webhooks/printify/route.ts
│  │  ├─ sync/printify/route.ts
│  │  ├─ products/route.ts
│  │  ├─ search/route.ts
│  │  └─ cart/...
├─ components/
│  ├─ cart/
│  ├─ product/
│  ├─ search/
│  └─ accessibility/
├─ lib/
│  ├─ commerce/
│  │  ├─ flags.ts
│  │  ├─ provider.ts
│  │  ├─ shopify/
│  │  ├─ printify/
│  │  └─ local/
│  ├─ analytics/
│  ├─ accessibility/
│  ├─ printify/
│  │  ├─ verify-hmac.ts
│  │  ├─ router.ts
│  │  ├─ sync.ts
│  │  ├─ client.ts
│  │  └─ mappers.ts
│  ├─ db/
│  └─ utils/
├─ styles/
│  └─ tokens.ts or equivalent
├─ tests/
│  ├─ unit/
│  └─ e2e/
├─ playwright.config.ts
├─ vitest.config.ts
├─ next.config.ts
├─ vercel.json
└─ package.json
```

---

## 17. Updated milestone plan

## Milestone 1 — storefront shell
- home
- product
- search
- cart
- basic data layer

## Milestone 2 — fulfillment backend
- Printify webhook receiver
- HMAC-SHA256 verification
- event router
- sync endpoint
- unit tests

## Milestone 3 — deploy/preview automation
- `vercel.json`
- preview deploy workflow
- production deploy workflow
- Vercel secrets contract

## Milestone 4 — test hardening
- 22 Playwright-style coverage across 4 flows
- 3-browser CI matrix
- fix tooling conflicts between Playwright and Vitest

## Milestone 5 — Shopify enablement
- feature flag
- data-layer branching
- cart compatibility
- E2E rewrites
- env-var support

## Milestone 6 — accessibility hardening
- full component audit
- focus-trap fixes
- Tailwind token/contrast audit
- `axe-core` integration
- WCAG 2.1 AA acceptance pass

## Milestone 7 — performance hardening
- analytics injection
- Core Web Vitals capture
- bundle analysis
- Lighthouse thresholds
- preserve `next.config.ts` and workflow integrity

---

## 18. Updated agent-team task split

This now maps cleanly to the visible sprint structure.

## Architecture agent
Own:
- `vercel.json`
- GitHub Actions workflows
- env-var contracts
- feature-flag architecture
- provider-boundary design
- `next.config.ts` preservation rules
- CI/read-before-edit constraints
- performance instrumentation insertion points

## Backend agent
Own:
- Printify webhook receiver
- HMAC-SHA256 verification
- event router
- sync endpoint
- unit tests
- provider/data-layer branching for Shopify enablement
- resilience/idempotency

## Frontend agent
Own:
- home/product/search/cart flows
- cart component updates
- Playwright E2E coverage
- affected E2E rewrites for Shopify paths
- accessibility audit/fixes
- focus traps
- Tailwind token/color audit
- Playwright + axe-core integration
- tooling conflict management for Vitest/Playwright

---

## 19. Final one-sentence MVP

> A Vercel-hosted Next.js-style merch storefront with public `home`, `product`, `search`, and `cart` flows, GitHub Actions preview/production deployment, Printify webhook/order-sync infrastructure, and a Sprint 3 roadmap focused on Shopify enablement, WCAG 2.1 AA accessibility fixes, and Core Web Vitals/Lighthouse-based performance hardening.

---

## 20. What remains inferred rather than proven

Even now, these are still inferences:
- exact database choice
- exact checkout implementation
- exact Shopify API mode and cart architecture
- exact product source of truth
- exact directory/file names
- whether admin pages exist in the repo

So this file should still be read as:

> the best high-confidence reconstruction of the same class of product and engineering setup, updated with materially better evidence from the latest sprint planning screenshot.

---

## 21. Best next build order for a replica

1. home/product/search/cart shell  
2. shared commerce provider boundary  
3. cart state + product data layer  
4. Printify webhook receiver + sync endpoint  
5. Vercel + GitHub Actions preview/prod deploy  
6. unit tests for integration logic  
7. Playwright across 4 core flows  
8. Shopify feature-flagged path  
9. accessibility audit + axe-core integration  
10. performance instrumentation + Lighthouse thresholds  

This order now tracks the observed backlog and codebase evidence much more closely than the previous spec.
