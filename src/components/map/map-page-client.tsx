"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(
  () => import("@/components/map/map-view").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100dvh-4rem)] items-center justify-center bg-canvas text-sm text-muted">
        Loading map…
      </div>
    ),
  },
);

type Option = { slug: string; name: string };

export function MapPageClient({
  serviceGroups,
  emirates,
}: {
  serviceGroups: Option[];
  emirates: Option[];
}) {
  return <MapView serviceGroups={serviceGroups} emirates={emirates} />;
}
