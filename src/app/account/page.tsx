import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/account");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Account</h1>

      <div className="mt-8 space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-medium text-gray-900">Profile</h2>
          <dl className="mt-4 space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="text-sm font-medium text-gray-900">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Account created</dt>
              <dd className="text-sm font-medium text-gray-900">
                {new Date(user.created_at).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-medium text-gray-900">Orders</h2>
          <p className="mt-2 text-sm text-gray-500">
            View your order history and track shipments.
          </p>
          <Link
            href="/account/orders"
            className="mt-4 inline-block text-sm font-medium text-blue-600 underline hover:text-blue-500"
          >
            View orders
          </Link>
        </div>
      </div>
    </div>
  );
}
