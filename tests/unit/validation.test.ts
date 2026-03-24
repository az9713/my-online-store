import { describe, it, expect } from "vitest";
import { addToCartSchema, updateCartItemSchema, paginationSchema, searchQuerySchema } from "@/lib/api/validation";

describe("Validation Schemas", () => {
  describe("addToCartSchema", () => {
    it("accepts valid input", () => {
      const result = addToCartSchema.safeParse({
        productId: "550e8400-e29b-41d4-a716-446655440000",
        variantId: "550e8400-e29b-41d4-a716-446655440001",
        quantity: 2,
      });
      expect(result.success).toBe(true);
    });

    it("defaults quantity to 1", () => {
      const result = addToCartSchema.safeParse({
        productId: "550e8400-e29b-41d4-a716-446655440000",
        variantId: "550e8400-e29b-41d4-a716-446655440001",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(1);
      }
    });

    it("rejects non-UUID productId", () => {
      const result = addToCartSchema.safeParse({
        productId: "not-a-uuid",
        variantId: "550e8400-e29b-41d4-a716-446655440001",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing productId", () => {
      const result = addToCartSchema.safeParse({
        variantId: "550e8400-e29b-41d4-a716-446655440001",
      });
      expect(result.success).toBe(false);
    });

    it("rejects quantity over 99", () => {
      const result = addToCartSchema.safeParse({
        productId: "550e8400-e29b-41d4-a716-446655440000",
        variantId: "550e8400-e29b-41d4-a716-446655440001",
        quantity: 100,
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero quantity", () => {
      const result = addToCartSchema.safeParse({
        productId: "550e8400-e29b-41d4-a716-446655440000",
        variantId: "550e8400-e29b-41d4-a716-446655440001",
        quantity: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative quantity", () => {
      const result = addToCartSchema.safeParse({
        productId: "550e8400-e29b-41d4-a716-446655440000",
        variantId: "550e8400-e29b-41d4-a716-446655440001",
        quantity: -5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateCartItemSchema", () => {
    it("accepts valid quantity", () => {
      const result = updateCartItemSchema.safeParse({ quantity: 5 });
      expect(result.success).toBe(true);
    });

    it("accepts zero quantity (remove)", () => {
      const result = updateCartItemSchema.safeParse({ quantity: 0 });
      expect(result.success).toBe(true);
    });

    it("rejects negative quantity", () => {
      const result = updateCartItemSchema.safeParse({ quantity: -1 });
      expect(result.success).toBe(false);
    });

    it("rejects missing quantity", () => {
      const result = updateCartItemSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects non-number quantity", () => {
      const result = updateCartItemSchema.safeParse({ quantity: "five" });
      expect(result.success).toBe(false);
    });
  });

  describe("paginationSchema", () => {
    it("accepts valid pagination", () => {
      const result = paginationSchema.safeParse({ page: 2, pageSize: 10 });
      expect(result.success).toBe(true);
    });

    it("defaults to page 1 and pageSize 20", () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
      }
    });

    it("coerces string numbers", () => {
      const result = paginationSchema.safeParse({ page: "3", pageSize: "15" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.pageSize).toBe(15);
      }
    });

    it("clamps pageSize to max 50", () => {
      const result = paginationSchema.safeParse({ pageSize: 100 });
      expect(result.success).toBe(false);
    });
  });

  describe("searchQuerySchema", () => {
    it("accepts query with defaults", () => {
      const result = searchQuerySchema.safeParse({ q: "hoodie" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.q).toBe("hoodie");
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(12);
      }
    });

    it("defaults to empty query", () => {
      const result = searchQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.q).toBe("");
      }
    });

    it("trims whitespace from query", () => {
      const result = searchQuerySchema.safeParse({ q: "  hoodie  " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.q).toBe("hoodie");
      }
    });
  });
});
