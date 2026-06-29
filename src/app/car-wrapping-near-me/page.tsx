import type { Metadata } from "next";
import { NearMeLanding, nearMeMetadata } from "@/components/near-me-landing";
import { getNearMeService } from "@/lib/near-me";

// "car-wrapping-near-me" — Phase 3 near-me landing page. Explicit route, so it takes
// precedence over the root [combo] catch-all (STATUS.md gotcha #4).
const SERVICE = getNearMeService("car-wrapping-near-me")!;

export const metadata: Metadata = nearMeMetadata(SERVICE);

export default function Page() {
  return <NearMeLanding service={SERVICE} />;
}
