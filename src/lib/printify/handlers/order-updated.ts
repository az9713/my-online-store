import { prisma } from "@/lib/db";

export async function handleOrderUpdated(data: Record<string, unknown>) {
  const externalOrderId = data.id as string;
  if (!externalOrderId) return;

  const order = await prisma.order.findUnique({
    where: { externalOrderId },
  });

  if (!order) {
    // Order doesn't exist locally — create it
    await prisma.order.create({
      data: {
        externalOrderId,
        status: mapStatus((data.status as string) || "unknown"),
        externalStatus: (data.status as string) || "unknown",
        totalAmount: (data.total_price as number) || 0,
        currency: (data.currency as string) || "USD",
        sourceProvider: "printify_sync",
        syncedAt: new Date(),
      },
    });
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: mapStatus((data.status as string) || order.status),
      externalStatus: (data.status as string) || order.externalStatus,
      syncedAt: new Date(),
    },
  });
}

function mapStatus(printifyStatus: string): string {
  const statusMap: Record<string, string> = {
    pending: "pending",
    "in-production": "processing",
    shipped: "shipped",
    delivered: "delivered",
    cancelled: "cancelled",
    "on-hold": "pending",
  };
  return statusMap[printifyStatus] || "processing";
}
