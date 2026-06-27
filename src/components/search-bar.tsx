"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Homepage / header search box. Submits to /search?q=… (a Server Component page).
export function SearchBar({
  size = "md",
  placeholder = "Search car wash, detailing, auto parts…",
  defaultValue = "",
  className = "",
}: {
  size?: "md" | "lg";
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  const tall = size === "lg";

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className={`flex w-full items-center gap-2 rounded-2xl border border-line bg-surface p-2 shadow-card focus-within:border-brand-400 ${className}`}
    >
      <span className="pl-2 text-faint" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Search businesses"
        className={`min-w-0 flex-1 bg-transparent text-ink placeholder:text-faint focus:outline-none ${
          tall ? "py-2 text-base" : "py-1.5 text-sm"
        }`}
      />
      <button
        type="submit"
        className={`shrink-0 rounded-xl bg-brand-600 font-semibold text-white transition-colors hover:bg-brand-700 ${
          tall ? "px-5 py-2.5 text-base" : "px-4 py-2 text-sm"
        }`}
      >
        Search
      </button>
    </form>
  );
}
