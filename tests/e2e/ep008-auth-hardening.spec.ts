import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.TEST_EMAIL ?? "test@example.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "changeme";

// Helper: login and wait for auth state to propagate
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(TEST_EMAIL);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  // Wait for the header to update — proves session is established
  await expect(page.getByRole("link", { name: "Account" })).toBeVisible({ timeout: 10000 });
}

test.describe("EP-008: Auth Hardening + User Features", () => {
  test("account page shows user email when logged in", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Account" }).click();
    await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
    await expect(page.getByText(TEST_EMAIL)).toBeVisible();
    await expect(page.getByText("Profile")).toBeVisible();
  });

  test("account page shows order history link", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Account" }).click();
    await expect(page.getByRole("link", { name: "View orders" })).toBeVisible();
  });

  test("orders page shows empty state for new user", async ({ page }) => {
    await login(page);
    await page.goto("/account/orders");
    await expect(page.getByRole("heading", { name: "Order History" })).toBeVisible();
    await expect(page.getByText("No orders yet")).toBeVisible();
  });

  test("reset password confirm page renders", async ({ page }) => {
    await page.goto("/reset-password/confirm");
    await expect(page.getByRole("heading", { name: "Set new password" })).toBeVisible();
    await expect(page.getByLabel("New password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Update password" })).toBeVisible();
  });

  test("unauthenticated access to /account redirects to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated access to /account/orders redirects to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/account/orders");
    await expect(page).toHaveURL(/\/login/);
  });

  test("logout returns to home page", async ({ page }) => {
    await login(page);
    await page.getByText("Log out").click();
    // Should redirect to home
    await page.waitForURL("/", { timeout: 10000 });
    // Should see login/signup links again
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible({ timeout: 5000 });
  });

  test("login → account → orders full journey", async ({ page }) => {
    await login(page);

    // Click Account in header
    await page.getByRole("link", { name: "Account" }).click();
    await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();

    // Click View orders
    await page.getByRole("link", { name: "View orders" }).click();
    await expect(page.getByRole("heading", { name: "Order History" })).toBeVisible();
  });
});
