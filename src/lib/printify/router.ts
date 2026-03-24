import { handleOrderCreated } from "./handlers/order-created";
import { handleOrderUpdated } from "./handlers/order-updated";
import { handleOrderShipped } from "./handlers/order-shipped";
import { handleProductPublished } from "./handlers/product-published";
import { handleProductUpdated } from "./handlers/product-updated";

export type EventHandler = (data: Record<string, unknown>) => Promise<void>;

const handlers: Record<string, EventHandler> = {
  "order:created": handleOrderCreated,
  "order:updated": handleOrderUpdated,
  "order:shipped": handleOrderShipped,
  "product:publish:started": handleProductPublished,
  "product:updated": handleProductUpdated,
};

export function getHandler(eventType: string): EventHandler | null {
  return handlers[eventType] || null;
}

export function getSupportedEvents(): string[] {
  return Object.keys(handlers);
}
