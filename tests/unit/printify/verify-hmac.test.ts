import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyHmac } from "@/lib/printify/verify-hmac";

const SECRET = "test_webhook_secret_123";

function generateSignature(body: string, secret: string = SECRET): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

describe("verifyHmac", () => {
  const body = JSON.stringify({ event: "order:created", id: "123" });

  it("accepts valid signature", () => {
    const sig = generateSignature(body);
    expect(verifyHmac(body, sig, SECRET)).toBe(true);
  });

  it("accepts valid signature without sha256= prefix", () => {
    const sig = generateSignature(body).replace("sha256=", "");
    expect(verifyHmac(body, sig, SECRET)).toBe(true);
  });

  it("rejects invalid signature", () => {
    expect(verifyHmac(body, "sha256=deadbeef1234", SECRET)).toBe(false);
  });

  it("rejects null signature", () => {
    expect(verifyHmac(body, null, SECRET)).toBe(false);
  });

  it("rejects empty signature", () => {
    expect(verifyHmac(body, "", SECRET)).toBe(false);
  });

  it("rejects empty body", () => {
    const sig = generateSignature(body);
    expect(verifyHmac("", sig, SECRET)).toBe(false);
  });

  it("rejects empty secret", () => {
    const sig = generateSignature(body);
    expect(verifyHmac(body, sig, "")).toBe(false);
  });

  it("rejects tampered body", () => {
    const sig = generateSignature(body);
    const tampered = body.replace("123", "456");
    expect(verifyHmac(tampered, sig, SECRET)).toBe(false);
  });

  it("rejects wrong secret", () => {
    const sig = generateSignature(body, "wrong_secret");
    expect(verifyHmac(body, sig, SECRET)).toBe(false);
  });

  it("rejects malformed hex in signature", () => {
    expect(verifyHmac(body, "sha256=not-hex-at-all!", SECRET)).toBe(false);
  });

  it("handles large payloads", () => {
    const largeBody = JSON.stringify({ data: "x".repeat(100000) });
    const sig = generateSignature(largeBody);
    expect(verifyHmac(largeBody, sig, SECRET)).toBe(true);
  });

  it("is sensitive to whitespace changes", () => {
    const sig = generateSignature(body);
    const withWhitespace = body + " ";
    expect(verifyHmac(withWhitespace, sig, SECRET)).toBe(false);
  });
});
