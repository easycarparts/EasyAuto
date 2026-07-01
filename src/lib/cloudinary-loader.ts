// Custom next/image loader. Offloads resizing + format/quality to Cloudinary's
// CDN (which already hosts our listing images) instead of Vercel's image
// optimizer. That optimizer is metered and was returning 402 (quota exceeded)
// once traffic + crawlers pushed us past Vercel's limit, breaking uncached
// images. Cloudinary transforms are free and served from their edge.
//
// Applies to every <Image>: Cloudinary URLs get a transformation segment; any
// other source (Google avatars, grandtouch, Supabase storage, local /public)
// is returned untouched and served directly, so nothing routes through
// /_next/image any more.

type LoaderArgs = { src: string; width: number; quality?: number };

export default function cloudinaryLoader({ src, width, quality }: LoaderArgs): string {
  if (src.includes("res.cloudinary.com") && src.includes("/upload/")) {
    // c_limit = never upscale; f_auto = modern formats; q_auto = smart quality.
    const t = `f_auto,q_${quality ?? "auto"},w_${width},c_limit`;
    return src.replace("/upload/", `/upload/${t}/`);
  }
  return src;
}
