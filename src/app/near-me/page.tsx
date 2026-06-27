import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { BusinessCard } from "@/components/business-card";
import { GeolocateButton } from "@/components/geolocate-button";
import { getAllCategories, getNearbyBusinesses } from "@/lib/data";
import { EMIRATES } from "@/lib/locations";
import { ALL_SERVICES } from "@/lib/taxonomy";

// Personalised results — keep out of the index.
export const metadata: Metadata = {
  title: "Auto services near me",
  robots: { index: false, follow: true },
};

function num(v: string | string[] | undefined): number | null {
  const raw = Array.isArray(v) ? v[0] : v;
  if (raw == null) return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

export default async function NearMePage({ searchParams }: PageProps<"/near-me">) {
  const sp = await searchParams;
  const lat = num(sp.lat);
  const lng = num(sp.lng);
  const hasCoords = lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  if (!hasCoords) {
    return (
      <Container className="py-20">
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            Auto services near you
          </h1>
          <p className="mt-3 text-muted">
            Share your location and we&apos;ll show the closest car wash, garage,
            parts shop and more — sorted by distance.
          </p>
          <div className="mt-8">
            <GeolocateButton label="Share my location" autoStart />
          </div>
          <div className="mt-10">
            <p className="text-sm font-medium text-faint">Or browse by emirate</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {EMIRATES.map((e) => (
                <Link
                  key={e.slug}
                  href={`/${ALL_SERVICES.slug}-in-${e.slug}`}
                  className="rounded-full border border-line bg-surface px-3 py-1 text-sm font-medium text-body hover:border-brand-300 hover:text-brand-700"
                >
                  {e.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Container>
    );
  }

  const [nearby, categories] = await Promise.all([
    getNearbyBusinesses(lat, lng, 36),
    getAllCategories(),
  ]);
  const categoryNames = new Map(categories.map((c) => [c.slug, c.name]));

  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            Nearest auto services
          </h1>
          <p className="mt-2 text-muted">
            {nearby.length > 0
              ? `Showing the ${nearby.length} closest businesses to you.`
              : "No listings found close to you."}
          </p>
        </div>
        <GeolocateButton label="Update location" variant="ghost" />
      </div>

      {nearby.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line-strong bg-surface p-12 text-center">
          <p className="text-lg font-semibold text-ink">Nothing within range</p>
          <p className="mt-1 text-muted">Try browsing by emirate instead.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {nearby.map((b) => (
            <BusinessCard
              key={b.id}
              business={b}
              distanceKm={b.distanceKm}
              categoryName={b.category_slug ? categoryNames.get(b.category_slug) : undefined}
            />
          ))}
        </div>
      )}
    </Container>
  );
}
