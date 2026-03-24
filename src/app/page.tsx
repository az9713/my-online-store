import { prisma } from "@/lib/db";
import { ProductCard } from "@/components/product/ProductCard";
import Link from "next/link";

export default async function Home() {
  const featuredProducts = await prisma.product.findMany({
    where: { status: "active", featured: true },
    include: { variants: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero section */}
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Welcome to Merch Store
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
          Custom merchandise, printed on demand and shipped to your door.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/search"
            className="rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            Browse All Products
          </Link>
        </div>
      </section>

      {/* Featured products */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
        {featuredProducts.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featuredProducts.map((product) => (
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
        ) : (
          <p className="mt-6 text-gray-500">No featured products yet.</p>
        )}
      </section>
    </div>
  );
}
