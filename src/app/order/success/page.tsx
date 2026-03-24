import Link from "next/link";

export default function OrderSuccessPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="text-5xl">&#127881;</div>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Order Confirmed!</h1>
      <p className="mt-4 text-gray-600">
        Thank you for your purchase. You&apos;ll receive a confirmation email shortly.
        Your items will be printed and shipped by our fulfillment partner.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link
          href="/account/orders"
          className="rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
        >
          View Orders
        </Link>
        <Link
          href="/"
          className="rounded-md border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
