/**
 * Feature flags for commerce provider switching.
 *
 * Currently defaults to "local" (seed data in Postgres).
 * Future providers:
 * - "printify" — sync products from Printify API (EP-016)
 * - "shopify" — sync products from Shopify Storefront API (future)
 */
export function getActiveProvider(): "local" | "printify" | "shopify" {
  const flag = process.env.COMMERCE_PROVIDER;
  if (flag === "printify" || flag === "shopify") return flag;
  return "local";
}

export function isShopifyEnabled(): boolean {
  return process.env.SHOPIFY_ENABLED === "true";
}
