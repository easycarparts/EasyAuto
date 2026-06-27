"use client";

import { useActionState } from "react";
import { createClaim, type FormResult } from "@/app/dashboard/actions";

export function ClaimForm({
  slug,
  defaultEmail,
}: {
  slug: string;
  defaultEmail?: string | null;
}) {
  const [state, action, pending] = useActionState<FormResult, FormData>(createClaim, {});

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="slug" value={slug} />

      <label className="block">
        <span className="block text-sm font-semibold text-ink">
          How are you connected to this business?
        </span>
        <span className="mt-0.5 block text-xs text-faint">
          Tell us how we can verify you own or manage it (e.g. business email, trade licence, social
          accounts).
        </span>
        <textarea
          name="message"
          rows={4}
          required
          className="mt-2 w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          placeholder="I'm the owner / manager. You can verify me by…"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm font-semibold text-ink">Contact phone</span>
          <input
            name="contact_phone"
            className="mt-2 w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            placeholder="+971 5X XXX XXXX"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-semibold text-ink">Contact email</span>
          <input
            name="contact_email"
            type="email"
            defaultValue={defaultEmail ?? ""}
            className="mt-2 w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </div>

      {state.error && (
        <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit claim"}
      </button>
    </form>
  );
}
