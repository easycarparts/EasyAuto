import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  return <Container className="py-10">{children}</Container>;
}
