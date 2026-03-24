import Link from "next/link";

interface ProductCardProps {
  slug: string;
  title: string;
  basePrice: number;
  currency: string;
  imageUrl?: string | null;
}

export function ProductCard({ slug, title, basePrice, currency, imageUrl }: ProductCardProps) {
  return (
    <Link
      href={`/products/${slug}`}
      className="group block overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md"
    >
      <div className="aspect-square bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-gray-300">
            &#128722;
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
          {title}
        </h3>
        <p className="mt-1 text-sm font-semibold text-gray-700">
          {currency === "USD" ? "$" : currency}
          {basePrice.toFixed(2)}
        </p>
      </div>
    </Link>
  );
}
