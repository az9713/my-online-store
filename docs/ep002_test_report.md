# EP-002 Test Report — Home Page

**Date:** March 2026
**Test file:** `tests/e2e/ep002-home.spec.ts`
**Runner:** Playwright (Chromium)
**Result:** 8/8 passed in 16.7s

---

## What was tested

### Test 1: Home page shows hero section
Verifies the hero heading ("Welcome to Merch Store"), description text, and "Browse All Products" CTA button are visible. Confirms the page renders its primary marketing content.

### Test 2: Home page shows Featured Products heading
Verifies the "Featured Products" section heading exists. Confirms the page has the product grid section.

### Test 3: Home page displays featured product cards
Counts all links matching `a[href^='/products/']` and expects exactly 5 — matching the 5 featured products in seed data (Classic Logo Tee, Premium Hoodie, Summer Cap, Graphic Crewneck, Vintage Long Sleeve).

### Test 4: Product cards show title and price
Checks that "Classic Logo Tee" and "$24.99" are visible on the page. Proves the ProductCard component renders database data correctly with formatted prices.

### Test 5: Product cards link to product detail pages
Takes the first product card's `href` and validates it matches the pattern `/products/[slug]`. Proves cards navigate to the correct product detail URLs.

### Test 6: Browse All Products links to search page
Verifies the hero CTA links to `/search`. Proves the navigation intent is wired correctly.

### Test 7: Products API returns featured products
Directly calls `GET /api/products?featured=true` (no browser, just HTTP) and validates:
- Status 200
- `data` is an array of 5 products
- `pagination` object includes `total: 5`
- Each product has `title`, `slug`, `basePrice`, and `variants` array

This tests the API independently from the UI — if the page renders wrong but the API is correct, this test still passes (and vice versa).

### Test 8: Products API supports pagination
Calls `GET /api/products?page=1&pageSize=2` and validates:
- Returns exactly 2 products (not all 10)
- `pagination.page` is 1, `pageSize` is 2, `total` is 10

Proves the API correctly limits and counts results.

---

## What was NOT tested and why

### 1. Non-featured products on home page
The home page only shows featured products. The 5 non-featured products (Canvas Tote, Water Bottle, Phone Case, Beanie, Sticker Pack) are deliberately excluded. Verified indirectly by Test 3 expecting exactly 5 cards.

### 2. Product card image rendering
Seed data has no image URLs (all `null`). The ProductCard shows a placeholder icon when `imageUrl` is null. This works but isn't explicitly tested — real images come when Printify sync is wired (EP-016).

### 3. Responsive grid layout
The product grid uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`. Not tested at different viewport sizes. Deferred to EP-009–010 (Polish) and EP-017.

### 4. Loading states
The home page is a Server Component (renders on the server), so there's no client-side loading state. No loading skeleton exists yet. Added at EP-009–010.

### 5. Empty state
If zero featured products exist, the page shows "No featured products yet." Not tested because seed data always provides 5 featured products. Would need to clear the database to test.

### 6. API error handling
What happens if the database is unreachable? The API would throw an unhandled error. Proper error responses come at EP-006 (API Hardening).

### 7. SEO metadata
The home page has a generic `<title>` from the root layout. Product-specific metadata isn't on the home page. SEO is addressed at EP-009–010.

---

## Issues discovered during testing

None. All 8 tests passed on the first run.
