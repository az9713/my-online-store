import { describe, it, expect, vi, afterEach } from "vitest";
import { getActiveProvider, isShopifyEnabled } from "@/lib/commerce/flags";

describe("Commerce Flags", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("getActiveProvider", () => {
    it("defaults to 'local' when no env var set", () => {
      vi.stubEnv("COMMERCE_PROVIDER", "");
      expect(getActiveProvider()).toBe("local");
    });

    it("returns 'printify' when set", () => {
      vi.stubEnv("COMMERCE_PROVIDER", "printify");
      expect(getActiveProvider()).toBe("printify");
    });

    it("returns 'shopify' when set", () => {
      vi.stubEnv("COMMERCE_PROVIDER", "shopify");
      expect(getActiveProvider()).toBe("shopify");
    });

    it("falls back to 'local' for unknown values", () => {
      vi.stubEnv("COMMERCE_PROVIDER", "unknown");
      expect(getActiveProvider()).toBe("local");
    });
  });

  describe("isShopifyEnabled", () => {
    it("returns false by default", () => {
      vi.stubEnv("SHOPIFY_ENABLED", "");
      expect(isShopifyEnabled()).toBe(false);
    });

    it("returns true when SHOPIFY_ENABLED=true", () => {
      vi.stubEnv("SHOPIFY_ENABLED", "true");
      expect(isShopifyEnabled()).toBe(true);
    });

    it("returns false for non-true values", () => {
      vi.stubEnv("SHOPIFY_ENABLED", "false");
      expect(isShopifyEnabled()).toBe(false);
    });
  });
});
