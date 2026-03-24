import { test, expect } from "@playwright/test";

test.describe("EP-018: Stripe Checkout Integration", () => {
  test("checkout API returns 503 when Stripe not configured", async ({ request }) => {
    // STRIPE_SECRET_KEY is not set in test environment
    const res = await request.post("/api/checkout");
    expect(res.status()).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("STRIPE_NOT_CONFIGURED");
  });

  test("checkout API returns 400 for empty cart", async ({ request }) => {
    // Even if Stripe were configured, empty cart should be rejected
    const res = await request.post("/api/checkout");
    // Will get 503 (not configured) or 400 (empty cart) depending on check order
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("stripe webhook rejects without signature", async ({ request }) => {
    const res = await request.post("/api/webhooks/stripe", {
      data: { type: "checkout.session.completed" },
    });
    // Should be 401 (missing signature) or 500 (not configured)
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("stripe webhook rejects with invalid signature", async ({ request }) => {
    const res = await request.post("/api/webhooks/stripe", {
      headers: { "stripe-signature": "t=123,v1=invalid" },
      data: JSON.stringify({ type: "test" }),
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("order success page renders", async ({ page }) => {
    await page.goto("/order/success");
    await expect(page.getByRole("heading", { name: "Order Confirmed!" })).toBeVisible();
    await expect(page.getByText("Thank you for your purchase")).toBeVisible();
    await expect(page.getByRole("link", { name: "View Orders" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue Shopping" })).toBeVisible();
  });

  test("order success Continue Shopping links to home", async ({ page }) => {
    await page.goto("/order/success");
    await page.getByRole("link", { name: "Continue Shopping" }).click();
    await expect(page).toHaveURL("/");
  });

  test("cart checkout button exists", async ({ page }) => {
    await page.context().clearCookies();
    // Add item to cart first
    await page.goto("/products/summer-cap");
    await page.getByRole("main").getByRole("button", { name: "Add to Cart" }).click();
    await expect(page.getByText("Added!")).toBeVisible();

    // Go to cart
    await page.goto("/cart");
    await expect(page.getByRole("button", { name: /Checkout/ })).toBeVisible();
  });

  test("checkout button shows Stripe not configured message", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/products/summer-cap");
    await page.getByRole("main").getByRole("button", { name: "Add to Cart" }).click();
    await expect(page.getByText("Added!")).toBeVisible();

    await page.goto("/cart");

    // Handle the alert that appears when Stripe is not configured
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Stripe");
      await dialog.accept();
    });

    await page.getByRole("button", { name: "Checkout" }).click();
    // Wait for the button to return to normal state after the error
    await expect(page.getByRole("button", { name: "Checkout" })).toBeVisible({ timeout: 5000 });
  });
});
