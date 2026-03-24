"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VariantSelector } from "./VariantSelector";

interface Variant {
  id: string;
  title: string;
  price: number;
  inStock: boolean;
  imageUrl: string | null;
  optionValues: Record<string, string>;
}

interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  basePrice: number;
  currency: string;
  variants: Variant[];
}

export function ProductDetail({ product }: { product: Product }) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants[0]?.id ?? null
  );
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const router = useRouter();

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const price = selectedVariant?.price ?? product.basePrice;
  const inStock = selectedVariant?.inStock ?? true;

  const handleAddToCart = async () => {
    if (!selectedVariantId || !inStock) return;
    setAdding(true);
    setAdded(false);

    const res = await fetch("/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        variantId: selectedVariantId,
        quantity: 1,
      }),
    });

    setAdding(false);
    if (res.ok) {
      setAdded(true);
      router.refresh();
      setTimeout(() => setAdded(false), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Image */}
        <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
          {selectedVariant?.imageUrl ? (
            <img
              src={selectedVariant.imageUrl}
              alt={product.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-8xl text-gray-300">
              &#128722;
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{product.title}</h1>

          <p className="mt-4 text-2xl font-semibold text-gray-900" data-testid="product-price">
            {product.currency === "USD" ? "$" : product.currency}
            {price.toFixed(2)}
          </p>

          <p className="mt-4 text-gray-600">{product.description}</p>

          {product.variants.length > 1 && (
            <div className="mt-6">
              <VariantSelector
                variants={product.variants}
                selectedVariantId={selectedVariantId}
                onSelect={setSelectedVariantId}
              />
            </div>
          )}

          {selectedVariant && (
            <p className="mt-4 text-sm text-gray-500">
              Selected: {selectedVariant.title}
              {!inStock && (
                <span className="ml-2 text-red-600">(Out of stock)</span>
              )}
            </p>
          )}

          <button
            onClick={handleAddToCart}
            disabled={!inStock || adding}
            className="mt-8 w-full rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {!inStock
              ? "Out of Stock"
              : adding
              ? "Adding..."
              : added
              ? "Added!"
              : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
