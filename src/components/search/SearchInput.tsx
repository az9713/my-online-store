"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface SearchInputProps {
  className?: string;
  compact?: boolean;
}

export function SearchInput({ className = "", compact = false }: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/search");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="relative">
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          aria-label="Search products"
          className={`w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            compact ? "px-3 py-1.5 text-sm" : "px-4 py-2"
          }`}
        />
      </div>
    </form>
  );
}
