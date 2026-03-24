import { test, expect } from "@playwright/test";

test.describe("EP-011–014: Foundation Hardening", () => {
  // Security headers
  test("responses include X-Content-Type-Options header", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("responses include X-Frame-Options header", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
  });

  test("responses include Referrer-Policy header", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("responses include Permissions-Policy header", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["permissions-policy"]).toContain("camera=()");
  });

  // API robustness
  test("API handles malformed JSON gracefully", async ({ request }) => {
    const res = await request.post("/api/cart/items", {
      headers: { "Content-Type": "application/json" },
      data: "this is not json",
    });
    // Should get a 400 or 500, not crash the server
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("product API handles special characters in slug", async ({ request }) => {
    const res = await request.get("/api/products/%3Cscript%3Ealert(1)%3C%2Fscript%3E");
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("PRODUCT_NOT_FOUND");
  });

  test("search API handles SQL-like input safely", async ({ request }) => {
    const res = await request.get("/api/search?q=' OR 1=1 --");
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Should return empty or filtered results, not all products
    expect(body.data.length).toBeLessThan(10);
  });

  // Database indexes (tested via query performance - fast responses)
  test("product slug lookup is fast", async ({ request }) => {
    const start = Date.now();
    const res = await request.get("/api/products/classic-logo-tee");
    const elapsed = Date.now() - start;
    expect(res.status()).toBe(200);
    expect(elapsed).toBeLessThan(2000); // Under 2s including network
  });

  test("search query is fast", async ({ request }) => {
    const start = Date.now();
    const res = await request.get("/api/search?q=hoodie");
    const elapsed = Date.now() - start;
    expect(res.status()).toBe(200);
    expect(elapsed).toBeLessThan(2000);
  });

  // Commerce provider fields exist
  test("all products have commerceProvider field", async ({ request }) => {
    const res = await request.get("/api/products");
    const body = await res.json();
    for (const product of body.data) {
      expect(product.commerceProvider).toBeDefined();
    }
  });

  // Consistent API behavior
  test("all list endpoints return pagination", async ({ request }) => {
    const endpoints = ["/api/products", "/api/search", "/api/products?featured=true"];
    for (const endpoint of endpoints) {
      const res = await request.get(endpoint);
      const body = await res.json();
      expect(body.pagination).toBeDefined();
      expect(body.pagination).toHaveProperty("page");
      expect(body.pagination).toHaveProperty("pageSize");
      expect(body.pagination).toHaveProperty("total");
    }
  });

  // Full regression
  test("complete user journey still works after hardening", async ({ page }) => {
    await page.context().clearCookies();

    // Home
    await page.goto("/");
    await expect(page.getByText("Featured Products")).toBeVisible();

    // Product
    await page.getByText("Classic Logo Tee").click();
    await expect(page.getByRole("heading", { name: "Classic Logo Tee" })).toBeVisible();

    // Add to cart
    await page.getByRole("main").getByRole("button", { name: "Add to Cart" }).click();
    await expect(page.getByText("Added!")).toBeVisible();

    // Cart
    await page.goto("/cart");
    await expect(page.getByText("Classic Logo Tee")).toBeVisible();
    await expect(page.getByText("Subtotal")).toBeVisible();
  });
});
