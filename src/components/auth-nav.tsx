"use client";

// Header auth controls. Deliberately a CLIENT component (the SiteHeader is in the
// root layout — reading the session on the server there would make every static
// page dynamic). It asks the server for auth state via /api/me, which reads the
// session reliably even when the auth cookie is HttpOnly.

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut } from "@/app/auth/actions";

type AuthState = { loggedIn: boolean; isAdmin: boolean };

export function AuthNav() {
  const [state, setState] = useState<AuthState | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { loggedIn: false, isAdmin: false }))
      .then((d: AuthState) => {
        if (active) setState(d);
      })
      .catch(() => {
        if (active) setState({ loggedIn: false, isAdmin: false });
      });
    return () => {
      active = false;
    };
  }, []);

  // Reserve space until state is known to avoid a layout jump.
  if (state === null) {
    return <div className="h-9 w-20" aria-hidden />;
  }

  if (!state.loggedIn) {
    return (
      <Link
        href="/login"
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1 text-sm font-medium">
      {state.isAdmin && (
        <Link
          href="/admin"
          className="rounded-lg px-3 py-2 text-body hover:bg-canvas hover:text-ink"
        >
          Admin
        </Link>
      )}
      <Link
        href="/dashboard"
        className="rounded-lg bg-brand-600 px-3.5 py-2 font-semibold text-white transition hover:bg-brand-700"
      >
        Dashboard
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-lg px-3 py-2 text-muted hover:bg-canvas hover:text-ink"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
