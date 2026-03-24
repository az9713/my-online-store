import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Merch Store. All rights reserved.
          </p>
          <nav className="flex gap-6">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Home
            </Link>
            <Link
              href="/search"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Products
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
