"use client";

// Owner media gallery + Cloudinary uploader. Uploads go straight from the browser
// to Cloudinary using an UNSIGNED preset (no API secret in the app), then we record
// the returned URL via the addMedia server action. Images use the image preset;
// videos use the existing video preset.

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addMedia, deleteMedia } from "@/app/dashboard/actions";
import type { BusinessMedia } from "@/lib/types";

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const IMAGE_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_IMAGE_PRESET ?? "easyauto-listings";
const VIDEO_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "gts-video-360";

function videoPoster(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD}/video/upload/so_0/${publicId}.jpg`;
}

export function MediaManager({
  businessId,
  media,
}: {
  businessId: number;
  media: BusinessMedia[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
    const result = await deleteMedia(id);
    if (result.error) setError(result.error);
    router.refresh();
    setBusy(false);
  }

  return (
    <div>
      {media.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((m) => (
            <li
              key={m.id}
              className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-canvas"
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
              <button
                type="button"
                onClick={() => handleDelete(m.id)}
                disabled={busy}
                className="absolute right-1.5 top-1.5 rounded-full bg-ink/70 px-2 py-0.5 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-50"
                aria-label="Remove media"
              >
                Remove
              </button>
            </li>
          ))}
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
          Photos and videos make your profile stand out and raise your Easy Auto Score.
        </p>
      </div>

      {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}
    </div>
  );
}
