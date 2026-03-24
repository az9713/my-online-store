"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface CartItem {
  id: string;
  product: { id: string; slug: string; title: string };
  variant: { id: string; title: string; imageUrl: string | null };
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface Cart {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  currency: string;
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  const fetchCart = useCallback(async () => {
    const res = await fetch("/api/cart");
    if (res.ok) {
      const { data } = await res.json();
      setCart(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const updateQuantity = async (itemId: string, quantity: number) => {
    await fetch(`/api/cart/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    fetchCart();
  };

  const removeItem = async (itemId: string) => {
    await fetch(`/api/cart/items/${itemId}`, { method: "DELETE" });
    fetchCart();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-gray-500">Loading cart...</p>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
        <p className="mt-4 text-gray-500">Your cart is empty.</p>
        <Link
          href="/search"
          className="mt-6 inline-block rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
      <p className="mt-1 text-sm text-gray-500">
        {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
      </p>

      <div className="mt-8 divide-y divide-gray-200">
        {cart.items.map((item) => (
          <div key={item.id} className="flex gap-4 py-6">
            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
              {item.variant.imageUrl ? (
                <img
                  src={item.variant.imageUrl}
                  alt={item.product.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl text-gray-300">
                  &#128722;
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col">
              <div className="flex justify-between">
                <div>
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="text-sm font-medium text-gray-900 hover:text-blue-600"
                  >
                    {item.product.title}
                  </Link>
                  <p className="mt-0.5 text-sm text-gray-500">{item.variant.title}</p>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  ${item.lineTotal.toFixed(2)}
                </p>
              </div>

              <div className="mt-auto flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="rounded border border-gray-300 px-2 py-0.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="min-w-[2ch] text-center text-sm" data-testid="item-quantity">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="rounded border border-gray-300 px-2 py-0.5 text-sm hover:bg-gray-50"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-sm text-red-600 hover:text-red-500"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 border-t border-gray-200 pt-6">
        <div className="flex justify-between text-lg font-semibold text-gray-900">
          <span>Subtotal</span>
          <span>${cart.subtotal.toFixed(2)}</span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Shipping and taxes calculated at checkout.
        </p>
        <button
          onClick={async () => {
            setCheckingOut(true);
            try {
              const res = await fetch("/api/checkout", { method: "POST" });
              const data = await res.json();
              if (data.url) {
                window.location.href = data.url;
              } else {
                alert(data.error?.message || "Checkout failed");
                setCheckingOut(false);
              }
            } catch {
              alert("Checkout failed. Please try again.");
              setCheckingOut(false);
            }
          }}
          disabled={checkingOut}
          className="mt-6 w-full rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {checkingOut ? "Redirecting to checkout..." : "Checkout"}
        </button>
      </div>
    </div>
  );
}
