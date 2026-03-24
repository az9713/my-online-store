# EP-005 Test Report — Cart + Server-Side Cart State

**Date:** March 2026
**Test file:** `tests/e2e/ep005-cart.spec.ts`
**Runner:** Playwright (Chromium)
**Result:** 11/11 passed in 45.9s

---

## What was tested

### Test 1: Empty cart shows empty state
Clears cookies, visits `/cart`, verifies "Your cart is empty" message and "Browse Products" link appear. Proves the empty cart UI renders correctly for new visitors.

### Test 2: Add item to cart from product page
Navigates to Summer Cap product page, clicks "Add to Cart", verifies "Added!" confirmation appears. Proves the add-to-cart API call from the product detail page works.

### Test 3: Cart page shows added item
Adds Summer Cap, navigates to `/cart`, verifies product name and "1 item" count appear. Tests the full add → view cycle.

### Test 4: Increase item quantity
Adds item, goes to cart, clicks "+" (Increase quantity), waits for "2 items" to appear. Proves the PUT endpoint and quantity update UI work.

### Test 5: Decrease item quantity
Adds item twice (quantity 2), goes to cart, clicks "-" (Decrease quantity), waits for "1 item". Proves quantity decrement works.

### Test 6: Remove item from cart
Adds item, goes to cart, clicks "Remove", verifies empty cart state appears. Proves the DELETE endpoint and UI refresh work.

### Test 7: Adding same variant twice increases quantity
Adds Summer Cap twice from product page, goes to cart, verifies "2 items" with only 1 "Remove" button. Proves the upsert logic — same variant added twice increments quantity rather than creating a duplicate line item.

### Test 8: Cart API — add item
Direct API test: fetches Summer Cap product ID/variant ID, POSTs to `/api/cart/items`, verifies 201 status. Tests the API independently from the UI.

### Test 9: Cart API — reject out of stock variant
Finds the out-of-stock Sage/L variant of Vintage Long Sleeve, attempts to add it, verifies 409 status with `OUT_OF_STOCK` error code. Proves the stock check prevents adding unavailable items.

### Test 10: Cart API — reject missing fields
POSTs empty body to `/api/cart/items`, verifies 400 status. Proves input validation works.

### Test 11: Subtotal calculates correctly
Adds Classic Logo Tee ($24.99) to cart, verifies "Subtotal" label and $24.99 amount appear together. Proves price calculation works.

---

## What was NOT tested and why

### 1. Cart merge on login
When an anonymous user adds items to cart and then logs in, the anonymous cart should merge into their user cart. This is implemented (`mergeAnonymousCart` function in `session.ts`) but not triggered from the UI yet — the login flow doesn't call it. Will be wired and tested at EP-008 (Auth Hardening).

### 2. Cart persistence across browser sessions
After adding items and closing the browser, does the cart survive? It should — the session ID is stored in a 30-day cookie and the cart is in the database. Not explicitly tested because Playwright's `clearCookies()` prevents cross-test persistence, and testing "close browser, reopen" requires a different Playwright context setup.

### 3. Multiple items from different products
All tests use a single product. Adding multiple different products to the same cart (e.g., Summer Cap + Classic Logo Tee) isn't explicitly tested. The code handles it (each gets its own CartItem row), but no test verifies two different products in one cart view.

### 4. Cart badge in header
The plan mentions a cart count badge in the header nav. Not built yet — the Header component doesn't fetch the cart count. Deferred to a future polish pass.

### 5. Optimistic UI updates
The cart page currently refetches after every mutation (add/update/remove). True optimistic updates (update the UI instantly, revert on API failure) are not implemented. The current approach is simpler and sufficient for now.

### 6. Checkout button
The cart page has a disabled "Checkout (Coming Soon)" button. Functional checkout comes at EP-018 (Stripe integration).

### 7. Cart expiration / abandoned cart cleanup
Carts live in the database forever. No cleanup job deletes old abandoned carts. Not a concern for an MVP but would matter at scale.

### 8. Concurrent cart operations
Two browser tabs adding items to the same cart simultaneously. The server handles this correctly (each request reads the current state), but it's not tested.

---

## Issues discovered and resolved during testing

### Issue 1: Price appearing in multiple elements
`getByText("$19.99")` matched both the line total and the subtotal (same value for a single-item cart). Fixed by removing the ambiguous price check from Test 3 and using a more specific locator for Test 11 (checking the price next to the "Subtotal" label).

**Lesson:** When the same text value appears in multiple places, use structural locators (parent/sibling relationships) rather than global text search.

### Issue 2: Test timing for cart refresh
After clicking "+" to increase quantity, the cart refetches from the API. The test needed `{ timeout: 5000 }` to wait for the re-render. The default 5s timeout was sufficient, but the explicit timeout documents the async nature.

---

## Test quality assessment

| Aspect | Rating | Notes |
|---|---|---|
| **Coverage** | Good | Full CRUD cycle (add/update/remove) tested both via UI and API |
| **Edge cases** | Good | Empty cart, out-of-stock rejection, missing fields, duplicate adds |
| **User journeys** | Good | Product page → add → cart → modify → remove tested |
| **API testing** | Good | 3 API-specific tests covering success, validation, and business logic |
| **Test isolation** | Good | Each test clears cookies for a fresh session |
| **Speed** | Adequate | 45.9s is slower than previous EPs due to multiple page navigations per test |
