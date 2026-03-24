import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateCart } from "@/lib/cart/session";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { productId, variantId, quantity = 1 } = body;

  if (!productId || !variantId) {
    return NextResponse.json(
      { error: { code: "MISSING_FIELDS", message: "productId and variantId are required" } },
      { status: 400 }
    );
  }

  // Verify product and variant exist
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });

  if (!variant || variant.productId !== productId) {
    return NextResponse.json(
      { error: { code: "PRODUCT_NOT_FOUND", message: "Product or variant not found" } },
      { status: 404 }
    );
  }

  if (!variant.inStock) {
    return NextResponse.json(
      { error: { code: "OUT_OF_STOCK", message: "This variant is out of stock" } },
      { status: 409 }
    );
  }

  const cart = await getOrCreateCart();

  // Check if variant already in cart
  const existing = await prisma.cartItem.findUnique({
    where: {
      cartId_variantId: { cartId: cart.id, variantId },
    },
  });

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        variantId,
        quantity,
        unitPrice: variant.price,
      },
    });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
