"use client";

// Owner media gallery + Cloudinary uploader. Uploads go straight from the browser
// to Cloudinary using an UNSIGNED preset (no API secret in the app), then we record
// the returned URL via the addMedia server action. Images use the image preset;
// videos use the existing video preset.

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addMedia, deleteMedia, restoreCoverImage, setCoverImage } from "@/app/dashboard/actions";
import type { BusinessMedia } from "@/lib/types";

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const IMAGE_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_IMAGE_PRESET ?? "easyauto-listings";
const VIDEO_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "gts-video-360";

// Client-side caps — mirror these in each Cloudinary unsigned preset (max_file_size + incoming transform).
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

function formatLimit(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function validateFileSize(file: File): string | null {
  const isVideo = file.type.startsWith("video/");
  const max = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size <= max) return null;
  const kind = isVideo ? "Video" : "Photo";
  return `${kind} “${file.name}” is too large (${formatLimit(file.size)}). Max ${formatLimit(max)} per ${isVideo ? "video" : "photo"}.`;
}

function videoPoster(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD}/video/upload/so_0/${publicId}.jpg`;
}

export function MediaManager({
  businessId,
  media,
  coverUrl,
  originalCoverUrl,
}: {
  businessId: number;
  media: BusinessMedia[];
  coverUrl: string | null;
  originalCoverUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const galleryImages = media.filter((m) => m.kind === "image");
  const coverInGallery = coverUrl ? galleryImages.some((m) => m.url === coverUrl) : false;
  const canRestoreOriginal =
    Boolean(originalCoverUrl) && coverUrl !== originalCoverUrl;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!CLOUD) {
      setError("Cloudinary is not configured (missing cloud name).");
      return;
    }
    setBusy(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const sizeError = validateFileSize(file);
        if (sizeError) throw new Error(sizeError);

        const isVideo = file.type.startsWith("video/");
        const preset = isVideo ? VIDEO_PRESET : IMAGE_PRESET;
        const resource = isVideo ? "video" : "image";

        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", preset);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD}/${resource}/upload`,
          { method: "POST", body: fd },
        );
        const json = await res.json();
        if (!res.ok || !json.secure_url) {
          throw new Error(json?.error?.message ?? "Upload failed");
        }

        const result = await addMedia(businessId, {
          url: json.secure_url,
          kind: isVideo ? "video" : "image",
          public_id: json.public_id ?? null,
          width: json.width ?? null,
          height: json.height ?? null,
          thumbnail_url: isVideo && json.public_id ? videoPoster(json.public_id) : null,
        });
        if (result.error) throw new Error(result.error);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    setError("");
    const result = await deleteMedia(id);
    if (result.error) setError(result.error);
    else router.refresh();
    setBusy(false);
  }

  async function handleSetCover(url: string) {
    setBusy(true);
    setError("");
    const result = await setCoverImage(businessId, url);
    if (result.error) setError(result.error);
    else router.refresh();
    setBusy(false);
  }

  async function handleRestoreOriginal() {
    setBusy(true);
    setError("");
    const result = await restoreCoverImage(businessId);
    if (result.error) setError(result.error);
    else router.refresh();
    setBusy(false);
  }

  return (
    <div>
      {coverUrl && (
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Main listing image
          </p>
          <div className="relative mt-2 aspect-[16/9] overflow-hidden rounded-xl border border-line bg-canvas">
            <Image
              src={coverUrl}
              alt="Current cover"
              fill
              sizes="(max-width: 768px) 100vw, 600px"
              className="object-cover"
            />
          </div>
          {!coverInGallery && galleryImages.length > 0 && (
            <p className="mt-2 text-xs text-muted">
              Your cover is still the directory&apos;s original image. Click <strong>Set as cover</strong>{" "}
              on one of your uploaded photos below to replace it.
            </p>
          )}
          {canRestoreOriginal && (
            <button
              type="button"
              onClick={handleRestoreOriginal}
              disabled={busy}
              className="mt-3 text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-60"
            >
              Restore original image
            </button>
          )}
        </div>
      )}

      {media.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((m) => {
            const isCover = m.kind === "image" && coverUrl === m.url;
            return (
              <li
                key={m.id}
                className={`group relative aspect-square overflow-hidden rounded-xl border bg-canvas ${
                  isCover ? "border-brand-400 ring-2 ring-brand-200" : "border-line"
                }`}
              >
                {m.kind === "video" ? (
                  <video
                    src={m.url}
                    poster={m.thumbnail_url ?? undefined}
                    controls
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Image
                    src={m.url}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, 200px"
                    className="object-cover"
                  />
                )}
                {isCover && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                    Cover
                  </span>
                )}
                <div className="absolute inset-x-1.5 bottom-1.5 flex flex-wrap gap-1 opacity-0 transition group-hover:opacity-100">
                  {m.kind === "image" && !isCover && (
                    <button
                      type="button"
                      onClick={() => handleSetCover(m.url)}
                      disabled={busy}
                      className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Set as cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    disabled={busy}
                    className="rounded-full bg-ink/70 px-2 py-0.5 text-xs font-semibold text-white disabled:opacity-50"
                    aria-label="Remove media"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-xl border border-dashed border-line-strong bg-canvas px-5 py-3 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 disabled:opacity-60"
        >
          {busy ? "Uploading…" : "+ Add photos or video"}
        </button>
        <p className="mt-2 text-xs text-faint">
          Photos up to {formatLimit(MAX_IMAGE_BYTES)}, videos up to {formatLimit(MAX_VIDEO_BYTES)}.
          Larger files are rejected to keep hosting costs under control.
        </p>
      </div>

      {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}
    </div>
  );
}
