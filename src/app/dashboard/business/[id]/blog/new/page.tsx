import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedBusiness } from "@/lib/owner-data";
import { PostEditor } from "@/components/dashboard/post-editor";
import { decodeEntities } from "@/lib/format";

export default async function NewPostPage({
  params,
}: PageProps<"/dashboard/business/[id]/blog/new">) {
  const user = await requireUser();
  const { id } = await params;
  const businessId = Number(id);
  if (!businessId) notFound();

  const business = await getOwnedBusiness(user.id, businessId);
  if (!business) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/dashboard/business/${businessId}/blog`}
        className="text-sm font-semibold text-brand-600 hover:text-brand-700"
      >
        ← Back to articles
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">New article</h1>
      <p className="mt-2 text-sm text-muted">
        Write an SEO-optimised guide for {decodeEntities(business.name)}.
      </p>
      <div className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-card">
        <PostEditor mode="create" businessId={businessId} businessName={decodeEntities(business.name)} />
      </div>
    </div>
  );
}
