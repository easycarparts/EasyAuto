"use server";

// Public lead-capture submission (the adaptive funnel).
//
// Called from the client <LeadCapture> form on service / location / brand pages.
// Server-side so we validate, run the honeypot check and insert with the
// service-role client — the anon key never has to reach the browser for this and
// we can set workflow columns (status/lead_type) the public RLS insert policy
// wouldn't let an anon client control cleanly.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isHighIntentService } from "@/lib/lead-routing";

export type LeadFormState = { ok: boolean; error?: string };

// Trim + cap a free-text field; returns null when empty.
function clean(value: FormDataEntryValue | null, max: number): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) return null;
  return s.slice(0, max);
}

export async function submitLead(formData: FormData): Promise<LeadFormState> {
  // Honeypot: a hidden field real users never see. Bots fill it → silently accept
  // (so the bot thinks it succeeded) but record nothing.
  if (clean(formData.get("company"), 100)) {
    return { ok: true };
  }

  const name = clean(formData.get("name"), 120);
  const phone = clean(formData.get("phone"), 40);
  const email = clean(formData.get("email"), 160);
  const message = clean(formData.get("message"), 1000);
  const serviceSlug = clean(formData.get("serviceSlug"), 80);
  const serviceLabel = clean(formData.get("serviceLabel"), 120);
  const locationSlug = clean(formData.get("locationSlug"), 80);
  const locationLabel = clean(formData.get("locationLabel"), 120);
  const source = clean(formData.get("source"), 300);
  const businessIdRaw = clean(formData.get("businessId"), 20);

  // Name + phone are required; phone must contain enough digits to be real.
  if (!name || !phone) {
    return { ok: false, error: "Please add your name and phone number." };
  }
  if ((phone.match(/\d/g)?.length ?? 0) < 7) {
    return { ok: false, error: "Please enter a valid phone number." };
  }

  const businessId = businessIdRaw && /^\d+$/.test(businessIdRaw) ? Number(businessIdRaw) : null;

  const db = createSupabaseAdminClient();
  const { error } = await db.from("leads").insert({
    name,
    phone,
    email,
    message,
    service_slug: serviceSlug,
    location_slug: locationSlug,
    category_slug: serviceSlug, // mirror for the existing category attribution/index
    city: locationLabel,
    business_id: businessId,
    action: "form",
    lead_type: "form",
    status: "new",
    // Flag high-intent (owner-service) enquiries for the Grand Touch funnel.
    routed_to: isHighIntentService(serviceSlug) ? "own_service" : "directory",
    source: source ?? (serviceLabel ? `lead-form:${serviceLabel}` : "lead-form"),
  });

  if (error) {
    return { ok: false, error: "Something went wrong. Please try again or call directly." };
  }
  return { ok: true };
}
