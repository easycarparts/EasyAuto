import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedBusiness } from "@/lib/owner-data";
import { getPostsForOwner } from "@/lib/owner-post-data";
import { PostList } from "@/components/dashboard/post-list";
import { decodeEntities } from "@/lib/format";
import { blogIndexPath } from "@/lib/post-data";

export default async function BusinessBlogDashboardPage({
  params,
}: PageProps<"/dashboard/business/[id]/blog">) {
  const user = await requireUser();
  const { id } = await params;
  const businessId = Number(id);
  if (!businessId) notFound();

  const business = await getOwnedBusiness(user.id, businessId);
  if (!business) notFound();

  const posts = await getPostsForOwner(businessId);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/dashboard/business/${businessId}`}
        className="text-sm font-semibold text-brand-600 hover:text-brand-700"
      >
        ← Back to listing
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Blog articles</h1>
          <p className="mt-1 text-sm text-muted">
            SEO articles for {decodeEntities(business.name)} — each gets its own indexable page.
          </p>
        </div>
        <Link
          href={`/dashboard/business/${businessId}/blog/new`}
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + New article
        </Link>
      </div>

      {business.status === "publish" && posts.some((p) => p.status === "publish") && (
        <p className="mt-4 text-sm text-muted">
          Public blog:{" "}
          <Link href={blogIndexPath(business.slug)} className="font-semibold text-brand-600 hover:text-brand-700">
            {blogIndexPath(business.slug)} →
          </Link>
        </p>
      )}

      <PostList businessId={businessId} businessSlug={business.slug} posts={posts} />
    </div>
  );
}
