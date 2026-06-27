import type { NextConfig } from "next";
import { categoryRedirects } from "./src/lib/redirects";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. A stray package-lock.json in the
  // user's home dir otherwise makes Turbopack infer the wrong root.
  turbopack: { root: __dirname },
  // Step 3: 301/308 the 102 orphan category URLs + known legacy permalinks.
  async redirects() {
    return categoryRedirects();
  },
  images: {
    // Listing thumbnails currently live on the old WordPress install and will be
    // migrated to Cloudinary/Supabase Storage before cutover (HANDOVER §7).
    // `remotePatterns` replaces the deprecated `images.domains` in Next 16.
    remotePatterns: [
      { protocol: "https", hostname: "easyauto.ae", pathname: "/wp-content/**" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/**" },
    ],
  },
  // Step 3 will add the old-category-slug -> new-slug 301 map here via redirects().
};

export default nextConfig;
