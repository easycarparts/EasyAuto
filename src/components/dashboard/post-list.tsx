"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deletePost } from "@/app/dashboard/post-actions";
import { postPublicPath } from "@/lib/post-data";
import type { BusinessPost } from "@/lib/types";
import { decodeEntities } from "@/lib/format";

export function DeletePostButton({
  businessId,
  postId,
  title,
}: {
  businessId: number;
  postId: string;
  title: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return;
    setBusy(true);
    const result = await deletePost(businessId, postId);
    if (result.error) {
      alert(result.error);
      setBusy(false);
      return;
    }
    router.push(`/dashboard/business/${businessId}/blog`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      className="text-sm font-semibold text-danger-600 hover:text-danger-700 disabled:opacity-60"
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}

export function PostList({
  businessId,
  businessSlug,
  posts,
}: {
  businessId: number;
  businessSlug: string;
  posts: BusinessPost[];
}) {
  if (posts.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-line-strong bg-canvas p-8 text-center">
        <p className="text-sm text-muted">No articles yet.</p>
        <Link
          href={`/dashboard/business/${businessId}/blog/new`}
          className="mt-4 inline-block rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Write your first article
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-6 space-y-3">
      {posts.map((p) => (
        <li
          key={p.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-card"
        >
          <div className="min-w-0">
            <p className="font-semibold text-ink">{decodeEntities(p.title)}</p>
            <p className="mt-0.5 text-xs text-muted">
              /blog/{p.slug}
              {" · "}
              <span className={p.status === "publish" ? "text-success-600" : "text-accent-500"}>
                {p.status === "publish" ? "Published" : "Draft"}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
            {p.status === "publish" && (
              <Link
                href={postPublicPath(businessSlug, p.slug)}
                className="text-muted hover:text-brand-600"
                target="_blank"
              >
                View →
              </Link>
            )}
            <Link
              href={`/dashboard/business/${businessId}/blog/${p.id}`}
              className="text-brand-600 hover:text-brand-700"
            >
              Edit →
            </Link>
            <DeletePostButton businessId={businessId} postId={p.id} title={p.title} />
          </div>
        </li>
      ))}
    </ul>
  );
}
