import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe/client";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: { code: "CONFIG_ERROR", message: "Stripe webhook not configured" } },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: { code: "MISSING_SIGNATURE", message: "Missing stripe-signature header" } },
      { status: 401 }
    );
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    await prisma.webhookEvent.create({
      data: {
        provider: "stripe",
        eventType: "unknown",
        signatureValid: false,
        payload: {},
        processingStatus: "failed",
        errorMessage: message,
      },
    });
    return NextResponse.json(
      { error: { code: "INVALID_SIGNATURE", message } },
      { status: 401 }
    );
  }

  // Log the event
  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      provider: "stripe",
      eventType: event.type,
      eventId: event.id,
      signatureValid: true,
      payload: event.data as unknown as Record<string, unknown>,
      processingStatus: "pending",
    },
  });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        console.warn(`Payment failed for intent: ${intent.id}`);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(charge);
        break;
      }
      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processingStatus: "processed", processedAt: new Date() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processingStatus: "failed", errorMessage: message },
    });
    console.error(`Stripe webhook processing failed:`, message);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const cartId = session.metadata?.cartId;
  const userId = session.metadata?.userId;

  // Create order
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
    await prisma.cart.update({
      where: { id: cartId },
      data: { status: "converted" },
    });
  }

  console.log(`Order created: ${order.id} from Stripe session: ${session.id}`);
}

async function handleRefund(charge: Stripe.Charge) {
  // Find order by stripe session/customer
  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id;

  if (!paymentIntentId) return;

  // Try to find the order — in a real app you'd store payment_intent_id
  // For now, log the refund
  console.log(`Refund processed for charge: ${charge.id}, amount: ${charge.amount_refunded / 100}`);
}
