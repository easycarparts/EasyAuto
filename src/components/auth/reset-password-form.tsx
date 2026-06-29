"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    if (password.length < 6) {
      setStatus("error");
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setError("Passwords do not match.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setStatus("error");
      setError(updateError.message);
      return;
    }

    router.push("/dashboard/account?password=updated");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label htmlFor="password" className="block text-sm font-medium text-body">
        New password
      </label>
      <input
        id="password"
        type="password"
        required
        minLength={6}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="At least 6 characters"
        className="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      />
      <label htmlFor="confirm" className="block text-sm font-medium text-body">
        Confirm password
      </label>
      <input
        id="confirm"
        type="password"
        required
        minLength={6}
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Repeat password"
        className="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {status === "loading" ? "Saving…" : "Save new password"}
      </button>
      {error && <p className="text-sm text-danger-600">{error}</p>}
    </form>
  );
}
