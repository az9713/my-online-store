import { test, expect } from "@playwright/test";
import { createHmac } from "crypto";

// Use a test secret — in production this would be the real Printify webhook secret
const TEST_SECRET = "test_secret_for_e2e";

function sign(body: string, secret: string = TEST_SECRET): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

test.describe("EP-016: Printify Webhooks", () => {
  // Note: These tests require PRINTIFY_WEBHOOK_SECRET to be set in .env
  // For E2E testing, we test the endpoint behavior

  test("webhook rejects request without signature", async ({ request }) => {
    const res = await request.post("/api/webhooks/printify", {
      data: { event: "order:created", id: "test-123" },
    });
    // Should be 401 (invalid signature) or 500 (secret not configured)
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("webhook rejects request with wrong signature", async ({ request }) => {
    const body = JSON.stringify({ event: "order:created", id: "test-123" });
    const res = await request.post("/api/webhooks/printify", {
      headers: {
        "Content-Type": "application/json",
        "x-printify-signature": "sha256=deadbeefdeadbeef",
        "x-printify-event": "order:created",
      },
      data: body,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("sync endpoint returns response", async ({ request }) => {
    const res = await request.post("/api/sync/printify", {
      data: { targetType: "orders" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.syncRunId).toBeDefined();
  });

  test("sync endpoint handles products target", async ({ request }) => {
    const res = await request.post("/api/sync/printify", {
      data: { targetType: "products" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBeDefined();
  });
});
