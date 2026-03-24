import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

const SESSION_COOKIE = "cart_session_id";

export async function getOrCreateCart() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If logged in, find or create a user cart
  if (user) {
    let cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: { product: true, variant: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: user.id, email: user.email },
        include: {
          items: {
            include: { product: true, variant: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    }

    return cart;
  }

  // Anonymous: use session cookie
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    const cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: { product: true, variant: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (cart) return cart;
  }

  // Create new session and cart
  sessionId = uuidv4();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  const cart = await prisma.cart.create({
    data: { sessionId },
    include: {
      items: {
        include: { product: true, variant: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return cart;
}

export async function mergeAnonymousCart(userId: string, email?: string) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return;

  const anonymousCart = await prisma.cart.findUnique({
    where: { sessionId },
    include: { items: true },
  });

  if (!anonymousCart || anonymousCart.items.length === 0) return;

  // Find or create user cart
  let userCart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!userCart) {
    userCart = await prisma.cart.create({
      data: { userId, email },
    });
  }

  // Merge items: for each anonymous item, upsert into user cart
  for (const item of anonymousCart.items) {
    const existing = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: { cartId: userCart.id, variantId: item.variantId },
      },
    });

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + item.quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        },
      });
    }
  }

  // Delete anonymous cart
  await prisma.cart.delete({ where: { id: anonymousCart.id } });

  // Clear session cookie
  cookieStore.delete(SESSION_COOKIE);
}
