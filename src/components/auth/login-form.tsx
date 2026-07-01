"use client";

// Passwordless-first auth (email only — Google OAuth isn't wired up yet).
//
// Primary path: enter email → we send a one-time link + code via signInWithOtp,
// which creates the account automatically if it's new. So a single flow covers
// both sign-in and sign-up. Password is an opt-in secondary path, with a working
// "forgot password" that no longer requires being signed in first.
//
// Every meaningful step fires an analytics event (signup/login/otp/email_sent)
// so the admin dashboard can see the auth funnel and the emails Resend sent.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { trackEvent } from "@/lib/analytics/events";

type View = "form" | "sent" | "reset-sent";
type Method = "link" | "password";
type PwMode = "signin" | "signup";
type OtpFlow = "email" | "signup";
const RESEND_COOLDOWN = 30;

// Turn raw Supabase errors into something a human wants to read.
function friendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "That email or password doesn’t match. Try again, or use a sign-in link instead.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "That email already has an account — try signing in instead.";
  if (m.includes("for security purposes") || m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts — please wait a minute and try again.";
  if (m.includes("not confirmed") || m.includes("email not confirmed"))
    return "Please confirm your email first — check your inbox for the link.";
  if (m.includes("expired")) return "That code has expired. Send a fresh one below.";
  if (m.includes("token") || (m.includes("invalid") && m.includes("otp")))
    return "That code isn’t right. Check the latest email and try again.";
  if (m.includes("password should be") || m.includes("at least 6")) return "Password must be at least 6 characters.";
  return msg;
}

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [view, setView] = useState<View>("form");
  const [method, setMethod] = useState<Method>("link");
  const [pwMode, setPwMode] = useState<PwMode>("signin");
  const [otpFlow, setOtpFlow] = useState<OtpFlow>("email");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Resend cooldown ticker (one timeout per second; no interval to leak).
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const callbackUrl = (nextPath = next) =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  const rememberNext = (nextPath = next) => {
    document.cookie = `ea-next=${encodeURIComponent(nextPath)}; path=/; max-age=600; samesite=lax`;
  };
  const fail = (msg: string, event: string) => {
    setError(friendly(msg));
    setBusy(false);
    setVerifying(false);
    trackEvent(event, { reason: msg.slice(0, 120) });
  };

  async function done() {
    router.push(next);
    router.refresh();
  }

  // --- Google OAuth ----------------------------------------------------------
  async function signInWithGoogle() {
    setBusy(true);
    setError("");
    rememberNext(); // callback restores the destination from the ea-next cookie
    trackEvent("google_started");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      // Clean, query-less URL so it matches the Supabase redirect allow-list exactly.
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser is redirected to Google, so we only land here on error.
    if (error) fail(error.message, "login_failed");
  }

  // --- Primary: passwordless link + code -------------------------------------
  async function sendLink(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    rememberNext();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    });
    setBusy(false);
    if (error) return fail(error.message, "login_failed");
    trackEvent("magic_link_sent", { method: "link" });
    trackEvent("email_magic_link", {}, "email");
    setOtpFlow("email");
    setOtpCode("");
    setCooldown(RESEND_COOLDOWN);
    setView("sent");
  }

  // --- Secondary: password sign-in / sign-up ---------------------------------
  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    if (pwMode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return fail(error.message, "login_failed");
      trackEvent("login_completed", { method: "password" });
      return done();
    }
    rememberNext();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: callbackUrl() },
    });
    if (error) return fail(error.message, "signup_failed");
    if (data.session) {
      trackEvent("signup_completed", { method: "password" });
      return done();
    }
    // Confirmation required → email sent, verify by code.
    trackEvent("signup_started", { method: "password" });
    trackEvent("email_confirmation", {}, "email");
    setBusy(false);
    setOtpFlow("signup");
    setOtpCode("");
    setCooldown(RESEND_COOLDOWN);
    setView("sent");
  }

  // --- Forgot password (works without being signed in) -----------------------
  async function sendReset() {
    if (!email.trim()) {
      setError("Enter your email above first, then tap “Forgot password”.");
      return;
    }
    setBusy(true);
    setError("");
    rememberNext("/auth/reset-password");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: callbackUrl("/auth/reset-password"),
    });
    setBusy(false);
    if (error) return fail(error.message, "login_failed");
    trackEvent("password_reset_requested");
    trackEvent("email_recovery", {}, "email");
    setView("reset-sent");
  }

  async function resend() {
    if (cooldown > 0 || busy) return;
    setError("");
    if (otpFlow === "signup") {
      setBusy(true);
      const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
      setBusy(false);
      if (error) return fail(error.message, "signup_failed");
      trackEvent("email_confirmation", { resend: true }, "email");
      setCooldown(RESEND_COOLDOWN);
    } else {
      await sendLink();
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setError("");
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otpCode.trim(),
      type: otpFlow,
    });
    if (error) return fail(error.message, otpFlow === "signup" ? "signup_failed" : "login_failed");
    trackEvent(otpFlow === "signup" ? "signup_completed" : "login_completed", { method: "otp" });
    return done();
  }

  /* ---------------------------------------------------------------- views */

  if (view === "reset-sent") {
    return (
      <Panel>
        <Sent icon="🔑" title="Reset link sent">
          We sent a password-reset link to <Strong>{email}</Strong>. Open it to choose a new password.
        </Sent>
        <BackButton onClick={() => setView("form")} />
      </Panel>
    );
  }

  if (view === "sent") {
    return (
      <Panel>
        <Sent icon="✉️" title="Check your inbox">
          We sent a {otpFlow === "signup" ? "confirmation" : "sign-in"} email to <Strong>{email}</Strong>. Tap the
          link, or enter the code below.
        </Sent>

        <form onSubmit={verify} className="mt-5 space-y-3">
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
            placeholder="6–8 digit code"
            className="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-center text-lg tracking-[0.3em] text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={verifying || otpCode.length < 6}
            className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {verifying ? "Verifying…" : "Verify & continue"}
          </button>
        </form>

        {error && <Err>{error}</Err>}

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0 || busy}
            className="font-semibold text-brand-600 hover:text-brand-700 disabled:text-faint"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : busy ? "Sending…" : "Resend email"}
          </button>
          <button
            type="button"
            onClick={() => {
              setView("form");
              setError("");
              setOtpCode("");
            }}
            className="font-semibold text-muted hover:text-ink"
          >
            Use a different email
          </button>
        </div>
      </Panel>
    );
  }

  // --- Main form ---
  return (
    <Panel>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas disabled:opacity-60"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="my-4 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-faint">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={method === "link" ? sendLink : submitPassword} className="space-y-3">
        <div>
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
            className="mt-1 w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {method === "password" && (
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-body">
                Password
              </label>
              {pwMode === "signin" && (
                <button type="button" onClick={sendReset} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative mt-1">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                required
                minLength={6}
                autoComplete={pwMode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={pwMode === "signin" ? "Your password" : "At least 6 characters"}
                className="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 pr-16 text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-muted hover:text-ink"
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {busy
            ? "Please wait…"
            : method === "link"
              ? "Email me a sign-in link"
              : pwMode === "signin"
                ? "Sign in"
                : "Create account"}
        </button>
      </form>

      {error && <Err>{error}</Err>}

      {method === "link" ? (
        <p className="mt-3 text-center text-xs text-faint">
          We’ll email a one-time link and code. New here? Your account is created automatically — no password needed.
        </p>
      ) : (
        <p className="mt-3 text-center text-xs text-faint">
          {pwMode === "signin" ? "Don’t have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setPwMode(pwMode === "signin" ? "signup" : "signin");
              setError("");
            }}
            className="font-semibold text-brand-600 hover:text-brand-700"
          >
            {pwMode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      )}

      <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-faint">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <button
        type="button"
        onClick={() => {
          setMethod(method === "link" ? "password" : "link");
          setError("");
        }}
        className="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm font-semibold text-body transition hover:border-brand-300 hover:bg-brand-50"
      >
        {method === "link" ? "Sign in with a password instead" : "Email me a sign-in link instead"}
      </button>
    </Panel>
  );
}

/* ---------------------------------------------------------------- bits */

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">{children}</div>;
}

function Sent({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-success-500/10 text-2xl">{icon}</div>
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-muted">{children}</p>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-5 w-full text-sm font-semibold text-brand-600 hover:text-brand-700">
      Back to sign in
    </button>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded-lg border border-danger-500/30 bg-danger-50 px-3 py-2 text-sm text-danger-600">{children}</p>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-body">{children}</span>;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.5 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.9 36.9 44 31 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}
