import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/container";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/auth/reset-password");

  return (
    <Container className="flex flex-col items-center py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Choose a new password</h1>
          <p className="mt-2 text-sm text-muted">
            Signed in as <span className="font-medium text-body">{user.email}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
          <ResetPasswordForm />
        </div>
        <p className="mt-6 text-center text-xs text-faint">
          <Link href="/dashboard/account" className="font-medium text-brand-600 hover:text-brand-700">
            Back to account settings
          </Link>
        </p>
      </div>
    </Container>
  );
}
