import { getStripe } from "./client";

interface CartItem {
  product: { title: string };
  variant: { title: string; imageUrl: string | null };
  quantity: number;
  unitPrice: number;
}

interface CreateCheckoutOptions {
  items: CartItem[];
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export async function createCheckoutSession(options: CreateCheckoutOptions) {
  const stripe = getStripe();

  const lineItems = options.items.map((item) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: item.product.title,
        description: item.variant.title,
        ...(item.variant.imageUrl ? { images: [item.variant.imageUrl] } : {}),
      },
      unit_amount: Math.round(item.unitPrice * 100), // Stripe uses cents
    },
    quantity: item.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    shipping_address_collection: {
      allowed_countries: ["US", "CA", "GB", "AU"],
    },
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    ...(options.customerEmail ? { customer_email: options.customerEmail } : {}),
    metadata: options.metadata || {},
  });

  return session;
}
