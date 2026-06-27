import Link from "next/link";
import { BusinessForm } from "@/components/dashboard/business-form";
import { getAllCategories } from "@/lib/data";
import { decodeEntities } from "@/lib/format";

export default async function SubmitBusinessPage() {
  const cats = await getAllCategories();
  const categories = cats.map((c) => ({ slug: c.slug, name: decodeEntities(c.name) }));

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
        ← Back to dashboard
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">Submit your business</h1>
      <p className="mt-2 text-sm text-muted">
        Add your auto-services business to the directory. We&apos;ll review your submission and
        publish it — usually within a couple of business days. You can add photos and videos after
        it&apos;s created.
      </p>

      <div className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-card">
        <BusinessForm mode="create" categories={categories} />
      </div>
    </div>
  );
}
