"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  email: string;
};

export function AccountSecurity({ email }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  const [resetSent, setResetSent] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    if (password.length < 6) {
      setStatus("error");
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setPassword("");
    setConfirm("");
    setStatus("ok");
    setMessage("Password updated. Magic links still work if you prefer passwordless sign-in.");
  }

  async function sendResetEmail() {
    setStatus("loading");
    setMessage("");
    setResetSent(false);

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("ok");
    setResetSent(true);
    setMessage("Check your inbox for a password reset link.");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 className="text-lg font-bold text-ink">Sign-in email</h2>
        <p className="mt-1 text-sm text-muted">Used for sign-in, magic links and account notices.</p>
        <p className="mt-3 rounded-xl bg-canvas px-4 py-2.5 text-sm font-medium text-ink">{email}</p>
        <p className="mt-3 text-xs text-faint">
          You can sign in with a password or a magic link sent to this address.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 className="text-lg font-bold text-ink">Password</h2>
        <p className="mt-1 text-sm text-muted">
          Set or change the password for email sign-in. Leave blank fields unused if you only use magic links.
        </p>

        <form onSubmit={changePassword} className="mt-4 space-y-3">
          <Field
            id="new-password"
            label="New password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            placeholder="At least 6 characters"
            minLength={6}
          />
          <Field
            id="confirm-password"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Repeat password"
            minLength={6}
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {status === "loading" ? "Saving…" : "Save password"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 className="text-lg font-bold text-ink">Password reset email</h2>
        <p className="mt-1 text-sm text-muted">
          Prefer a fresh link? We&apos;ll email you a one-time link to choose a new password.
        </p>
        <button
          type="button"
          onClick={sendResetEmail}
          disabled={status === "loading"}
          className="mt-4 rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm font-semibold text-body transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60"
        >
          {status === "loading" ? "Sending…" : "Email me a reset link"}
        </button>
      </section>

      {message && (
        <p
          className={`text-sm ${status === "error" ? "text-danger-600" : "text-success-600"}`}
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      )}
      {resetSent && (
        <p className="text-xs text-faint">
          The link opens on this device. If you don&apos;t see the email, check spam.
        </p>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  type,
  autoComplete,
  value,
  onChange,
  placeholder,
  minLength,
}: {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  minLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      />
    </div>
  );
}
