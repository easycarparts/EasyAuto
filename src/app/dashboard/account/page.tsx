import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AccountSecurity } from "@/components/dashboard/account-security";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export default async function DashboardAccountPage({
  searchParams,
}: PageProps<"/dashboard/account">) {
  const user = await requireUser("/dashboard/account");
  const sp = await searchParams;
  const email = user.email;
  if (!email) {
    return (
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Account</h1>
        <p className="mt-4 text-sm text-muted">
          Your account has no email address on file.{" "}
          <Link href="/dashboard" className="font-semibold text-brand-600 hover:text-brand-700">
            Back to dashboard
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Account</h1>
      <p className="mt-1 text-sm text-muted">Manage your sign-in email and password.</p>
      {sp.password === "updated" && (
        <div className="mt-4 rounded-xl border border-success-500/30 bg-success-500/10 px-4 py-3 text-sm text-success-600">
          Your password was updated successfully.
        </div>
      )}
      <div className="mt-8 max-w-lg">
        <AccountSecurity email={email} />
      </div>
    </div>
  );
}
