import { prisma } from "@/lib/db";

export async function handleOrderCreated(data: Record<string, unknown>) {
  const externalOrderId = data.id as string;
  if (!externalOrderId) return;

  // Check idempotency — don't create duplicate orders
  const existing = await prisma.order.findUnique({
    where: { externalOrderId },
  });
  if (existing) return;

  await prisma.order.create({
    data: {
      externalOrderId,
      orderNumber: (data.order_number as string) || null,
      email: (data.email as string) || null,
      customerName: (data.customer_name as string) || null,
      status: "processing",
      externalStatus: (data.status as string) || "unknown",
      totalAmount: (data.total_price as number) || 0,
      currency: (data.currency as string) || "USD",
      sourceProvider: "printify_sync",
      placedAt: new Date(),
    },
  });
}
