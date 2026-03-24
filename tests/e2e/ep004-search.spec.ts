import { test, expect } from "@playwright/test";

test.describe("EP-004: Search", () => {
  test("search page shows all products when no query", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();
    await expect(page.getByText("10 products found")).toBeVisible();
  });

  test("search page has search input", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByRole("main").getByRole("searchbox")).toBeVisible();
  });

  test("search returns matching results", async ({ page }) => {
    await page.goto("/search?q=hoodie");
    await expect(page.getByText('Search results for "hoodie"')).toBeVisible();
    await expect(page.getByText("Premium Hoodie")).toBeVisible();
    await expect(page.getByText("1 product found")).toBeVisible();
  });

  test("search is case-insensitive", async ({ page }) => {
    await page.goto("/search?q=HOODIE");
    await expect(page.getByText("Premium Hoodie")).toBeVisible();
  });

  test("search by description text", async ({ page }) => {
    await page.goto("/search?q=stainless+steel");
    await expect(page.getByText("Insulated Water Bottle")).toBeVisible();
  });

  test("empty search results show message", async ({ page }) => {
    await page.goto("/search?q=xyznonexistent");
    await expect(page.getByText(/No products found for "xyznonexistent"/)).toBeVisible();
  });

  test("search form submits from search page", async ({ page }) => {
    await page.goto("/search");
    const searchInput = page.getByRole("main").getByRole("searchbox");
    await searchInput.fill("cap");
    await searchInput.press("Enter");
    await expect(page).toHaveURL(/q=cap/);
    await expect(page.getByText("Summer Cap")).toBeVisible();
  });

  test("search page has correct SEO title with query", async ({ page }) => {
    await page.goto("/search?q=hoodie");
    await expect(page).toHaveTitle("Search: hoodie | Merch Store");
  });

  test("search page has correct SEO title without query", async ({ page }) => {
    await page.goto("/search");
    await expect(page).toHaveTitle("Search | Merch Store");
  });

  test("search API returns correct results", async ({ request }) => {
    const response = await request.get("/api/search?q=tee");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data.some((p: { title: string }) => p.title === "Classic Logo Tee")).toBe(true);
    expect(body.pagination).toBeDefined();
  });

  test("search API returns all products with empty query", async ({ request }) => {
    const response = await request.get("/api/search");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.pagination.total).toBe(10);
  });

  test("product cards in search results link to product pages", async ({ page }) => {
    await page.goto("/search?q=hoodie");
    await page.getByText("Premium Hoodie").click();
    await expect(page).toHaveURL("/products/premium-hoodie");
  });
});
