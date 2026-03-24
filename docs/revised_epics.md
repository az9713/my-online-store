# Revised Epic Sequence — EP-001 through EP-020

## Methodology

This document revises the GPT-inferred epic sequence from `inferred_epic_gpt5.txt`. The original reconstruction padded EP-001–014 with 14 standalone epics to fill 20 slots neatly. In reality, a "pretty simple CRUD app" built by a small team almost certainly had fewer, larger early epics — with the later epics (EP-015–020) being well-evidenced and unchanged.

---

## Changes from the GPT reconstruction and why

### 1. Merged "Design system" into repo bootstrap

**GPT had:** EP-001 (bootstrap) + EP-002 (design system) as separate epics.

**Changed to:** Single EP-001 that includes Tailwind setup and base layout.

**Why:** A small team doesn't ship a dedicated design system epic before building any pages. Tailwind config, a few tokens, and layout primitives get set up during scaffolding. The Tailwind token file referenced in Sprint 3 screenshots doesn't prove a standalone epic — it proves the file exists, which could have been created in 10 minutes during bootstrap.

### 2. Merged "Product domain model" into the product detail page epic

**GPT had:** EP-003 (product model) + EP-005 (product detail page) as separate epics.

**Changed to:** Single EP-003 that builds the product model alongside the product page.

**Why:** In a CRUD app, you define the model when you need it. Nobody writes a product schema, seed data, and "component contracts" as a standalone deliverable before building the page that uses them. The model emerges from building the page.

### 3. Removed standalone "Checkout bridge" epic (was EP-009)

**GPT had:** EP-009 as a checkout bridge / order creation path.

**Changed to:** Removed entirely. Checkout intent is a line item within the cart epic.

**Why:** Zero evidence exists for checkout — no E2E flow covers it, no screenshot mentions it, no API route references it. The most likely reality is either (a) checkout is a "proceed to external checkout" link handled by the cart page, or (b) it doesn't exist yet. Inventing a standalone epic for something with no evidence is speculative padding.

### 4. Removed standalone "Auth/session" epic (was EP-012)

**GPT had:** EP-012 for session handling / cart persistence.

**Changed to:** Session/persistence logic is part of the cart epic.

**Why:** For a small merch storefront, cart state is almost certainly cookie or localStorage-based, implemented as part of building the cart. There's no evidence of user accounts, login, or server-side sessions. A standalone auth epic implies infrastructure that this app likely doesn't have.

### 5. Removed standalone "Analytics/SEO" epic (was EP-013)

**GPT had:** EP-013 for analytics, SEO, and metadata.

**Changed to:** Removed. Basic SEO (meta tags) was likely done inline with each page. Analytics injection is explicitly part of EP-020.

**Why:** EP-020's description says analytics injection into the layout file is Sprint 3 work — meaning it hasn't been done yet. This directly contradicts the GPT's inference that an analytics epic already existed. Basic `<title>` and `<meta>` tags don't warrant their own epic.

### 6. Removed standalone "Provider abstraction groundwork" epic (was EP-014)

**GPT had:** EP-014 as commerce/provider abstraction prep before Shopify.

**Changed to:** Provider abstraction is part of EP-013 (Shopify Enablement, formerly EP-018).

**Why:** Building an abstraction layer before you have a second provider is premature engineering. The Shopify epic (EP-018) is where this abstraction gets created — because that's when you actually need it. Pre-building it as a separate epic contradicts the "simple CRUD app" characterization.

### 7. Consolidated data layer and backend foundation

**GPT had:** EP-008 (data layer) + EP-010 (backend foundation) as separate epics.

**Changed to:** Single EP-006 covering API routes and data layer together.

**Why:** In Next.js, API routes and data fetching are colocated. "Backend foundation" and "data layer wiring" are the same work — setting up how the app fetches and serves product/cart data. Separating them implies a backend-heavy architecture that a simple Next.js app doesn't have.

### 8. Introduced "Unknown / gap" epics honestly

**GPT filled:** Every slot EP-001–014 with a named epic.

**Changed to:** EP-009 through EP-010 are explicitly marked as unknown gap epics.

**Why:** We don't know what these were. They could be bug fixes, small polish tasks, internal tooling, or epics unrelated to the storefront. Fabricating plausible-sounding names is worse than admitting uncertainty. Honest gaps > confident fiction.

---

## Revised epic sequence

### EP-001 — Repo Bootstrap + App Shell + Tailwind Foundation
- Initialize repo (Next.js + TypeScript)
- Tailwind CSS setup with base tokens
- App shell: root layout, header, footer, nav
- Lint/format config (ESLint, Prettier)
- Base routing structure

**Confidence:** High. Every project starts here. Tailwind token file existence confirms setup happened early.

### EP-002 — Home Page
- Hero/brand section
- Featured products grid
- Navigation to product and search
- Responsive layout

**Confidence:** High. `home` is a confirmed E2E flow.

### EP-003 — Product Detail Page + Product Model
- Product schema/type definitions
- Slug-based routing (`/products/[slug]`)
- Image gallery, title, price, description
- Variant selection UI
- Add-to-cart trigger
- Seed data or mock catalog for development

**Confidence:** High. `product` is a confirmed E2E flow. Model and page are naturally co-developed.

### EP-004 — Search
- Search route (`/search`)
- Query parameter handling
- Results grid/list
- Empty state
- Basic filtering or sorting if applicable

**Confidence:** High. `search` is a confirmed E2E flow.

### EP-005 — Cart + Cart State
- Cart page (`/cart`)
- Cart state management (likely client-side: cookie/localStorage)
- Add/remove/update quantity
- Line item display with subtotals
- Session persistence for cart across page loads
- Checkout CTA (likely external handoff or placeholder)

**Confidence:** High. `cart` is a confirmed E2E flow. Sprint 3 explicitly references cart components. Session/persistence logic belongs here, not in a separate epic.

### EP-006 — API Routes + Data Layer
- Server/API route structure (`/api/products`, `/api/search`, `/api/cart`)
- Product fetching abstraction
- Env var handling
- Request validation basics
- Move from mock/seed data to structured data layer

**Confidence:** Medium-high. API routes must exist for the storefront to function. The data layer is referenced in Sprint 3 Shopify work, confirming it predates EP-018.

### EP-007 — Testing Infrastructure
- Vitest setup for unit/component tests
- Initial Playwright setup
- Test folder conventions
- CI integration for test runs
- Early smoke tests

**Confidence:** Medium-high. By EP-016, there are 49 unit tests, and by EP-017, there are 22 E2E tests. The testing infrastructure was laid before those epics.

### EP-008 — Basic SEO + Metadata + Polish
- Page-level `<title>`, `<meta>`, Open Graph tags
- Canonical URLs
- Favicon, manifest
- Error pages (404, 500)
- General UI polish pass

**Confidence:** Medium. Some polish work likely happened before deployment. This is the least certain of the "known" epics but more plausible than a standalone analytics or auth epic.

### EP-009 — Unknown / Gap
Content unknown. Possibly: bug fixes, internal tooling, refactoring, or a small feature not visible in the evidence.

**Confidence:** Low. Slot exists because the numbering must reach EP-015. Honest gap.

### EP-010 — Unknown / Gap
Same as EP-009.

**Confidence:** Low. Honest gap.

---

## Confirmed epics (unchanged from GPT reconstruction)

These are strongly evidenced and I agree with the GPT's reconstruction.

### EP-011 through EP-014 — Likely additional foundation or polish work

These slots exist between the core storefront build-out and the confirmed deployment epic. They may include:
- Additional component work
- Database/persistence refinements
- Error handling improvements
- Pre-deployment hardening

Rather than fabricating specific epic names, these are acknowledged as probable but unverifiable.

**Confidence:** Low for specific content. High that *something* filled these slots.

### EP-015 — Vercel Deployment + CD Pipeline
- `vercel.json` configuration
- GitHub Actions deploy/preview workflows
- Push to `main` → production deploy
- PR → preview URL
- Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

**Confidence:** Very high. Directly evidenced from screenshots.

### EP-016 — Printify Webhook Receiver + Order Sync
- HMAC-SHA256 signature verification
- Webhook event routing by type
- Order sync endpoint
- Idempotency / duplicate handling
- Error logging
- 49 unit tests

**Confidence:** Very high. Directly evidenced from screenshots.

### EP-017 — Playwright E2E Tests — Core User Flows
- 22 Playwright tests
- 4 flows: home, product, search, cart
- 3-browser CI matrix (Chromium, Firefox, WebKit)
- Playwright/Vitest tooling coexistence

**Confidence:** Very high. Directly evidenced from screenshots.

### EP-018 — Shopify Enablement
- Feature flag for Shopify activation
- Commerce provider abstraction (`lib/commerce/provider.ts`, `flags.ts`)
- Data layer branching by provider
- Cart component updates for multi-provider support
- E2E test rewrites for Shopify-enabled paths
- Env vars: `SHOPIFY_ENABLED`, `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_API_TOKEN`, `SHOPIFY_API_VERSION`
- Preserve pre-existing lint-error ignore list

**Confidence:** Very high. Directly evidenced from Sprint 3 backlog.

### EP-019 — Accessibility Audit + WCAG 2.1 AA Fixes
- Component-by-component audit (nav, search, gallery, cart, modals)
- Focus trap fixes for drawers/modals
- Tailwind color token contrast audit
- `axe-core` integration into Playwright
- Vitest exclusion rule to prevent test interference
- Keyboard navigation for all core flows
- Visible focus states, semantic headings/labels

**Confidence:** Very high. Directly evidenced from Sprint 3 backlog.

### EP-020 — Performance Monitoring — Core Web Vitals + Bundle Analysis
- Analytics injection in root layout file
- Core Web Vitals tracking (LCP, INP, CLS)
- Bundle analysis tooling
- Lighthouse thresholds in CI
- Preserve all 3 existing CI workflows
- Preserve `package.json` scripts
- Preserve `next.config.ts` behavior

**Confidence:** Very high. Directly evidenced from Sprint 3 backlog.

---

## Summary of differences

| Slot | GPT Version | Revised Version | Rationale |
|------|-------------|-----------------|-----------|
| EP-001 | Repo bootstrap only | Bootstrap + Tailwind + shell | Merged EP-002 in — no standalone design system epic for a small app |
| EP-002 | Design system / Tailwind | Home page | Promoted from EP-004 |
| EP-003 | Product domain model only | Product page + model | Merged EP-005 in — model built alongside page |
| EP-004 | Home page | Search | Shifted up |
| EP-005 | Product detail page | Cart + cart state | Absorbed session/auth (was EP-012) and checkout intent (was EP-009) |
| EP-006 | Search | API routes + data layer | Merged EP-008 + EP-010 |
| EP-007 | Cart | Testing infrastructure | Was EP-011 |
| EP-008 | Data layer wiring | SEO + metadata + polish | Was EP-013 (reduced scope) |
| EP-009 | Checkout bridge | Unknown / gap | Removed — no evidence |
| EP-010 | Backend foundation | Unknown / gap | Merged into EP-006 |
| EP-011 | Testing infrastructure | Unknown / gap zone (011–014) | Honest uncertainty |
| EP-012 | Auth / session | (absorbed into EP-005) | No evidence for standalone auth |
| EP-013 | Analytics / SEO | (analytics moved to EP-020 where it belongs) | EP-020 says this is Sprint 3 work |
| EP-014 | Provider abstraction | (absorbed into EP-018) | Premature abstraction without second provider |
| EP-015–020 | (unchanged) | (unchanged) | Strongly evidenced |

**Net effect:** 8 confident early epics + 6 gap/unknown slots + 6 confirmed late epics, versus the GPT's 14 fabricated + 6 confirmed. Less tidy, more honest.
