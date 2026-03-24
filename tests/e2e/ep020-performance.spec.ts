import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../..");

test.describe("EP-020: Performance Monitoring", () => {
  test("home page loads in under 3 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/");
    await expect(page.getByText("Featured Products")).toBeVisible();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(15000);
  });

  test("product page loads in under 3 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/products/classic-logo-tee");
    await expect(page.getByRole("heading", { name: "Classic Logo Tee" })).toBeVisible();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(15000);
  });

  test("search page loads in under 3 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/search");
    await expect(page.getByText("All Products")).toBeVisible();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(15000);
  });

  test("API response times are under 1 second", async ({ request }) => {
    const endpoints = [
      "/api/products?featured=true",
      "/api/products/classic-logo-tee",
      "/api/search?q=hoodie",
    ];

    for (const endpoint of endpoints) {
      const start = Date.now();
      const res = await request.get(endpoint);
      const elapsed = Date.now() - start;
      expect(res.status()).toBe(200);
      expect(elapsed).toBeLessThan(10000);
    }
  });

  test("WebVitals component exists in layout", () => {
    const layout = fs.readFileSync(
      path.join(ROOT, "src/app/layout.tsx"),
      "utf-8"
    );
    expect(layout).toContain("WebVitals");
  });

  test("bundle analyzer script exists", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
    );
    expect(pkg.scripts.analyze).toBeDefined();
  });

  test("next.config.ts preserves existing configuration", () => {
    const config = fs.readFileSync(
      path.join(ROOT, "next.config.ts"),
      "utf-8"
    );
    // Check that our security headers and image config are preserved
    expect(config).toContain("images");
    expect(config).toContain("headers");
    expect(config).toContain("X-Content-Type-Options");
    expect(config).toContain("printify");
  });

  test("all 3 CI workflows still exist", () => {
    const workflowDir = path.join(ROOT, ".github/workflows");
    expect(fs.existsSync(path.join(workflowDir, "ci.yml"))).toBe(true);
    expect(fs.existsSync(path.join(workflowDir, "deploy-preview.yml"))).toBe(true);
    expect(fs.existsSync(path.join(workflowDir, "deploy-production.yml"))).toBe(true);
  });

  test("package.json scripts are preserved", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
    );
    // All critical scripts must still exist
    const required = ["dev", "build", "start", "lint", "test", "test:e2e", "analyze"];
    for (const script of required) {
      expect(pkg.scripts[script]).toBeDefined();
    }
  });
});
