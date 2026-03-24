import { prisma } from "@/lib/db";

export async function handleProductUpdated(data: Record<string, unknown>) {
  const providerProductId = data.id as string;
  if (!providerProductId) return;

  const product = await prisma.product.findFirst({
    where: { providerProductId },
  });

  if (!product) return; // We don't have this product locally

  const updates: Record<string, unknown> = {};
  if (data.title) updates.title = data.title as string;
  if (data.description) updates.description = data.description as string;

  if (Object.keys(updates).length > 0) {
    await prisma.product.update({
      where: { id: product.id },
      data: updates,
    });
  }
}
