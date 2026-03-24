import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/account/orders");
  }

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Order History</h1>

      {orders.length === 0 ? (
        <p className="mt-8 text-center text-gray-500">
          No orders yet. Start shopping to see your order history here.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-lg border border-gray-200 bg-white p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Order #{order.orderNumber || order.id.slice(0, 8)}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    ${order.totalAmount.toFixed(2)}
                  </p>
                  <p className="mt-1 text-sm capitalize text-gray-500">
                    {order.status}
                  </p>
                </div>
              </div>
              {order.trackingNumber && (
                <p className="mt-3 text-sm text-gray-600">
                  Tracking: {order.trackingUrl ? (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline hover:text-blue-500"
                    >
                      {order.trackingNumber}
                    </a>
                  ) : (
                    order.trackingNumber
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
