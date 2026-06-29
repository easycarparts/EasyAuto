"use client";

import "leaflet/dist/leaflet.css";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { MapBusinessPin } from "@/lib/data";
import { decodeEntities } from "@/lib/format";
import { RatingStars } from "@/components/rating-stars";
import { ScoreBadge } from "@/components/score-badge";

const UAE_CENTER: [number, number] = [24.45, 54.37];
const UAE_ZOOM = 8;

const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Light basemap with place labels (Carto prefers Latin / English names where available in OSM).
const MAP_TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

/** Prominent map pins: Easy Score above 75 or owner-claimed listings. */
const PROMINENT_SCORE_MIN = 76;
const LABEL_MIN_ZOOM = 12;

function isProminentPin(b: MapBusinessPin): boolean {
  return b.claimed || (b.easy_auto_score != null && b.easy_auto_score >= PROMINENT_SCORE_MIN);
}

function showNameLabel(b: MapBusinessPin, zoom: number): boolean {
  return zoom >= LABEL_MIN_ZOOM && isProminentPin(b);
}

type Option = { slug: string; name: string };

type MapViewProps = {
  serviceGroups: Option[];
  emirates: Option[];
};

type MapFilters = {
  group: string;
  emirate: string;
  minScore: string;
  claimedOnly: boolean;
};

type FlyTarget = { lat: number; lng: number };

function pinRank(b: MapBusinessPin): number {
  const score = b.easy_auto_score ?? 0;
  const reviews = b.google_reviews ?? 0;
  return score * 10_000 + Math.min(reviews, 9_999);
}

/** Coarser grid when zoomed out — ~0.01° ≈ 1.1 km at 2 decimals. */
function mapCellDecimals(zoom: number): number {
  if (zoom <= 9) return 2;
  if (zoom <= 11) return 2;
  if (zoom <= 13) return 3;
  return 4;
}

/** One pin per map cell — keeps the highest Easy Score (ties → more reviews). */
function pickTopPerMapCell(businesses: MapBusinessPin[], zoom: number): MapBusinessPin[] {
  const factor = 10 ** mapCellDecimals(zoom);
  const cells = new Map<string, MapBusinessPin>();

  for (const b of businesses) {
    const lat = Math.round(b.latitude * factor) / factor;
    const lng = Math.round(b.longitude * factor) / factor;
    const key = `${lat}|${lng}`;
    const cur = cells.get(key);
    if (!cur || pinRank(b) > pinRank(cur)) cells.set(key, b);
  }

  return Array.from(cells.values());
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncateName(name: string, max = 26): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

function scoreTierClass(score: number | null): string {
  if (score == null) return "map-score--basic";
  if (score >= 80) return "map-score--excellent";
  if (score >= 65) return "map-score--great";
  if (score >= 50) return "map-score--good";
  return "map-score--basic";
}

function dotPinIcon(selected: boolean, b: MapBusinessPin) {
  const score = b.easy_auto_score;
  const prominent = isProminentPin(b);
  const size = prominent
    ? "map-pin-dot--featured"
    : score != null && score >= 50
      ? "map-pin-dot--md"
      : "map-pin-dot--sm";
  const claimed = b.claimed ? " map-pin--claimed" : "";
  const tier = scoreTierClass(score);
  const sel = selected ? " map-pin-dot--selected" : "";
  return L.divIcon({
    className: "",
    html: `<div class="map-pin-dot ${size} ${tier}${claimed}${sel}"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function labeledPinIcon(name: string, b: MapBusinessPin, selected: boolean) {
  const score = b.easy_auto_score;
  const safeName = escapeHtml(truncateName(name));
  const scoreLabel = score != null ? String(score) : "";
  const tier = scoreTierClass(score);
  const claimed = b.claimed ? " map-labeled-pin--claimed map-pin--claimed" : "";
  const sel = selected ? " map-labeled-pin--selected" : "";
  const claimedBadge = b.claimed
    ? `<span class="map-labeled-pin__claimed" title="Claimed listing">★</span>`
    : "";
  return L.divIcon({
    className: "map-labeled-pin-wrap",
    html: `<div class="map-labeled-pin ${tier}${claimed}${sel}">
      <div class="map-labeled-pin__label">
        ${claimedBadge}
        <span class="map-labeled-pin__name">${safeName}</span>
        ${scoreLabel ? `<span class="map-labeled-pin__score">${scoreLabel}</span>` : ""}
      </div>
      <div class="map-labeled-pin__stem"></div>
      <div class="map-labeled-pin__point"></div>
    </div>`,
    iconSize: [168, 52],
    iconAnchor: [84, 52],
    popupAnchor: [0, -48],
  });
}

function zIndexFor(score: number | null): number {
  return score ?? 0;
}

function sortByScore(list: MapBusinessPin[]): MapBusinessPin[] {
  return [...list].sort((a, b) => (b.easy_auto_score ?? 0) - (a.easy_auto_score ?? 0));
}

export function MapView({ serviceGroups, emirates }: MapViewProps) {
  const [businesses, setBusinesses] = useState<MapBusinessPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MapFilters>({
    group: "",
    emirate: "",
    minScore: "",
    claimedOnly: false,
  });
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const [fitResultsKey, setFitResultsKey] = useState(0);
  const boundsRef = useRef<L.LatLngBounds | null>(null);
  const fetchIdRef = useRef(0);

  const fetchBusinesses = useCallback(
    async (bounds: L.LatLngBounds | null, activeFilters: MapFilters, q: string) => {
      const id = ++fetchIdRef.current;
      setLoading(true);

      const params = new URLSearchParams();
      if (q) {
        params.set("q", q);
      } else if (bounds) {
        params.set("south", String(bounds.getSouth()));
        params.set("west", String(bounds.getWest()));
        params.set("north", String(bounds.getNorth()));
        params.set("east", String(bounds.getEast()));
      } else {
        setLoading(false);
        return;
      }

      if (activeFilters.group) params.set("group", activeFilters.group);
      if (activeFilters.emirate) params.set("emirate", activeFilters.emirate);
      const minScore = Number(activeFilters.minScore);
      if (activeFilters.minScore && Number.isFinite(minScore) && minScore >= 0 && minScore <= 100) {
        params.set("minScore", String(Math.round(minScore)));
      }
      if (activeFilters.claimedOnly) params.set("claimed", "1");

      try {
        const res = await fetch(`/api/map/businesses?${params}`);
        const data = (await res.json()) as { businesses?: MapBusinessPin[] };
        if (id !== fetchIdRef.current) return;
        const list = sortByScore(data.businesses ?? []);
        setBusinesses(list);
        setSelectedId((prev) => (prev && list.some((b) => b.id === prev) ? prev : null));
      } catch {
        if (id === fetchIdRef.current) setBusinesses([]);
      } finally {
        if (id === fetchIdRef.current) setLoading(false);
      }
    },
    [],
  );

  const onBoundsChange = useCallback(
    (bounds: L.LatLngBounds) => {
      if (searchQuery) return;
      boundsRef.current = bounds;
      void fetchBusinesses(bounds, filters, "");
    },
    [fetchBusinesses, filters, searchQuery],
  );

  useEffect(() => {
    if (searchQuery) {
      void fetchBusinesses(null, filters, searchQuery).then(() => {
        setFitResultsKey((k) => k + 1);
      });
      return;
    }
    if (boundsRef.current) void fetchBusinesses(boundsRef.current, filters, "");
  }, [filters, searchQuery, fetchBusinesses]);

  const selectBusiness = useCallback((b: MapBusinessPin, shouldFly: boolean) => {
    setSelectedId(b.id);
    if (shouldFly) {
      setFlyTarget({ lat: b.latitude, lng: b.longitude });
    }
  }, []);

  const selected = useMemo(
    () => businesses.find((b) => b.id === selectedId) ?? null,
    [businesses, selectedId],
  );

  const sorted = useMemo(() => sortByScore(businesses), [businesses]);

  const markersForMap = useMemo(
    () => [...sorted].sort((a, b) => (a.easy_auto_score ?? 0) - (b.easy_auto_score ?? 0)),
    [sorted],
  );

  const countLabel = useMemo(() => {
    if (loading) return "Loading businesses…";
    if (searchQuery) {
      return businesses.length === 0
        ? `No results for “${searchQuery}”`
        : `${businesses.length} result${businesses.length === 1 ? "" : "s"} for “${searchQuery}”`;
    }
    if (businesses.length >= 400) {
      return "400+ in this area on the list · map shows top Easy Score per location";
    }
    return `${businesses.length} in list · map shows top Easy Score per location`;
  }, [loading, searchQuery, businesses.length]);

  return (
    <div className="fixed inset-x-0 top-16 z-20 flex h-[calc(100dvh-4rem)] flex-col bg-surface lg:flex-row">
      <aside className="flex w-full flex-col border-b border-line bg-surface lg:w-[22rem] lg:shrink-0 lg:border-b-0 lg:border-r xl:w-[26rem]">
        <div className="border-b border-line p-4">
          <h1 className="text-lg font-bold text-ink">Map view</h1>
          <p className="mt-0.5 text-sm text-muted">{countLabel}</p>

          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const q = searchInput.trim();
              setSearchQuery(q);
              if (!q && boundsRef.current) {
                void fetchBusinesses(boundsRef.current, filters, "");
              }
            }}
          >
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search businesses…"
              className="min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Search
            </button>
          </form>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchInput("");
                if (boundsRef.current) void fetchBusinesses(boundsRef.current, filters, "");
              }}
              className="mt-2 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Clear search · show map area
            </button>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <FilterSelect
              label="Service"
              value={filters.group}
              onChange={(group) => setFilters((f) => ({ ...f, group }))}
            >
              <option value="">All services</option>
              {serviceGroups.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Emirate"
              value={filters.emirate}
              onChange={(emirate) => setFilters((f) => ({ ...f, emirate }))}
            >
              <option value="">All emirates</option>
              {emirates.map((e) => (
                <option key={e.slug} value={e.slug}>
                  {e.name}
                </option>
              ))}
            </FilterSelect>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-faint">
                Min Easy Score
              </span>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={filters.minScore}
                onChange={(e) => setFilters((f) => ({ ...f, minScore: e.target.value }))}
                placeholder="Any"
                className="mt-1 w-full rounded-xl border border-line bg-canvas px-2.5 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </label>
            <label className="flex flex-col justify-end">
              <span className="text-xs font-semibold uppercase tracking-wide text-faint">
                Verified only
              </span>
              <span className="mt-1 flex h-[38px] items-center gap-2 rounded-xl border border-line bg-canvas px-3 text-sm">
                <input
                  type="checkbox"
                  checked={filters.claimedOnly}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, claimedOnly: e.target.checked }))
                  }
                  className="rounded border-line text-brand-600"
                />
                Claimed listings
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("map:geolocate"))}
            className="mt-3 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm font-semibold text-body transition hover:border-brand-300 hover:bg-brand-50"
          >
            Use my location
          </button>

          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] font-medium text-muted">
            <span className="inline-flex items-center gap-1">
              <span className="map-legend-dot map-score--basic" /> &lt;50
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="map-legend-dot map-score--good" /> 50+
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="map-legend-dot map-score--great" /> 65+
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="map-legend-dot map-score--excellent" /> 80+
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="map-legend-dot map-pin--claimed map-score--great" /> ★ Claimed
            </span>
          </div>
        </div>

        {selected && (
          <div className="hidden lg:block">
            <SelectedBusinessPanel business={selected} onClose={() => setSelectedId(null)} />
          </div>
        )}

        <div className="hidden flex-1 overflow-y-auto lg:block">
          {sorted.length === 0 && !loading ? (
            <p className="p-4 text-sm text-muted">
              No businesses with map locations match your filters. Try zooming out, clearing
              filters, or searching by name.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {sorted.map((b) => (
                <li key={b.id}>
                  <MapListItem
                    business={b}
                    selected={b.id === selectedId}
                    onSelect={() => selectBusiness(b, true)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected && (
          <div className="border-t border-line lg:hidden">
            <SelectedBusinessPanel
              business={selected}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </aside>

      <div className="relative min-h-[50dvh] flex-1">
        <MapContainer
          center={UAE_CENTER}
          zoom={UAE_ZOOM}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer attribution={MAP_ATTRIBUTION} url={MAP_TILES} />
          <BoundsWatcher onBoundsChange={onBoundsChange} searchActive={Boolean(searchQuery)} />
          <GeolocateListener />
          <FlyToTarget target={flyTarget} />
          <FitSearchResults businesses={businesses} fitKey={fitResultsKey} active={Boolean(searchQuery)} />
          <MapMarkers
            businesses={markersForMap}
            selectedId={selectedId}
            onSelect={(b) => selectBusiness(b, false)}
          />
        </MapContainer>
      </div>
    </div>
  );
}

function MapMarkers({
  businesses,
  selectedId,
  onSelect,
}: {
  businesses: MapBusinessPin[];
  selectedId: number | null;
  onSelect: (b: MapBusinessPin) => void;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });

  const mapPins = useMemo(() => {
    const winners = pickTopPerMapCell(businesses, zoom);
    if (selectedId == null) return winners;
    const selected = businesses.find((b) => b.id === selectedId);
    if (!selected || winners.some((b) => b.id === selectedId)) return winners;
    return [...winners, selected];
  }, [businesses, zoom, selectedId]);

  return (
    <>
      {mapPins.map((b) => {
        const score = b.easy_auto_score;
        const selected = b.id === selectedId;
        const name = decodeEntities(b.name);
        const prominent = isProminentPin(b);
        const label = showNameLabel(b, zoom);

        const icon = label
          ? labeledPinIcon(name, b, selected)
          : dotPinIcon(selected, b);

        return (
          <Marker
            key={b.id}
            position={[b.latitude, b.longitude]}
            icon={icon}
            zIndexOffset={zIndexFor(score) + (prominent ? 500 : 0)}
            eventHandlers={{ click: () => onSelect(b) }}
          >
            <Popup minWidth={label ? 200 : undefined}>
              <MapPopup business={b} featured={prominent} />
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-faint">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-canvas px-2.5 py-2 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      >
        {children}
      </select>
    </label>
  );
}

function SelectedBusinessPanel({
  business,
  onClose,
}: {
  business: MapBusinessPin;
  onClose: () => void;
}) {
  const name = decodeEntities(business.name);

  return (
    <div className="border-b border-line bg-canvas p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-faint">Selected</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-muted hover:text-ink"
        >
          Close
        </button>
      </div>
      <div className="relative mt-2 aspect-[16/10] overflow-hidden rounded-xl border border-line bg-surface">
        {business.thumbnail_url ? (
          <Image
            src={business.thumbnail_url}
            alt={name}
            fill
            sizes="(max-width: 1024px) 100vw, 320px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 text-2xl font-bold text-brand-300">
            EA
          </div>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <h2 className="font-bold text-ink">{name}</h2>
        <ScoreBadge score={business.easy_auto_score} />
      </div>
      <div className="mt-1">
        <RatingStars rating={business.rating} reviews={business.google_reviews} />
      </div>
      <p className="mt-1 text-sm text-muted">{business.city ?? "UAE"}</p>
      <Link
        href={`/business/${business.slug}`}
        className="mt-3 inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
      >
        View listing →
      </Link>
    </div>
  );
}

function MapListItem({
  business,
  selected,
  onSelect,
}: {
  business: MapBusinessPin;
  selected: boolean;
  onSelect: () => void;
}) {
  const name = decodeEntities(business.name);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full gap-3 p-3 text-left transition hover:bg-brand-50 ${selected ? "bg-brand-50" : ""}`}
    >
      <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-canvas">
        {business.thumbnail_url ? (
          <Image
            src={business.thumbnail_url}
            alt={name}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 text-xs font-bold text-brand-300">
            EA
          </div>
        )}
        {business.claimed && (
          <span
            className="absolute right-0.5 top-0.5 rounded-full bg-gradient-to-br from-accent-400 to-accent-500 px-1 text-[9px] font-bold leading-4 text-amber-950 shadow-sm"
            title="Claimed listing"
          >
            ★
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 font-semibold text-ink">{name}</p>
          <ScoreBadge score={business.easy_auto_score} />
        </div>
        <div className="mt-1">
          <RatingStars rating={business.rating} reviews={business.google_reviews} />
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-muted">{business.city ?? "UAE"}</p>
      </div>
    </button>
  );
}

function MapPopup({ business, featured = false }: { business: MapBusinessPin; featured?: boolean }) {
  const name = decodeEntities(business.name);

  return (
    <div className="min-w-[11rem]">
      {featured && business.thumbnail_url && (
        <div className="relative mb-2 aspect-[16/10] w-full overflow-hidden rounded-lg border border-line bg-canvas">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={business.thumbnail_url} alt={name} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-ink">{name}</p>
        <ScoreBadge score={business.easy_auto_score} />
      </div>
      {business.city && <p className="mt-0.5 text-xs text-muted">{business.city}</p>}
      <div className="mt-1">
        <RatingStars rating={business.rating} reviews={business.google_reviews} />
      </div>
      <Link
        href={`/business/${business.slug}`}
        className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700"
      >
        View listing →
      </Link>
    </div>
  );
}

function BoundsWatcher({
  onBoundsChange,
  searchActive,
}: {
  onBoundsChange: (bounds: L.LatLngBounds) => void;
  searchActive: boolean;
}) {
  const map = useMap();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emit = useCallback(() => {
    if (searchActive) return;
    onBoundsChange(map.getBounds());
  }, [map, onBoundsChange, searchActive]);

  useMapEvents({
    moveend: () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(emit, 300);
    },
  });

  useEffect(() => {
    emit();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [emit]);

  return null;
}

function FlyToTarget({ target }: { target: FlyTarget | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 14), { duration: 0.5 });
  }, [map, target]);

  return null;
}

function FitSearchResults({
  businesses,
  fitKey,
  active,
}: {
  businesses: MapBusinessPin[];
  fitKey: number;
  active: boolean;
}) {
  const map = useMap();
  const lastKey = useRef(0);

  useEffect(() => {
    if (!active || fitKey === 0 || fitKey === lastKey.current) return;
    lastKey.current = fitKey;
    if (businesses.length === 0) return;
    if (businesses.length === 1) {
      map.flyTo([businesses[0].latitude, businesses[0].longitude], 14, { duration: 0.6 });
      return;
    }
    const bounds = L.latLngBounds(
      businesses.map((b) => [b.latitude, b.longitude] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
  }, [map, businesses, fitKey, active]);

  return null;
}

function GeolocateListener() {
  const map = useMap();

  useEffect(() => {
    const handler = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.flyTo([latitude, longitude], 13, { duration: 1 });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000 },
      );
    };
    window.addEventListener("map:geolocate", handler);
    return () => window.removeEventListener("map:geolocate", handler);
  }, [map]);

  return null;
}
