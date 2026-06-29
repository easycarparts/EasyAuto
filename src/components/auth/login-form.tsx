"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "signin" | "signup";
type OtpFlow = "email" | "signup";

// Email + password sign-in, optional account creation, and magic-link fallback.
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpFlow, setOtpFlow] = useState<OtpFlow>("email");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const callbackUrl = () => `${window.location.origin}/auth/callback`;
  const rememberNext = () => {
    document.cookie = `ea-next=${encodeURIComponent(next)}; path=/; max-age=600; samesite=lax`;
  };

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    setInfo("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function signUpWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    setInfo("");
    rememberNext();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: callbackUrl() },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    if (data.session) {
      router.push(next);
      router.refresh();
      return;
    }
    setStatus("sent");
    setOtpFlow("signup");
    setOtpCode("");
    setInfo("Check your email to confirm your account, then sign in.");
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    setInfo("");
    rememberNext();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      setStatus("sent");
      setOtpFlow("email");
      setOtpCode("");
      setInfo("");
    }
  }

  async function verifyEmailCode(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setError("");
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otpCode.trim(),
      type: otpFlow,
    });
    setVerifying(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-success-500/10 text-2xl">
            ✉️
          </div>
          <h2 className="text-lg font-bold text-ink">Check your inbox</h2>
          <p className="mt-2 text-sm text-muted">
            {info || (
              <>
                We sent a sign-in link to{" "}
                <span className="font-medium text-body">{email}</span>. Open it on this device, or
                enter the code from the email below.
              </>
            )}
          </p>
        </div>

        <form onSubmit={verifyEmailCode} className="mt-5 space-y-3">
          <label htmlFor="otp" className="block text-sm font-medium text-body">
            One-time code
          </label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            minLength={6}
            maxLength={8}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter code from email"
            className="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-center text-lg tracking-[0.2em] text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={verifying || otpCode.length < 6}
            className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {verifying ? "Verifying…" : "Verify code"}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}

        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setInfo("");
            setError("");
            setOtpCode("");
          }}
          className="mt-4 w-full text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
      <div className="mb-5 flex rounded-xl bg-canvas p-1">
        <ModeTab active={mode === "signin"} onClick={() => setMode("signin")}>
          Sign in
        </ModeTab>
        <ModeTab active={mode === "signup"} onClick={() => setMode("signup")}>
          Create account
        </ModeTab>
      </div>

      <form
        onSubmit={mode === "signin" ? signInWithPassword : signUpWithPassword}
        className="space-y-3"
      >
        <label htmlFor="email" className="block text-sm font-medium text-body">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@business.ae"
          className="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        <label htmlFor="password" className="block text-sm font-medium text-body">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signin" ? "Your password" : "At least 6 characters"}
          className="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {status === "loading"
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}

      <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-faint">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={sendMagicLink}>
        <button
          type="submit"
          disabled={status === "loading" || !email.trim()}
          className="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm font-semibold text-body transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60"
        >
          Email me a sign-in link
        </button>
        <p className="mt-2 text-center text-xs text-faint">
          Passwordless — we&apos;ll send a one-time link to the email above.
        </p>
      </form>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
