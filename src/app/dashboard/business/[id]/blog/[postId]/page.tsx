import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedBusiness } from "@/lib/owner-data";
import { getPostForOwner } from "@/lib/owner-post-data";
import { PostEditor } from "@/components/dashboard/post-editor";
import { decodeEntities } from "@/lib/format";
import { postPublicPath } from "@/lib/post-data";

export default async function EditPostPage({
  params,
  searchParams,
}: PageProps<"/dashboard/business/[id]/blog/[postId]">) {
  const user = await requireUser();
  const { id, postId } = await params;
  const businessId = Number(id);
  if (!businessId) notFound();

  const business = await getOwnedBusiness(user.id, businessId);
  if (!business) notFound();

  const post = await getPostForOwner(businessId, postId);
  if (!post) notFound();

  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/dashboard/business/${businessId}/blog`}
        className="text-sm font-semibold text-brand-600 hover:text-brand-700"
      >
        ← Back to articles
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Edit article</h1>
          <p className="mt-1 text-sm text-muted">{decodeEntities(post.title)}</p>
        </div>
        {post.status === "publish" && (
          <Link
            href={postPublicPath(business.slug, post.slug)}
            target="_blank"
            className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-canvas"
          >
            View live →
          </Link>
        )}
      </div>

      {sp.saved && (
        <div className="mt-4 rounded-xl border border-success-500/30 bg-success-500/10 px-4 py-3 text-sm text-success-600">
          Article created. Publish when ready.
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-card">
        <PostEditor
          mode="edit"
          businessId={businessId}
          businessName={decodeEntities(business.name)}
          post={post}
        />
      </div>
    </div>
  );
}
