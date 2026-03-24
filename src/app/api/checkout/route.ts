import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCart } from "@/lib/cart/session";
import { createCheckoutSession } from "@/lib/stripe/checkout";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // Check if Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe is not configured. Set STRIPE_SECRET_KEY." } },
      { status: 503 }
    );
  }

  const cart = await getOrCreateCart();

  if (cart.items.length === 0) {
    return NextResponse.json(
      { error: { code: "EMPTY_CART", message: "Cart is empty" } },
      { status: 400 }
    );
  }

  // Get user email if logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const origin = request.nextUrl.origin;

  try {
    const session = await createCheckoutSession({
      items: cart.items.map((item) => ({
        product: { title: item.product.title },
        variant: {
          title: item.variant.title,
          imageUrl: item.variant.imageUrl,
        },
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      successUrl: `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/cart`,
      customerEmail: user?.email || undefined,
      metadata: {
        cartId: cart.id,
        userId: user?.id || "anonymous",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    console.error("Stripe checkout error:", message);
    return NextResponse.json(
      { error: { code: "CHECKOUT_FAILED", message } },
      { status: 500 }
    );
  }
}
