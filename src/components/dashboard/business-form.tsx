"use client";

import { useActionState } from "react";
import { submitBusiness, updateBusiness, type FormResult } from "@/app/dashboard/actions";

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
}>;

export function BusinessForm({
  mode,
  categories,
  initial = {},
  businessId,
  selected = [],
}: {
  mode: "create" | "edit";
  categories: Cat[];
  initial?: Initial;
  businessId?: number;
  selected?: string[];
}) {
  const action = mode === "create" ? submitBusiness : updateBusiness;
  const [state, formAction, pending] = useActionState<FormResult, FormData>(action, {});
  const selectedSet = new Set(selected);

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
          Pick every service you offer — businesses can belong to multiple categories. The first
          one is treated as primary.
        </p>
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
                  defaultChecked={selectedSet.has(c.slug)}
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
