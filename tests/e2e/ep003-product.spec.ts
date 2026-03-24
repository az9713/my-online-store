import { test, expect } from "@playwright/test";

test.describe("EP-003: Product Detail Page", () => {
  test("product page loads by slug", async ({ page }) => {
    await page.goto("/products/classic-logo-tee");
    await expect(page.getByRole("heading", { name: "Classic Logo Tee" })).toBeVisible();
    await expect(page.getByText("$24.99")).toBeVisible();
    await expect(page.getByText("comfortable cotton t-shirt")).toBeVisible();
  });

  test("product page has correct SEO title", async ({ page }) => {
    await page.goto("/products/premium-hoodie");
    await expect(page).toHaveTitle("Premium Hoodie | Merch Store");
  });

  test("variant selector shows options", async ({ page }) => {
    await page.goto("/products/classic-logo-tee");
    // Classic Logo Tee has Color and Size options
    await expect(page.getByText("Color", { exact: true })).toBeVisible();
    await expect(page.getByText("Size", { exact: true })).toBeVisible();
    // Check some option values
    const main = page.getByRole("main");
    await expect(main.getByRole("button", { name: "Black" })).toBeVisible();
    await expect(main.getByRole("button", { name: "White" })).toBeVisible();
    await expect(main.getByRole("button", { name: "S", exact: true })).toBeVisible();
    await expect(main.getByRole("button", { name: "M", exact: true })).toBeVisible();
    await expect(main.getByRole("button", { name: "L", exact: true })).toBeVisible();
  });

  test("clicking variant updates selected variant text", async ({ page }) => {
    await page.goto("/products/classic-logo-tee");
    // Click White
    await page.getByRole("button", { name: "White" }).click();
    // Should show a selected variant containing "White"
    await expect(page.getByText(/Selected:.*White/)).toBeVisible();
  });

  test("product with single option group shows selector", async ({ page }) => {
    // Summer Cap only has Color option, no Size
    await page.goto("/products/summer-cap");
    await expect(page.getByText("Color")).toBeVisible();
    await expect(page.getByRole("button", { name: "Black" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Red" })).toBeVisible();
  });

  test("Add to Cart button is present", async ({ page }) => {
    await page.goto("/products/classic-logo-tee");
    await expect(page.getByRole("button", { name: "Add to Cart" })).toBeVisible();
  });

  test("out of stock variant shows out of stock state", async ({ page }) => {
    // Vintage Long Sleeve has Sage/L as out of stock
    await page.goto("/products/long-sleeve-vintage");
    const main = page.getByRole("main");
    // Click L first, then Sage to get Sage/L (which is out of stock)
    await main.getByRole("button", { name: "L", exact: true }).click();
    await main.getByRole("button", { name: "Sage" }).click();
    // Both the label "(Out of stock)" and button "Out of Stock" appear
    await expect(page.getByRole("button", { name: "Out of Stock" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Out of Stock" })).toBeDisabled();
  });

  test("invalid slug returns 404", async ({ page }) => {
    const response = await page.goto("/products/does-not-exist");
    expect(response?.status()).toBe(404);
  });

  test("product API returns product by slug", async ({ request }) => {
    const response = await request.get("/api/products/premium-hoodie");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data.title).toBe("Premium Hoodie");
    expect(body.data.slug).toBe("premium-hoodie");
    expect(body.data.basePrice).toBe(54.99);
    expect(body.data.variants.length).toBe(5);
  });

  test("product API returns 404 for unknown slug", async ({ request }) => {
    const response = await request.get("/api/products/nonexistent-product");
    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body.error.code).toBe("PRODUCT_NOT_FOUND");
  });

  test("clicking product card from home navigates to product page", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Classic Logo Tee").click();
    await expect(page).toHaveURL("/products/classic-logo-tee");
    await expect(page.getByRole("heading", { name: "Classic Logo Tee" })).toBeVisible();
  });
});
