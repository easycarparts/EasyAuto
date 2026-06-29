import Link from "next/link";

export function CrossLinkCallout({
  title,
  description,
  href,
  label,
}: {
  title: string;
  description: string;
  href: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-brand-50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      </div>
      <Link
        href={href}
        className="shrink-0 rounded-xl border border-brand-200 bg-surface px-5 py-2.5 text-center text-sm font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-100"
      >
        {label} →
      </Link>
    </div>
  );
}
