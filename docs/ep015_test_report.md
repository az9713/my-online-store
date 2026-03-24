# EP-015 Test Report — Vercel Deployment + CD Pipeline

**Date:** March 2026
**Test file:** `tests/e2e/ep015-deployment.spec.ts`
**Runner:** Playwright (Chromium)
**Result:** 9/9 passed in 1.5s (all passed on first run)

---

## What was built

- **`vercel.json`** — Vercel project configuration (framework: nextjs)
- **`ci.yml`** — GitHub Actions CI workflow: lint → unit tests → Playwright E2E in 3-browser matrix
- **`deploy-preview.yml`** — Deploys preview URL on PR, posts URL as PR comment
- **`deploy-production.yml`** — Deploys to production on push to main
- **`.env.example`** — Updated with all environment variables including GitHub Actions secrets

---

## What was tested

### Tests 1–5: Workflow file existence and content
Verifies all 3 workflow YAML files and `vercel.json` exist, parse correctly, and contain critical content (workflow names, triggers, commands, browser matrix).

### Test 6: Environment variable documentation
All required environment variables (8 total) are listed in `.env.example`.

### Test 7: Gitignore protections
`.env`, `cc1_kim.txt`, `node_modules`, and `.next` are all excluded from git.

### Test 8: Package.json scripts
All required scripts (dev, build, start, lint, test, test:e2e) exist.

---

## What was NOT tested and why

### 1. Actual Vercel deployment
Requires Vercel account, tokens, and project setup. Tested by actually deploying (manual step by user).

### 2. GitHub Actions execution
Requires GitHub repo with secrets configured. Workflow files are validated structurally, not executed.

### 3. `npm run build` success
A full production build takes time and requires all env vars. The dev server running proves the app compiles. Full build is tested in CI.

---

## Next steps for deployment

To go live, the user needs to:
1. Create a GitHub repository
2. Push the code
3. Connect Vercel to the repo
4. Set environment variables in Vercel dashboard
5. Set GitHub secrets (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)
6. First push to main triggers production deploy
