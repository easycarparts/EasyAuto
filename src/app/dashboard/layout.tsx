import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Gate the whole /dashboard tree. Each action re-checks ownership too.
  await requireUser("/dashboard");
  return <Container className="py-10">{children}</Container>;
}
