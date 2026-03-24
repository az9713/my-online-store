import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  // 1. Home page
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: "public/screenshots/home.png",
    fullPage: false,
  });
  console.log("✓ home.png");

  // 2. Home page – product grid (scrolled)
  await page.evaluate(() => window.scrollTo(0, 320));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "public/screenshots/products-grid.png",
    fullPage: false,
  });
  console.log("✓ products-grid.png");

  // 3. Product detail page
  await page.goto(`${BASE}/products/classic-logo-tee`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: "public/screenshots/product-detail.png",
    fullPage: false,
  });
  console.log("✓ product-detail.png");

  // 4. Search results
  await page.goto(`${BASE}/search?q=hoodie`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: "public/screenshots/search.png",
    fullPage: false,
  });
  console.log("✓ search.png");

  // 5. Cart page (empty)
  await page.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: "public/screenshots/cart-empty.png",
    fullPage: false,
  });
  console.log("✓ cart-empty.png");

  // 6. Add something to cart then screenshot
  await page.goto(`${BASE}/products/classic-logo-tee`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  // Select a size if available
  const sizeBtn = page.locator('button:has-text("M")').first();
  if (await sizeBtn.isVisible()) await sizeBtn.click();
  const addBtn = page.locator('button:has-text("Add to Cart")');
  if (await addBtn.isVisible()) await addBtn.click();
  await page.waitForTimeout(800);
  await page.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: "public/screenshots/cart-with-item.png",
    fullPage: false,
  });
  console.log("✓ cart-with-item.png");

  // 7. Sign-up page
  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: "public/screenshots/signup.png",
    fullPage: false,
  });
  console.log("✓ signup.png");

  await browser.close();
  console.log("\nAll screenshots saved to public/screenshots/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
