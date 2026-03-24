import { prisma } from "@/lib/db";

export async function handleOrderShipped(data: Record<string, unknown>) {
  const externalOrderId = data.id as string;
  if (!externalOrderId) return;

  const order = await prisma.order.findUnique({
    where: { externalOrderId },
  });

  if (!order) return;

  const shipments = data.shipments as Array<Record<string, unknown>> | undefined;
  const tracking = shipments?.[0];

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "shipped",
      externalStatus: "shipped",
      trackingNumber: (tracking?.tracking_number as string) || null,
      trackingUrl: (tracking?.tracking_url as string) || null,
      syncedAt: new Date(),
    },
  });
}
