import { prisma } from "@/lib/db";

export async function handleProductPublished(data: Record<string, unknown>) {
  const providerProductId = data.id as string;
  if (!providerProductId) return;

  const title = (data.title as string) || "Untitled Product";
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const description = (data.description as string) || "";

  // Check if product already exists
  const existing = await prisma.product.findFirst({
    where: { providerProductId },
  });

  if (existing) {
    await prisma.product.update({
      where: { id: existing.id },
      data: { title, description, status: "active" },
    });
    return;
  }

  await prisma.product.create({
    data: {
      slug: `${slug}-${Date.now()}`,
      title,
      description,
      basePrice: 0,
      commerceProvider: "printify",
      providerProductId,
      status: "active",
    },
  });
}
