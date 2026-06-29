import type { Metadata } from "next";
import { MapPageClient } from "@/components/map/map-page-client";
import { EMIRATES } from "@/lib/locations";
import { SERVICE_GROUPS } from "@/lib/taxonomy";
import { SITE, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Map view",
  description: `Browse auto-service businesses across the UAE on an interactive map. Find car wash, detailing, repair, parts and more near you on ${SITE.name}.`,
  alternates: { canonical: absoluteUrl("/map") },
  openGraph: {
    title: "Map view",
    description: `Interactive map of UAE auto-service businesses on ${SITE.name}.`,
    url: absoluteUrl("/map"),
  },
};

export default function MapPage() {
  const serviceGroups = SERVICE_GROUPS.map((g) => ({ slug: g.slug, name: g.name }));
  const emirates = EMIRATES.map((e) => ({ slug: e.slug, name: e.name }));

  return <MapPageClient serviceGroups={serviceGroups} emirates={emirates} />;
}
