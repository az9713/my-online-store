# EP-019 Test Report — Accessibility Audit + WCAG 2.1 AA Fixes

**Date:** March 2026
**Test file:** `tests/e2e/ep019-accessibility.spec.ts`
**Runner:** Playwright (Chromium) + axe-core
**Result:** 10/10 passed (after fixing 1 accessibility violation)

---

## What was built

- **axe-core integration** into Playwright tests — automated WCAG 2.1 AA scanning on every page
- **Link underline fix** — all inline text links now have `underline` styling for WCAG compliance (links must be distinguishable from surrounding text without relying on color alone)

---

## What was tested

### Tests 1–5: axe-core scans on all major pages
Each page scanned for WCAG 2.1 A and AA violations. Zero critical/serious violations allowed:
- Home page: pass
- Product detail page: pass
- Search page: pass
- Login page: pass (after underline fix)
- Signup page: pass (after underline fix)

### Tests 6–10: Manual accessibility checks
- HTML `lang="en"` attribute present
- All form inputs have associated `<label>` elements
- Single `<h1>` per page (proper heading hierarchy)
- Landmark regions present: `<header>` (banner), `<main>`, `<footer>` (contentinfo)
- Keyboard tab navigation works through the page

---

## Accessibility issue found and fixed

**Issue:** Inline links in auth pages (login, signup, reset password) used `text-blue-600` without underline. axe-core flagged this as a "serious" WCAG 1.4.1 violation — links must be distinguishable from surrounding text in a way that doesn't rely on color alone.

**Fix:** Added `underline` class to all inline text links (`text-blue-600 underline hover:text-blue-500`). This makes links visually distinguishable even for users who can't perceive color differences.

**Files fixed:** All auth pages (login, signup, reset-password) and account pages.

---

## What was NOT tested and why

### 1. Cart page accessibility
The cart page is a client component with dynamic content (add/remove items). axe-core scanning on a dynamic page requires the cart to be populated first. The structural accessibility (labels, buttons, ARIA) is tested indirectly through the cart E2E tests which use `getByRole` and `getByLabel`.

### 2. Focus trap in modals/drawers
The app doesn't have modals or drawers yet. Focus trapping would be needed if a cart drawer or mobile menu overlay is added. Not applicable currently.

### 3. Color contrast ratio audit
axe-core checks contrast ratios automatically. No additional manual audit was performed beyond what axe-core covers.

### 4. Screen reader testing
Automated testing can't fully replicate screen reader behavior. Manual testing with NVDA/VoiceOver is recommended before launch but not done in E2E tests.

### 5. Mobile accessibility
Viewport-specific issues (touch targets, zoom behavior) not tested. axe-core runs at the default desktop viewport.
