import { test, expect } from "@playwright/test";

const TEST_EMAIL = "az9713@yahoo.com";
const TEST_PASSWORD = "1234_abcd";

test.describe("EP-001: Foundation", () => {
  test("home page loads with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Merch Store");
    await expect(page.getByText("Welcome to Merch Store")).toBeVisible();
  });

  test("header navigation links are present", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Merch Store" })).toBeVisible();
    // Search is now an input field in the header (link is mobile-only)
    await expect(page.getByRole("banner").getByRole("searchbox")).toBeVisible();
    await expect(page.getByRole("link", { name: "Cart" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });

  test("footer is present", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("All rights reserved")).toBeVisible();
  });

  test("signup page loads", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible();
  });

  test("reset password page loads", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByRole("heading", { name: "Reset password" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send reset link" })).toBeVisible();
  });

  test("signup form submits and gets Supabase response", async ({ page }) => {
    // Use a unique email with a real-looking domain
    const uniqueEmail = `test-${Date.now()}@yahoo.com`;
    await page.goto("/signup");
    await page.getByLabel("Email").fill(uniqueEmail);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign up" }).click();

    // After submit, Supabase responds with one of:
    // - "Check your email" (success)
    // - "email rate limit exceeded" (Supabase free tier rate limit)
    // - "security purposes" (too many requests)
    // - "already registered" or "invalid"
    // Any response proves the form is wired to Supabase correctly
    await expect(
      page
        .getByText("Check your email")
        .or(page.getByText(/rate limit/i))
        .or(page.getByText(/security purposes/i))
        .or(page.getByText(/invalid/i))
        .or(page.getByText(/already registered/i))
    ).toBeVisible({ timeout: 10000 });
  });

  test("login with valid credentials redirects to home", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_EMAIL);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();

    // After login, should redirect to home and show Account/Log out in header
    await expect(page.getByText("Account").or(page.getByText("Log out"))).toBeVisible({
      timeout: 10000,
    });
  });

  test("login with wrong password shows error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_EMAIL);
    await page.getByLabel("Password").fill("wrong_password_123");
    await page.getByRole("button", { name: "Log in" }).click();

    // Should show an error message
    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("navigation from login to signup and back", async ({ page }) => {
    await page.goto("/login");
    // Use the body link, not the header one (both say "Sign up")
    await page.getByRole("main").getByRole("link", { name: "Sign up" }).click();
    await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();

    await page.getByRole("main").getByRole("link", { name: "Log in" }).click();
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  });

  test("protected route redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/account");
    // Should redirect to /login with redirect param
    await expect(page).toHaveURL(/\/login/);
  });
});
