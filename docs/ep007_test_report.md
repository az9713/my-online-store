# EP-007 Test Report — Testing Infrastructure

**Date:** March 2026
**Test files:**
- `tests/unit/api-response.test.ts` — 3 tests
- `tests/unit/validation.test.ts` — 18 tests
- `tests/unit/commerce-flags.test.ts` — 8 tests
**Runners:** Vitest (unit tests), Playwright (E2E tests — already in place from EP-001–006)
**Result:** 29/29 unit tests passed in 0.9s

---

## What was built

- **Vitest configuration** (`vitest.config.ts`) — unit test runner with path aliases matching Next.js
- **3 unit test suites** covering API response conventions, Zod validation schemas, and commerce feature flags
- **Package.json scripts:**
  - `npm test` — run unit tests
  - `npm run test:e2e` — run Playwright E2E tests (single worker)
  - `npm run test:all` — run both unit and E2E tests

---

## What was tested

### API Response Conventions (3 tests)
- Single item response has `{ data: { ... } }` shape
- List response has `{ data: [...], pagination: { page, pageSize, total } }` shape
- Error response has `{ error: { code, message } }` shape

### Validation Schemas (18 tests)

**addToCartSchema (7 tests):**
- Valid input accepted
- Quantity defaults to 1 when omitted
- Non-UUID productId rejected
- Missing productId rejected
- Quantity over 99 rejected
- Zero quantity rejected
- Negative quantity rejected

**updateCartItemSchema (5 tests):**
- Valid quantity accepted
- Zero quantity accepted (means "remove")
- Negative quantity rejected
- Missing quantity rejected
- Non-number quantity rejected

**paginationSchema (4 tests):**
- Valid pagination accepted
- Defaults to page 1, pageSize 20
- String numbers coerced ("3" → 3)
- pageSize over 50 rejected

**searchQuerySchema (3 tests):**
- Query with defaults accepted
- Empty query defaults to ""
- Whitespace trimmed

### Commerce Flags (8 tests)

**getActiveProvider (4 tests):**
- Defaults to "local" when no env var
- Returns "printify" when set
- Returns "shopify" when set
- Falls back to "local" for unknown values

**isShopifyEnabled (3 tests):**
- Returns false by default
- Returns true when SHOPIFY_ENABLED=true
- Returns false for non-true values

---

## What was NOT tested and why

### 1. Database-dependent unit tests
Functions like `getOrCreateCart()` and `mergeAnonymousCart()` depend on Prisma/Supabase. Unit testing these would require mocking Prisma or using a test database. Currently covered by E2E tests (EP-005). Proper unit tests with mocked Prisma deferred to when the test suite matures.

### 2. Supabase Auth unit tests
Auth functions (`createClient`, `updateSession`) are thin wrappers around Supabase SDK. Unit testing them means mocking the SDK. Currently covered by E2E tests (EP-001). Not worth the mock complexity for wrapper functions.

### 3. React component unit tests
Components like `ProductCard`, `VariantSelector`, `CartPage` are tested through E2E tests. Unit testing React components requires `@testing-library/react` and a DOM environment. Deferred — E2E coverage is sufficient for now.

### 4. Integration tests (API routes with real DB)
Testing API routes end-to-end with a real database is already done by Playwright's `request` API in EP-002–006 tests. A dedicated integration test layer would be redundant.

---

## Cumulative test count

| Type | Tests | Time |
|---|---|---|
| Unit (Vitest) | 29 | 0.9s |
| E2E (Playwright) | 66 (EP-001 through EP-006) | ~1.7min |
| **Total** | **95** | **~2min** |

---

## Issues discovered during testing

None. All 29 unit tests passed on the first run. The Zod v4 API worked identically to expected behavior — `safeParse` returns `{ success: boolean, data?, error? }`.
