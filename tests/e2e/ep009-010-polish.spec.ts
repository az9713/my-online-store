import { test, expect } from "@playwright/test";

test.describe("EP-009–010: Polish + Error States + SEO", () => {
  // Error pages
  test("404 page renders for unknown routes", async ({ page }) => {
    await page.goto("/some-nonexistent-page");
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("doesn't exist")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go Home" })).toBeVisible();
  });

  test("404 Go Home link works", async ({ page }) => {
    await page.goto("/some-nonexistent-page");
    await page.getByRole("link", { name: "Go Home" }).click();
    await expect(page).toHaveURL("/");
  });

  // SEO
  test("sitemap.xml is accessible", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("urlset");
    expect(body).toContain("/products/");
  });

  test("robots.txt is accessible", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("User-Agent");
    expect(body).toContain("Disallow: /api/");
    expect(body).toContain("sitemap");
  });

  test("home page has meta description", async ({ page }) => {
    await page.goto("/");
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute("content", /merch|storefront|products/i);
  });

  test("product page has dynamic meta title", async ({ page }) => {
    await page.goto("/products/classic-logo-tee");
    await expect(page).toHaveTitle(/Classic Logo Tee/);
  });

  test("search page has dynamic meta title", async ({ page }) => {
    await page.goto("/search?q=hoodie");
    await expect(page).toHaveTitle(/hoodie/i);
  });

  // Empty states
  test("empty cart shows message and browse link", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/cart");
    await expect(page.getByText("Your cart is empty")).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse Products" })).toBeVisible();
  });

  test("search with no results shows empty message", async ({ page }) => {
    await page.goto("/search?q=zzzznothing");
    await expect(page.getByText(/No products found/)).toBeVisible();
  });

  // Navigation completeness
  test("footer Home link goes to home page", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("contentinfo").getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/");
  });

  test("footer Products link goes to search page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: "Products" }).click();
    await expect(page).toHaveURL("/search");
  });
});
