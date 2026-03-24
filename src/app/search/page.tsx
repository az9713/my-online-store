import { prisma } from "@/lib/db";
import { ProductCard } from "@/components/product/ProductCard";
import { SearchInput } from "@/components/search/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import type { Metadata } from "next";

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: ${q}` : "Search",
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, page: pageParam } = await searchParams;
  const query = q?.trim() || "";
  const page = Math.max(1, parseInt(pageParam || "1"));
  const pageSize = 12;

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

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { variants: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">
        {query ? `Search results for "${query}"` : "All Products"}
      </h1>

      <div className="mt-6 max-w-md">
        <SearchInput />
      </div>

      {products.length > 0 ? (
        <>
          <p className="mt-4 text-sm text-gray-500">
            {total} {total === 1 ? "product" : "products"} found
          </p>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                slug={product.slug}
                title={product.title}
                basePrice={product.basePrice}
                currency={product.currency}
                imageUrl={product.variants[0]?.imageUrl}
              />
            ))}
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} />
        </>
      ) : (
        <p className="mt-8 text-center text-gray-500">
          {query
            ? `No products found for "${query}". Try a different search term.`
            : "No products available."}
        </p>
      )}
    </div>
  );
}
