import { NextResponse } from "next/server";
import { getOrCreateCart } from "@/lib/cart/session";

export async function GET() {
  const cart = await getOrCreateCart();

  const items = cart.items.map((item) => ({
    id: item.id,
    product: {
      id: item.product.id,
      slug: item.product.slug,
      title: item.product.title,
    },
    variant: {
      id: item.variant.id,
      title: item.variant.title,
      imageUrl: item.variant.imageUrl,
    },
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.quantity * item.unitPrice,
  }));

  return NextResponse.json({
    data: {
      id: cart.id,
      items,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: items.reduce((sum, i) => sum + i.lineTotal, 0),
      currency: cart.currency,
    },
  });
}
