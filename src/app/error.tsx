"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-6xl font-bold text-gray-900">500</h1>
      <p className="mt-4 text-lg text-gray-600">
        Something went wrong. Please try again.
      </p>
      {process.env.NODE_ENV === "development" && (
        <p className="mt-2 text-sm text-red-600">{error.message}</p>
      )}
      <button
        onClick={reset}
        className="mt-8 inline-block rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
      >
        Try Again
      </button>
    </div>
  );
}
