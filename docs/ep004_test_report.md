# EP-004 Test Report — Search

**Date:** March 2026
**Test file:** `tests/e2e/ep004-search.spec.ts`
**Runner:** Playwright (Chromium)
**Result:** 12/12 passed in 19.7s (all passed on first run)

---

## What was tested

### Test 1: Search page shows all products with no query
`/search` without `?q=` displays "All Products" heading and "10 products found" count. Proves the default behavior shows the full catalog.

### Test 2: Search page has search input
Verifies a searchbox input exists within the main content area.

### Test 3: Search returns matching results
`/search?q=hoodie` shows "Premium Hoodie" and "1 product found". Proves query-based filtering works against product titles.

### Test 4: Search is case-insensitive
`/search?q=HOODIE` (uppercase) still finds "Premium Hoodie". Proves Prisma's `mode: "insensitive"` is working.

### Test 5: Search by description text
`/search?q=stainless+steel` finds "Insulated Water Bottle" (whose description mentions "stainless steel"). Proves search covers descriptions, not just titles.

### Test 6: Empty search results show message
`/search?q=xyznonexistent` shows "No products found" message. Proves the empty state renders correctly.

### Test 7: Search form submits from search page
Fills the search input with "cap", presses Enter, checks URL updates to `?q=cap` and "Summer Cap" appears. Tests the full form → navigation → results cycle.

### Tests 8–9: SEO titles
With query: "Search: hoodie | Merch Store". Without query: "Search | Merch Store". Proves `generateMetadata()` produces dynamic titles.

### Test 10: Search API returns correct results
Direct API call to `/api/search?q=tee` — validates array response contains "Classic Logo Tee" and pagination metadata exists.

### Test 11: Search API returns all products with empty query
Direct API call to `/api/search` — validates `pagination.total` is 10 (all products).

### Test 12: Search result cards link to product pages
Clicks "Premium Hoodie" in search results, verifies URL changes to `/products/premium-hoodie`. Tests the user journey from search → product detail.

---

## What was NOT tested and why

### 1. Header search bar submission
The header has a compact search input (hidden on mobile). Not explicitly tested because the search page input covers the same functionality. Header search will be tested in EP-017 (full E2E suite).

### 2. Pagination UI
The Pagination component is built and renders, but with 10 products and 12-per-page, there's only 1 page — so no Previous/Next buttons appear. Would need 13+ products to test pagination UI. The API pagination is tested (Test 8 in EP-002).

### 3. Tag-based search
The search API supports `tags: { has: query }`, but this requires an exact tag match (e.g., searching "hoodie" as a tag). Not tested because title/description search covers the same products more naturally.

### 4. Search with special characters
Queries like `"cool hat"`, `tee&hoodie`, or SQL injection attempts (`'; DROP TABLE--`) are not tested. Input sanitization comes at EP-012.

### 5. Search performance with large datasets
10 products is trivial. Performance testing with thousands of products is out of scope. Full-text search indexing (Postgres `tsvector`) could be added later if needed.

### 6. Mobile search experience
The header search is hidden on mobile (`hidden sm:block`), replaced with a "Search" text link. Mobile UX testing deferred to EP-009–010.

---

## Issues discovered during testing

None. All 12 tests passed on the first attempt. The search implementation was straightforward — Prisma's `contains` with `mode: "insensitive"` handles the heavy lifting.
