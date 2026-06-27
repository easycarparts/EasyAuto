"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

type Status = "idle" | "locating" | "error";

const GEO_OPTS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000,
};

// Requests the browser's location and navigates to /near-me?lat=…&lng=…
// Used on the homepage (button) and on the /near-me page (auto-start prompt).
export function GeolocateButton({
  label = "Use my location",
  autoStart = false,
  variant = "solid",
}: {
  label?: string;
  autoStart?: boolean;
  variant?: "solid" | "ghost";
}) {
  const router = useRouter();
  // When auto-starting we begin in the "locating" state so the effect itself
  // doesn't need to call setState synchronously.
  const [status, setStatus] = useState<Status>(autoStart ? "locating" : "idle");
  const [message, setMessage] = useState("");

  const onSuccess = useCallback(
    (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      router.push(`/near-me?lat=${latitude.toFixed(5)}&lng=${longitude.toFixed(5)}`);
    },
    [router],
  );

  const onError = useCallback((err: GeolocationPositionError) => {
    setStatus("error");
    setMessage(
      err.code === err.PERMISSION_DENIED
        ? "Location permission denied. You can still browse by emirate."
        : "Couldn't get your location. Please try again.",
    );
  }, []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setMessage("Location isn't supported on this device.");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(onSuccess, onError, GEO_OPTS);
  }, [onSuccess, onError]);

  useEffect(() => {
    // Fire the async geolocation request on mount when auto-starting. The result
    // callbacks (async) update state — nothing is set synchronously here.
    if (autoStart && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, GEO_OPTS);
    }
  }, [autoStart, onSuccess, onError]);

  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60";
  const cls =
    variant === "solid"
      ? `${base} bg-brand-600 text-white hover:bg-brand-700`
      : `${base} border border-line bg-surface text-body hover:border-brand-300 hover:text-brand-700`;

  return (
    <div className="flex flex-col items-center gap-2">
      <button onClick={locate} disabled={status === "locating"} className={cls}>
        <PinIcon />
        {status === "locating" ? "Locating…" : label}
      </button>
      {status === "error" && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="2.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
