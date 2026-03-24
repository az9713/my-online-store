import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateCart } from "@/lib/cart/session";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const body = await request.json();
  const { quantity } = body;

  if (typeof quantity !== "number" || quantity < 0) {
    return NextResponse.json(
      { error: { code: "INVALID_QUANTITY", message: "Quantity must be a non-negative number" } },
      { status: 400 }
    );
  }

  const cart = await getOrCreateCart();

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
  });

  if (!item) {
    return NextResponse.json(
      { error: { code: "ITEM_NOT_FOUND", message: "Cart item not found" } },
      { status: 404 }
    );
  }

  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const cart = await getOrCreateCart();

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
  });

  if (!item) {
    return NextResponse.json(
      { error: { code: "ITEM_NOT_FOUND", message: "Cart item not found" } },
      { status: 404 }
    );
  }

  await prisma.cartItem.delete({ where: { id: itemId } });

  return NextResponse.json({ success: true });
}
