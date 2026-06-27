import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to manage your Easy Auto business listing.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") ? next : "/dashboard";
  const errorMessage = typeof error === "string" ? error : null;

  // Already signed in → skip the form.
  const user = await getCurrentUser();
  if (user) redirect(nextPath);

  return (
    <Container className="flex flex-col items-center py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            Sign in to Easy Auto
          </h1>
          <p className="mt-2 text-sm text-muted">
            Claim, submit and manage your business listing.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-danger-500/30 bg-danger-50 px-4 py-3 text-sm text-danger-600">
            Sign-in didn&apos;t complete: {errorMessage}. Please try again.
          </div>
        )}

        <LoginForm next={nextPath} />

        <p className="mt-6 text-center text-xs text-faint">
          By continuing you agree to list accurate business information.{" "}
          <Link href="/" className="font-medium text-brand-600 hover:text-brand-700">
            Back to home
          </Link>
        </p>
      </div>
    </Container>
  );
}
