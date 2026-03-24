import { describe, it, expect } from "vitest";
import { getHandler, getSupportedEvents } from "@/lib/printify/router";

describe("Event Router", () => {
  it("returns handler for order:created", () => {
    expect(getHandler("order:created")).not.toBeNull();
  });

  it("returns handler for order:updated", () => {
    expect(getHandler("order:updated")).not.toBeNull();
  });

  it("returns handler for order:shipped", () => {
    expect(getHandler("order:shipped")).not.toBeNull();
  });

  it("returns handler for product:publish:started", () => {
    expect(getHandler("product:publish:started")).not.toBeNull();
  });

  it("returns handler for product:updated", () => {
    expect(getHandler("product:updated")).not.toBeNull();
  });

  it("returns null for unknown event type", () => {
    expect(getHandler("unknown:event")).toBeNull();
  });

  it("returns null for empty event type", () => {
    expect(getHandler("")).toBeNull();
  });

  it("returns null for undefined-like strings", () => {
    expect(getHandler("undefined")).toBeNull();
    expect(getHandler("null")).toBeNull();
  });

  it("getSupportedEvents returns all 5 event types", () => {
    const events = getSupportedEvents();
    expect(events).toHaveLength(5);
    expect(events).toContain("order:created");
    expect(events).toContain("order:updated");
    expect(events).toContain("order:shipped");
    expect(events).toContain("product:publish:started");
    expect(events).toContain("product:updated");
  });

  it("all handlers are functions", () => {
    for (const event of getSupportedEvents()) {
      const handler = getHandler(event);
      expect(typeof handler).toBe("function");
    }
  });
});
