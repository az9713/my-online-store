# EP-020 Test Report — Performance Monitoring + Core Web Vitals

**Date:** March 2026
**Test file:** `tests/e2e/ep020-performance.spec.ts`
**Runner:** Playwright (Chromium)
**Result:** 9/9 passed in 36.2s

---

## What was built

- **Web Vitals component** (`src/components/analytics/WebVitals.tsx`) — tracks LCP, INP, CLS using the `web-vitals` library, injected into root layout
- **Bundle analyzer script** (`npm run analyze`) — runs Next.js build with `@next/bundle-analyzer` enabled
- **Performance test baselines** — page load and API response time thresholds

---

## What was tested

### Tests 1–3: Page load performance
- Home page loads in under 15s (dev mode threshold — production target: <3s)
- Product page loads in under 15s
- Search page loads in under 15s

Note: Dev mode thresholds are relaxed because Next.js compiles on demand in development. Production build would be 2-5x faster. Lighthouse CI (in GitHub Actions) would enforce stricter production thresholds.

### Test 4: API response times
All 3 API endpoints respond in under 10s (dev mode):
- `GET /api/products?featured=true`
- `GET /api/products/classic-logo-tee`
- `GET /api/search?q=hoodie`

### Tests 5–9: Configuration preservation
- WebVitals component exists in root layout
- Bundle analyzer script defined in package.json
- `next.config.ts` preserves images, headers, and Printify config
- All 3 CI workflows still exist
- All required package.json scripts (dev, build, start, lint, test, test:e2e, analyze) present

---

## What was NOT tested and why

### 1. Lighthouse CI in GitHub Actions
Lighthouse CI is configured in `ci.yml` (to be added as a step). Actual Lighthouse scoring requires a production build running on a server. Can't be tested locally in dev mode meaningfully.

### 2. Bundle size regression
The `npm run analyze` script works but no baseline is established yet. First production build will set the baseline, then CI can detect regressions.

### 3. Image optimization
All seed data uses placeholder icons (no real images). `next/image` optimization will matter when Printify product images are synced.

### 4. Code splitting verification
Next.js automatically code-splits by route. No manual verification was done. Bundle analyzer output would show this.

---

## Performance notes for production

When deployed to Vercel:
- **Expected page loads:** 1-2 seconds (SSR + edge caching)
- **Expected API responses:** 50-200ms (serverless functions + Supabase Postgres)
- **Lighthouse targets:** Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 90, SEO ≥ 90
- **Core Web Vitals targets:** LCP < 2.5s, INP < 200ms, CLS < 0.1
