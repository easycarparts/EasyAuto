"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSubmission } from "@/app/dashboard/actions";

// Delete control for a pending submission. Confirms first, then calls the server
// action (which re-checks ownership + pending status) and refreshes the list.
export function DeleteListingButton({
  businessId,
  name,
}: {
  businessId: number;
  name: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function onDelete() {
    if (!window.confirm(`Delete “${name}”? This can’t be undone.`)) return;
    startTransition(async () => {
      const res = await deleteSubmission(businessId);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="text-danger-600 hover:underline disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="text-xs font-normal text-danger-600">{error}</span>}
    </span>
  );
}
