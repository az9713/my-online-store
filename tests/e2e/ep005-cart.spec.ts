import { test, expect } from "@playwright/test";

test.describe("EP-005: Cart", () => {
  test("empty cart shows empty state", async ({ page }) => {
    // Clear cookies for a fresh session
    await page.context().clearCookies();
    await page.goto("/cart");
    await expect(page.getByText("Your cart is empty")).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse Products" })).toBeVisible();
  });

  test("add item to cart from product page", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/products/summer-cap");
    await page.getByRole("main").getByRole("button", { name: "Add to Cart" }).click();
    await expect(page.getByText("Added!")).toBeVisible();
  });

  test("cart page shows added item", async ({ page }) => {
    await page.context().clearCookies();
    // Add a product
    await page.goto("/products/summer-cap");
    await page.getByRole("main").getByRole("button", { name: "Add to Cart" }).click();
    await expect(page.getByText("Added!")).toBeVisible();

    // Go to cart
    await page.goto("/cart");
    await expect(page.getByText("Summer Cap")).toBeVisible();
    await expect(page.getByText("1 item")).toBeVisible();
    await expect(page.getByText("Subtotal")).toBeVisible();
  });

  test("increase item quantity", async ({ page }) => {
    await page.context().clearCookies();
    // Add a product
    await page.goto("/products/summer-cap");
    await page.getByRole("main").getByRole("button", { name: "Add to Cart" }).click();
    await expect(page.getByText("Added!")).toBeVisible();

    // Go to cart and increase quantity
    await page.goto("/cart");
    await page.getByRole("button", { name: "Increase quantity" }).click();
    // Wait for the cart to refresh
    await expect(page.getByText("2 items")).toBeVisible({ timeout: 5000 });
  });

  test("decrease item quantity", async ({ page }) => {
    await page.context().clearCookies();
    // Add a product twice (from product page)
    await page.goto("/products/summer-cap");
    await page.getByRole("main").getByRole("button", { name: "Add to Cart" }).click();
    await expect(page.getByText("Added!")).toBeVisible();
    await page.waitForTimeout(500);
    await page.getByRole("main").getByRole("button", { name: "Add to Cart" }).click();
    await expect(page.getByText("Added!")).toBeVisible();

    // Go to cart and decrease
    await page.goto("/cart");
    await expect(page.getByText("2 items")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Decrease quantity" }).click();
    await expect(page.getByText("1 item")).toBeVisible({ timeout: 5000 });
  });

  test("remove item from cart", async ({ page }) => {
    await page.context().clearCookies();
    // Add a product
    await page.goto("/products/summer-cap");
    await page.getByRole("main").getByRole("button", { name: "Add to Cart" }).click();
    await expect(page.getByText("Added!")).toBeVisible();

    // Go to cart and remove
    await page.goto("/cart");
    await expect(page.getByText("Summer Cap")).toBeVisible();
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("Your cart is empty")).toBeVisible({ timeout: 5000 });
  });

  test("adding same variant twice increases quantity", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/products/summer-cap");
    await page.getByRole("main").getByRole("button", { name: "Add to Cart" }).click();
    await expect(page.getByText("Added!")).toBeVisible();
    await page.waitForTimeout(500);
    await page.getByRole("main").getByRole("button", { name: "Add to Cart" }).click();
    await expect(page.getByText("Added!")).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByText("2 items")).toBeVisible({ timeout: 5000 });
    // Should still be only 1 line item (same variant, quantity 2)
    const removeButtons = page.getByRole("button", { name: "Remove" });
    await expect(removeButtons).toHaveCount(1);
  });

  test("cart API - add item", async ({ request }) => {
    // First get products to find valid IDs
    const productsRes = await request.get("/api/products/summer-cap");
    const { data: product } = await productsRes.json();
    const variant = product.variants[0];

    const addRes = await request.post("/api/cart/items", {
      data: {
        productId: product.id,
        variantId: variant.id,
        quantity: 1,
      },
    });
    expect(addRes.status()).toBe(201);
  });

  test("cart API - reject out of stock variant", async ({ request }) => {
    // Vintage Long Sleeve has an out-of-stock variant (Sage/L)
    const productsRes = await request.get("/api/products/long-sleeve-vintage");
    const { data: product } = await productsRes.json();
    const outOfStockVariant = product.variants.find(
      (v: { inStock: boolean }) => !v.inStock
    );

    if (outOfStockVariant) {
      const addRes = await request.post("/api/cart/items", {
        data: {
          productId: product.id,
          variantId: outOfStockVariant.id,
          quantity: 1,
        },
      });
      expect(addRes.status()).toBe(409);
      const body = await addRes.json();
      expect(body.error.code).toBe("OUT_OF_STOCK");
    }
  });

  test("cart API - reject missing fields", async ({ request }) => {
    const addRes = await request.post("/api/cart/items", {
      data: {},
    });
    expect(addRes.status()).toBe(400);
  });

  test("subtotal calculates correctly", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/products/classic-logo-tee");
    await page.getByRole("main").getByRole("button", { name: "Add to Cart" }).click();
    await expect(page.getByText("Added!")).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByText("Subtotal")).toBeVisible();
    // Price appears in both line total and subtotal — check subtotal specifically
    await expect(page.locator("text=Subtotal").locator("..").getByText("$24.99")).toBeVisible();
  });
});
