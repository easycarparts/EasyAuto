"use client";

import { useActionState, useState } from "react";
import { submitBusiness, updateBusiness, type FormResult } from "@/app/dashboard/actions";
import { SOCIAL_PLATFORMS, type SocialLinks } from "@/lib/social-links";

type Cat = { slug: string; name: string };

type Initial = Partial<{
  name: string;
  description: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  hours: string;
  googleMapsLink: string;
  hasMapPin: boolean;
  socialLinks: SocialLinks;
}>;

export function BusinessForm({
  mode,
  categories,
  initial = {},
  businessId,
  selected = [],
  primaryCategory: initialPrimary = "",
}: {
  mode: "create" | "edit";
  categories: Cat[];
  initial?: Initial;
  businessId?: number;
  selected?: string[];
  primaryCategory?: string;
}) {
  const action = mode === "create" ? submitBusiness : updateBusiness;
  const [state, formAction, pending] = useActionState<FormResult, FormData>(action, {});
  const [checked, setChecked] = useState<Set<string>>(() => {
    const set = new Set(selected);
    if (initialPrimary) set.add(initialPrimary);
    return set;
  });
  const [primary, setPrimary] = useState(() => {
    if (initialPrimary && selected.includes(initialPrimary)) return initialPrimary;
    if (initialPrimary) return initialPrimary;
    return selected[0] ?? "";
  });

  function toggleCategory(slug: string, on: boolean) {
    const next = new Set(checked);
    if (on) next.add(slug);
    else next.delete(slug);
    setChecked(next);

    if (!on && primary === slug) {
      setPrimary([...next][0] ?? "");
    } else if (on && (!primary || !next.has(primary))) {
      setPrimary(slug);
    }
  }

  return (
    <form action={formAction} className="space-y-7">
      {mode === "edit" && <input type="hidden" name="businessId" value={businessId} />}

      {mode === "create" ? (
        <Field label="Business name" required>
          <input
            name="name"
            required
            defaultValue={initial.name}
            className={inputCls}
            placeholder="e.g. Grand Touch Auto Detailing"
          />
        </Field>
      ) : (
        <div>
          <span className={labelCls}>Business name</span>
          <p className="mt-1 text-lg font-bold text-ink">{initial.name}</p>
        </div>
      )}

      <Field label="Description" hint="Tell customers what you do. Longer, detailed descriptions rank better and raise your Easy Auto Score.">
        <textarea
          name="description"
          rows={5}
          defaultValue={initial.description}
          className={inputCls}
          placeholder="Services offered, specialities, what makes you different…"
        />
      </Field>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <Field label="Phone">
          <input name="phone" defaultValue={initial.phone} className={inputCls} placeholder="+971 5X XXX XXXX" />
        </Field>
        <Field label="Email">
          <input name="email" type="email" defaultValue={initial.email} className={inputCls} placeholder="info@business.ae" />
        </Field>
        <Field label="Website">
          <input name="website" defaultValue={initial.website} className={inputCls} placeholder="business.ae" />
        </Field>
        <Field label="City">
          <input name="city" defaultValue={initial.city} className={inputCls} placeholder="Dubai" />
        </Field>
      </fieldset>

      <Field label="Address">
        <input name="address" defaultValue={initial.address} className={inputCls} placeholder="Street, area, emirate" />
      </Field>

      <Field
        label="Google Maps link"
        hint="Open your business in Google Maps → Share → Copy link. Paste it here to show the map pin on your listing page. Address alone does not power the map."
      >
        <input
          name="googleMapsLink"
          type="url"
          defaultValue={initial.googleMapsLink}
          className={inputCls}
          placeholder="https://www.google.com/maps/place/…"
        />
        {initial.hasMapPin && (
          <p className="mt-1.5 text-xs text-success-600">Map pin saved — update the link above to move it.</p>
        )}
      </Field>

      <div>
        <span className={labelCls}>Social media</span>
        <p className="mt-0.5 text-xs text-faint">
          Add links to your profiles — they appear as icons on your public listing. Leave blank
          to hide.
        </p>
        <fieldset className="mt-3 grid gap-4 sm:grid-cols-2">
          {SOCIAL_PLATFORMS.map((p) => (
            <Field key={p.key} label={p.label}>
              <input
                name={`social_${p.key}`}
                type="url"
                defaultValue={initial.socialLinks?.[p.key] ?? ""}
                className={inputCls}
                placeholder={p.placeholder}
              />
            </Field>
          ))}
        </fieldset>
      </div>

      <Field label="Opening hours" hint="One line per day, e.g. “Monday: 9:00 AM – 9:00 PM”.">
        <textarea
          name="hours"
          rows={4}
          defaultValue={initial.hours ?? ""}
          className={inputCls}
          placeholder={"Monday: 9:00 AM – 9:00 PM\nTuesday: 9:00 AM – 9:00 PM\n…"}
        />
      </Field>

      <div>
        <span className={labelCls}>Categories</span>
        <p className="mt-0.5 text-xs text-faint">
          Pick every service you offer — businesses can belong to multiple categories.
        </p>

        {checked.size > 0 && (
          <div className="mt-3">
            <label className="block">
              <span className={labelCls}>Main category</span>
              <span className="mt-0.5 block text-xs text-faint">
                Shown on your public listing page and in search results.
              </span>
              <select
                name="primaryCategory"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className={`${inputCls} mt-2`}
              >
                {[...checked].map((slug) => {
                  const cat = categories.find((c) => c.slug === slug);
                  return (
                    <option key={slug} value={slug}>
                      {cat?.name ?? slug}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>
        )}

        <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-line bg-canvas p-3">
          <div className="grid gap-1 sm:grid-cols-2">
            {categories.map((c) => (
              <label
                key={c.slug}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-body hover:bg-surface"
              >
                <input
                  type="checkbox"
                  name="categories"
                  value={c.slug}
                  checked={checked.has(c.slug)}
                  onChange={(e) => toggleCategory(c.slug, e.target.checked)}
                  className="h-4 w-4 rounded border-line-strong text-brand-600 focus:ring-brand-400"
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      </div>

      {state.error && (
        <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-success-500/10 px-3 py-2 text-sm text-success-600">
          Saved. Your changes are live.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : mode === "create" ? "Submit for review" : "Save changes"}
      </button>
    </form>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100";
const labelCls = "block text-sm font-semibold text-ink";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelCls}>
        {label}
        {required && <span className="text-danger-500"> *</span>}
      </span>
      {hint && <span className="mt-0.5 block text-xs text-faint">{hint}</span>}
      <div className="mt-2">{children}</div>
    </label>
  );
}
