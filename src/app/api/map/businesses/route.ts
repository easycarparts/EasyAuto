import { NextResponse } from "next/server";
import { getMapBusinesses } from "@/lib/data";
import { EMIRATES } from "@/lib/locations";
import { getServiceGroup } from "@/lib/taxonomy";

function num(v: string | null): number | null {
  if (v == null) return null;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function bool(v: string | null): boolean {
  return v === "1" || v === "true";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const south = num(searchParams.get("south"));
  const west = num(searchParams.get("west"));
  const north = num(searchParams.get("north"));
  const east = num(searchParams.get("east"));
  const q = searchParams.get("q")?.trim() ?? "";

  const hasBounds = south != null && west != null && north != null && east != null;
  if (!q && !hasBounds) {
    return NextResponse.json({ error: "Missing bounds or search query" }, { status: 400 });
  }

  const group = searchParams.get("group");
  const categorySlugs = group ? (getServiceGroup(group)?.members ?? []) : undefined;
  if (group && (!categorySlugs || categorySlugs.length === 0)) {
    return NextResponse.json({ error: "Unknown group" }, { status: 400 });
  }

  const emirate = searchParams.get("emirate");
  const emirateCities = emirate
    ? (EMIRATES.find((e) => e.slug === emirate)?.cityNames ?? [])
    : undefined;
  if (emirate && (!emirateCities || emirateCities.length === 0)) {
    return NextResponse.json({ error: "Unknown emirate" }, { status: 400 });
  }

  const minScore = num(searchParams.get("minScore"));
  const claimedOnly = bool(searchParams.get("claimed"));

  try {
    const businesses = await getMapBusinesses(
      hasBounds ? { south: south!, west: west!, north: north!, east: east! } : null,
      {
        categorySlugs,
        cities: emirateCities,
        minScore: minScore ?? undefined,
        claimedOnly: claimedOnly || undefined,
        query: q || undefined,
      },
      q ? 80 : 400,
    );
    return NextResponse.json({ businesses });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load map data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
