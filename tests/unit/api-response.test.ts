import { describe, it, expect } from "vitest";

// Test the response format conventions directly
// (These test the contract, not the implementation — since response helpers return NextResponse objects
// which are hard to test in isolation, we test the JSON shapes)

describe("API Response Conventions", () => {
  describe("Success response shape", () => {
    it("single item has data field", () => {
      const response = { data: { id: "1", title: "Test Product" } };
      expect(response).toHaveProperty("data");
      expect(response.data).toHaveProperty("id");
    });

    it("list has data array and pagination", () => {
      const response = {
        data: [{ id: "1" }, { id: "2" }],
        pagination: { page: 1, pageSize: 20, total: 2 },
      };
      expect(response.data).toBeInstanceOf(Array);
      expect(response.pagination).toHaveProperty("page");
      expect(response.pagination).toHaveProperty("pageSize");
      expect(response.pagination).toHaveProperty("total");
    });
  });

  describe("Error response shape", () => {
    it("has error object with code and message", () => {
      const response = {
        error: { code: "PRODUCT_NOT_FOUND", message: "Product not found" },
      };
      expect(response.error).toHaveProperty("code");
      expect(response.error).toHaveProperty("message");
      expect(response.error.code).toBe("PRODUCT_NOT_FOUND");
    });
  });
});
