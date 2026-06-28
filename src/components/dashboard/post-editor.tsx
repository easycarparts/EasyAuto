"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createPost,
  updatePost,
  type PostFormResult,
} from "@/app/dashboard/post-actions";
import { uploadImageToCloudinary } from "@/lib/cloudinary-client";
import type { BusinessPost } from "@/lib/types";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type Props = {
  mode: "create" | "edit";
  businessId: number;
  businessName: string;
  post?: BusinessPost;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function PostEditor({ mode, businessId, businessName, post }: Props) {
  const action = mode === "create" ? createPost : updatePost;
  const [state, formAction, pending] = useActionState<PostFormResult, FormData>(action, {});

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const [content, setContent] = useState(post?.content ?? "");
  const [coverUrl, setCoverUrl] = useState(post?.cover_image_url ?? "");
  const [ogUrl, setOgUrl] = useState(post?.og_image_url ?? "");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const ogInputRef = useRef<HTMLInputElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function onTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function uploadFile(file: File, target: "cover" | "og" | "inline") {
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError(`Image too large (max ${MAX_IMAGE_BYTES / (1024 * 1024)} MB).`);
      return;
    }
    setUploadBusy(true);
    setUploadError("");
    try {
      const result = await uploadImageToCloudinary(file);
      if (target === "cover") setCoverUrl(result.secure_url);
      else if (target === "og") setOgUrl(result.secure_url);
      else if (target === "inline") {
        const alt = window.prompt("Alt text for this image (good for SEO & accessibility):") ?? "";
        const tag = `<p><img src="${result.secure_url}" alt="${alt.replace(/"/g, "&quot;")}" loading="lazy" /></p>\n`;
        const el = contentRef.current;
        if (el) {
          const start = el.selectionStart ?? el.value.length;
          const next = el.value.slice(0, start) + tag + el.value.slice(start);
          setContent(next);
        } else {
          setContent((c) => c + tag);
        }
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadBusy(false);
    }
  }

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="businessId" value={businessId} />
      {mode === "edit" && post && <input type="hidden" name="postId" value={post.id} />}
      <input type="hidden" name="coverImageUrl" value={coverUrl} />
      <input type="hidden" name="ogImageUrl" value={ogUrl} />

      <section className="space-y-5">
        <h2 className="text-base font-bold text-ink">Article</h2>

        <Field label="Title" required hint="Used as the H1 on the public page.">
          <input
            name="title"
            required
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className={inputCls}
            placeholder="e.g. How to protect your car paint in Dubai summer"
          />
        </Field>

        <Field
          label="URL slug"
          hint={`Public URL: /business/…/blog/${slug || "your-slug"}`}
        >
          <input
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            className={inputCls}
            placeholder="how-to-protect-car-paint-dubai"
          />
        </Field>

        <Field label="Excerpt" hint="Short summary for listings, search snippets and social previews.">
          <textarea
            name="excerpt"
            rows={3}
            defaultValue={post?.excerpt ?? ""}
            className={inputCls}
            placeholder="A compelling 1–2 sentence summary…"
          />
        </Field>

        <Field label="Author name" hint={`Defaults to "${businessName}" if left blank.`}>
          <input
            name="authorName"
            defaultValue={post?.author_name ?? ""}
            className={inputCls}
            placeholder={businessName}
          />
        </Field>
      </section>

      <section className="space-y-5">
        <h2 className="text-base font-bold text-ink">Cover image</h2>
        {coverUrl && (
          <div className="relative aspect-[16/9] max-w-md overflow-hidden rounded-xl border border-line">
            <Image src={coverUrl} alt="" fill className="object-cover" sizes="400px" />
          </div>
        )}
        <Field label="Cover image alt text" hint="Describe the cover for screen readers and image SEO.">
          <input
            name="coverImageAlt"
            defaultValue={post?.cover_image_alt ?? ""}
            className={inputCls}
            placeholder="Red sports car after ceramic coating at our Dubai studio"
          />
        </Field>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadFile(f, "cover");
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={uploadBusy}
          onClick={() => coverInputRef.current?.click()}
          className={btnSecondary}
        >
          {uploadBusy ? "Uploading…" : coverUrl ? "Replace cover image" : "Upload cover image"}
        </button>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-base font-bold text-ink">Content</h2>
          <div className="flex gap-2">
            <input
              ref={inlineInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f, "inline");
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={uploadBusy}
              onClick={() => inlineInputRef.current?.click()}
              className={btnSecondary}
            >
              Insert image
            </button>
          </div>
        </div>
        <Field
          label="Body (HTML)"
          hint="Write in HTML or paste from your editor. Use headings (h2, h3), lists and links. Images upload via “Insert image”."
        >
          <textarea
            ref={contentRef}
            name="content"
            rows={16}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`${inputCls} font-mono text-xs leading-relaxed`}
            placeholder="<p>Your article content…</p>"
          />
        </Field>
        {uploadError && <p className="text-sm text-danger-600">{uploadError}</p>}
      </section>

      <section className="space-y-5 rounded-2xl border border-line bg-canvas p-5">
        <h2 className="text-base font-bold text-ink">SEO settings</h2>
        <p className="text-xs text-muted">
          Override defaults when you want tighter control over search and social previews.
        </p>

        <Field
          label="Meta title"
          hint="Browser tab & Google title. Leave blank to use the article title."
        >
          <input
            name="metaTitle"
            defaultValue={post?.meta_title ?? ""}
            className={inputCls}
            placeholder={title || "Meta title override"}
          />
        </Field>

        <Field label="Meta description" hint="155–160 characters ideal for Google snippets.">
          <textarea
            name="metaDescription"
            rows={3}
            defaultValue={post?.meta_description ?? ""}
            className={inputCls}
            placeholder="Custom search snippet…"
          />
        </Field>

        <div>
          <span className={labelCls}>Social share image (Open Graph)</span>
          <p className="mt-0.5 text-xs text-faint">
            Optional. Used for Facebook, LinkedIn, WhatsApp previews. Falls back to cover image.
          </p>
          {ogUrl && (
            <div className="relative mt-2 aspect-[1.91/1] max-w-xs overflow-hidden rounded-lg border border-line">
              <Image src={ogUrl} alt="" fill className="object-cover" sizes="320px" />
            </div>
          )}
          <input
            ref={ogInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f, "og");
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploadBusy}
            onClick={() => ogInputRef.current?.click()}
            className={`${btnSecondary} mt-2`}
          >
            {ogUrl ? "Replace OG image" : "Upload OG image"}
          </button>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4">
          <input
            type="checkbox"
            name="noindex"
            defaultChecked={post?.noindex ?? false}
            className="mt-1 h-4 w-4 rounded border-line-strong text-brand-600"
          />
          <span>
            <span className="block text-sm font-semibold text-ink">Hide from search engines (noindex)</span>
            <span className="mt-0.5 block text-xs text-muted">
              Published articles are indexable by default. Check this for internal or test posts.
            </span>
          </span>
        </label>
      </section>

      <section className="space-y-4">
        <Field label="Status">
          <select name="status" defaultValue={post?.status ?? "draft"} className={inputCls}>
            <option value="draft">Draft — only you can see it</option>
            <option value="publish">Published — live on your public blog</option>
          </select>
        </Field>

        {state.error && (
          <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">{state.error}</p>
        )}
        {state.ok && (
          <p className="rounded-lg bg-success-500/10 px-3 py-2 text-sm text-success-600">
            Saved.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={pending || uploadBusy}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? "Saving…" : mode === "create" ? "Create article" : "Save article"}
          </button>
          {mode === "edit" && post?.status === "publish" && (
            <button
              type="button"
              onClick={() => router.refresh()}
              className={btnSecondary}
            >
              Refresh preview link
            </button>
          )}
        </div>
      </section>
    </form>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100";
const labelCls = "block text-sm font-semibold text-ink";
const btnSecondary =
  "rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-60";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelCls}>
        {label}
        {required && <span className="text-danger-500"> *</span>}
      </span>
      {hint && <span className="mt-0.5 block text-xs text-faint">{hint}</span>}
      <div className="mt-2">{children}</div>
    </label>
  );
}
