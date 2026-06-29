"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardNav() {
  const pathname = usePathname();
  const onAccount = pathname.startsWith("/dashboard/account");

  return (
    <nav className="mb-8 flex gap-1 border-b border-line">
      <Link
        href="/dashboard"
        className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
          !onAccount
            ? "border-brand-600 text-brand-600"
            : "border-transparent text-muted hover:border-line-strong hover:text-ink"
        }`}
      >
        Listings
      </Link>
      <Link
        href="/dashboard/account"
        className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
          onAccount
            ? "border-brand-600 text-brand-600"
            : "border-transparent text-muted hover:border-line-strong hover:text-ink"
        }`}
      >
        Account
      </Link>
    </nav>
  );
}
