import { prisma } from "@/lib/db";
import type { CommerceProvider, Product, ProductList } from "../provider";

function mapProduct(dbProduct: Record<string, unknown>): Product {
  return {
    id: dbProduct.id as string,
    slug: dbProduct.slug as string,
    title: dbProduct.title as string,
    description: dbProduct.description as string,
    basePrice: dbProduct.basePrice as number,
    currency: dbProduct.currency as string,
    featured: dbProduct.featured as boolean,
    tags: dbProduct.tags as string[],
    commerceProvider: dbProduct.commerceProvider as string,
    variants: ((dbProduct.variants as Record<string, unknown>[]) || []).map((v) => ({
      id: v.id as string,
      title: v.title as string,
      sku: v.sku as string | null,
      price: v.price as number,
      imageUrl: v.imageUrl as string | null,
      inStock: v.inStock as boolean,
      optionValues: v.optionValues as Record<string, string>,
    })),
  };
}

export const localProvider: CommerceProvider = {
  name: "local",

  async getProducts({ featured, page = 1, pageSize = 20 }) {
    const where: Record<string, unknown> = { status: "active" };
    if (featured !== undefined) where.featured = featured;

    const [dbProducts, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { variants: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products: dbProducts.map((p) => mapProduct(p as unknown as Record<string, unknown>)),
      total,
    };
  },

  async getProductBySlug(slug) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: { variants: true },
    });

    if (!product) return null;
    return mapProduct(product as unknown as Record<string, unknown>);
  },

  async searchProducts(query, { page = 1, pageSize = 12 } = {}) {
    const where = query
      ? {
          status: "active" as const,
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { description: { contains: query, mode: "insensitive" as const } },
            { tags: { has: query.toLowerCase() } },
          ],
        }
      : { status: "active" as const };

    const [dbProducts, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { variants: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products: dbProducts.map((p) => mapProduct(p as unknown as Record<string, unknown>)),
      total,
    };
  },
};
