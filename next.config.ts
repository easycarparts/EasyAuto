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
  // Serve the Next.js sitemap at the old Yoast URLs (rewrite, not redirect — same
  // address bar / GSC entry, no 301 risk). Generation still lives at /sitemap.xml.
  async rewrites() {
    const sitemap = "/sitemap.xml";
    return [
      { source: "/sitemap_index.xml", destination: sitemap },
      { source: "/business-sitemap.xml", destination: sitemap },
      { source: "/business-sitemap2.xml", destination: sitemap },
      { source: "/business-sitemap3.xml", destination: sitemap },
      { source: "/business-sitemap4.xml", destination: sitemap },
      { source: "/business-sitemap5.xml", destination: sitemap },
      { source: "/category-sitemap.xml", destination: sitemap },
      { source: "/post-sitemap.xml", destination: sitemap },
      { source: "/page-sitemap.xml", destination: sitemap },
      { source: "/author-sitemap.xml", destination: sitemap },
    ];
  },
  images: {
    // Listing thumbnails were migrated off the old WordPress install to Cloudinary
    // (scripts/migrate-images-cloudinary.mjs). The easyauto.ae/wp-content pattern was
    // removed once the DB held zero wp-content references.
    // `remotePatterns` replaces the deprecated `images.domains` in Next 16.
    remotePatterns: [
      { protocol: "https", hostname: "www.grandtouchauto.ae" },
      { protocol: "https", hostname: "grandtouchauto.ae" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/**" },
      // Google-Maps-scraper featured images (see scripts/import-scraper.mjs).
      // These survive WordPress cutover; rehost to Cloudinary later for permanence.
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "lh3.ggpht.com" },
      { protocol: "https", hostname: "streetviewpixels-pa.googleapis.com" },
    ],
  },
  // Step 3 will add the old-category-slug -> new-slug 301 map here via redirects().
};

export default nextConfig;
