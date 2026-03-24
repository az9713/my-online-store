import { test, expect } from "@playwright/test";

test.describe("EP-002: Home Page", () => {
  test("home page shows hero section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Welcome to Merch Store" })).toBeVisible();
    await expect(page.getByText("Custom merchandise")).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse All Products" })).toBeVisible();
  });

  test("home page shows Featured Products heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Featured Products" })).toBeVisible();
  });

  test("home page displays featured product cards", async ({ page }) => {
    await page.goto("/");
    // We seeded 5 featured products
    const cards = page.locator("a[href^='/products/']");
    await expect(cards).toHaveCount(5);
  });

  test("product cards show title and price", async ({ page }) => {
    await page.goto("/");
    // Check at least one known product from seed data
    await expect(page.getByText("Classic Logo Tee")).toBeVisible();
    await expect(page.getByText("$24.99")).toBeVisible();
  });

  test("product cards link to product detail pages", async ({ page }) => {
    await page.goto("/");
    const firstCard = page.locator("a[href^='/products/']").first();
    const href = await firstCard.getAttribute("href");
    expect(href).toMatch(/^\/products\/[\w-]+$/);
  });

  test("Browse All Products links to search page", async ({ page }) => {
    await page.goto("/");
    const browseLink = page.getByRole("link", { name: "Browse All Products" });
    await expect(browseLink).toHaveAttribute("href", "/search");
  });

  test("products API returns featured products", async ({ request }) => {
    const response = await request.get("/api/products?featured=true");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBe(5);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBe(5);

    // Each product should have expected fields
    const product = body.data[0];
    expect(product.title).toBeDefined();
    expect(product.slug).toBeDefined();
    expect(product.basePrice).toBeDefined();
    expect(product.variants).toBeInstanceOf(Array);
  });

  test("products API supports pagination", async ({ request }) => {
    const response = await request.get("/api/products?page=1&pageSize=2");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data.length).toBe(2);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.pageSize).toBe(2);
    expect(body.pagination.total).toBe(10); // all 10 products
  });
});
