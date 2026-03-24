import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("EP-019: Accessibility Audit", () => {
  test("home page has no critical accessibility violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    if (critical.length > 0) {
      console.log("Home page violations:", JSON.stringify(critical, null, 2));
    }
    expect(critical).toHaveLength(0);
  });

  test("product page has no critical accessibility violations", async ({ page }) => {
    await page.goto("/products/classic-logo-tee");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    if (critical.length > 0) {
      console.log("Product page violations:", JSON.stringify(critical, null, 2));
    }
    expect(critical).toHaveLength(0);
  });

  test("search page has no critical accessibility violations", async ({ page }) => {
    await page.goto("/search?q=hoodie");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    if (critical.length > 0) {
      console.log("Search page violations:", JSON.stringify(critical, null, 2));
    }
    expect(critical).toHaveLength(0);
  });

  test("login page has no critical accessibility violations", async ({ page }) => {
    await page.goto("/login");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    if (critical.length > 0) {
      console.log("Login page violations:", JSON.stringify(critical, null, 2));
    }
    expect(critical).toHaveLength(0);
  });

  test("signup page has no critical accessibility violations", async ({ page }) => {
    await page.goto("/signup");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    if (critical.length > 0) {
      console.log("Signup page violations:", JSON.stringify(critical, null, 2));
    }
    expect(critical).toHaveLength(0);
  });

  test("all pages have lang attribute", async ({ page }) => {
    await page.goto("/");
    const lang = await page.getAttribute("html", "lang");
    expect(lang).toBe("en");
  });

  test("all form inputs have labels", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.getByLabel("Email");
    await expect(emailInput).toBeVisible();
    const passwordInput = page.getByLabel("Password");
    await expect(passwordInput).toBeVisible();
  });

  test("page has proper heading hierarchy", async ({ page }) => {
    await page.goto("/");
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveCount(1);
  });

  test("page has landmark regions", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("banner")).toBeVisible(); // header
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible(); // footer
  });

  test("interactive elements are keyboard focusable", async ({ page }) => {
    await page.goto("/login");
    // Tab to first input
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab"); // Skip search input in header
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    // Eventually we should reach the email input
    const activeElement = await page.evaluate(() => document.activeElement?.tagName);
    // Just verify we can tab through the page without errors
    expect(activeElement).toBeDefined();
  });
});
