"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLeadAdsEnabled } from "@/app/dashboard/actions";

// Lets a claimed owner switch the directory's lead-capture banner on/off for their
// own public listing. Mirrors the GoogleReviewsRefresh control's pattern.
export function LeadAdsToggle({
  businessId,
  claimed,
  enabled: initialEnabled,
}: {
  businessId: number;
  claimed: boolean;
  enabled: boolean;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function toggle() {
    setError("");
    const next = !enabled;
    startTransition(async () => {
      const result = await setLeadAdsEnabled(businessId, next);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEnabled(next);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <p className="font-semibold text-ink">Lead enquiry banner</p>
      <p className="mt-1 text-sm text-muted">
        Easy Auto shows a &ldquo;get free quotes&rdquo; banner on listing pages to capture enquiries.
        You can switch it off on your listing.
      </p>

      {claimed ? (
        <>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-body">
              {enabled ? "Currently shown" : "Currently hidden"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={toggle}
              disabled={pending}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                enabled ? "bg-brand-600" : "bg-line-strong"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          <p className="mt-2 text-xs text-faint">
            Prefer to keep it but discuss options? Email us at hello@sgservices.ae.
          </p>
        </>
      ) : (
        <p className="mt-3 text-xs text-faint">
          Claim this listing to control the enquiry banner.
        </p>
      )}

      {error && (
        <p className="mt-2 rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger-600">{error}</p>
      )}
    </div>
  );
}
