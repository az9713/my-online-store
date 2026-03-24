# EP-006 Test Report — API Routes + Data Layer Hardening

**Date:** March 2026
**Test file:** `tests/e2e/ep006-api-hardening.spec.ts`
**Runner:** Playwright (Chromium)
**Result:** 13/13 passed in 14.8s (all passed on first run)

---

## What was built

- `src/lib/api/response.ts` — Helper functions for consistent JSON response format (`successResponse`, `listResponse`, `errorResponse`)
- `src/lib/api/errors.ts` — Centralized error handler that formats Zod validation errors and catches unhandled exceptions
- `src/lib/api/validation.ts` — Zod schemas for cart operations, pagination, and search queries
- `src/lib/commerce/provider.ts` — TypeScript interface defining the commerce provider contract (getProducts, getProductBySlug, searchProducts)
- `src/lib/commerce/local/index.ts` — Local provider implementation using Prisma (the current default)
- `src/lib/commerce/flags.ts` — Feature flags for switching between providers (local/printify/shopify)

---

## What was tested

### Tests 1–3: Input validation
- Non-UUID product IDs are rejected (400+)
- Empty request bodies return 400 with structured error
- Negative quantities are handled without crashing

### Tests 4–7: Response format consistency
- Products list API returns `{ data: [], pagination: { page, pageSize, total } }`
- Product detail API returns `{ data: { id, slug, ... } }`
- Product 404 returns `{ error: { code: "PRODUCT_NOT_FOUND", message: "..." } }`
- Search API returns same list format

### Tests 8–9: Commerce provider fields
- Products have `commerceProvider: "native"` field
- Variants have all expected fields (id, title, price, inStock, optionValues)

### Tests 10–12: Edge cases
- `page=0` clamps to page 1 (doesn't crash)
- `pageSize=-5` clamps to positive value (doesn't crash)
- 500-character search query returns empty results (doesn't crash or timeout)

### Test 13: Full regression flow
Complete user journey: home → search → product → add to cart → view cart. Proves all previous EPs still work together.

---

## What was NOT tested and why

### 1. Zod validation wired into actual API routes
The Zod schemas are defined but the existing API routes haven't been refactored to use them yet (they do manual validation). The schemas are ready for when routes are refactored. Existing validation still works — this is additive, not a rewrite.

### 2. Rate limiting
Not implemented yet. Basic rate limiting on public endpoints is planned but not built. Deferred to EP-012 (Security Hardening).

### 3. Commerce provider switching
The `flags.ts` and `provider.ts` abstractions exist but the API routes still call Prisma directly (not through the provider interface). The provider pattern is ready for EP-016 (Printify) to plug in. Currently there's only one provider ("local"), so switching isn't meaningful yet.

### 4. SQL injection
Prisma parameterizes all queries by default, so SQL injection is prevented at the ORM level. No explicit SQL injection tests — Prisma's security model handles this.

### 5. Request body size limits
No explicit test for oversized request bodies (e.g., a 10MB JSON payload). Next.js has default body size limits. Deferred to EP-012.

---

## Issues discovered during testing

None. All 13 tests passed on the first run. The API layer already had reasonable behavior for edge cases (clamping page/pageSize to positive values) from the EP-002/EP-004 implementations.
