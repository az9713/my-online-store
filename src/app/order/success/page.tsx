import Link from "next/link";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";

async function reconcileOrder(sessionId: string) {
  // If order already exists for this session, nothing to do
  const existing = await prisma.order.findFirst({
    where: { stripeSessionId: sessionId },
  });
  if (existing) return existing;

  // Webhook was missed — retrieve session from Stripe and create the order now
  if (!process.env.STRIPE_SECRET_KEY) return null;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return null;

    const cartId = session.metadata?.cartId;
    const userId = session.metadata?.userId;

    const order = await prisma.order.create({
      data: {
        userId: userId && userId !== "anonymous" ? userId : null,
        email: session.customer_details?.email || session.customer_email || null,
        customerName: session.customer_details?.name || null,
        status: "paid",
        totalAmount: (session.amount_total || 0) / 100,
        currency: session.currency?.toUpperCase() || "USD",
        sourceProvider: "local",
        stripeSessionId: session.id,
        stripeCustomerId: (session.customer as string) || null,
        shippingAddress: session.shipping_details?.address
          ? (session.shipping_details.address as unknown as Record<string, unknown>)
          : null,
        placedAt: new Date(),
      },
    });

    // Clear the cart
    if (cartId) {
      await prisma.cartItem.deleteMany({ where: { cartId } });
      await prisma.cart.updateMany({
        where: { id: cartId },
        data: { status: "converted" },
      });
    }

    console.log(`Order reconciled on success page: ${order.id}`);
    return order;
  } catch (err) {
    console.error("Order reconciliation failed:", err);
    return null;
  }
}

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  // Reconcile order if webhook was missed
  if (session_id) {
    await reconcileOrder(session_id);
  }

  // Check if user is logged in to show contextual link
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="text-5xl">&#127881;</div>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Order Confirmed!</h1>
      <p className="mt-4 text-gray-600">
        Thank you for your purchase. You&apos;ll receive a confirmation email shortly.
        Your items will be printed and shipped by our fulfillment partner.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        {user && (
          <Link
            href="/account/orders"
            className="rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            View Orders
          </Link>
        )}
        <Link
          href="/"
          className={
            user
              ? "rounded-md border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              : "rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
          }
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
