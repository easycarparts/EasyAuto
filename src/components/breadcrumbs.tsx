import Link from "next/link";
import { Fragment } from "react";

export type Crumb = { label: string; href?: string };

// Visual breadcrumb trail. JSON-LD BreadcrumbList is emitted separately on pages.
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={i}>
              <li>
                {item.href && !last ? (
                  <Link href={item.href} className="hover:text-brand-600">
                    {item.label}
                  </Link>
                ) : (
                  <span className={last ? "text-body" : ""} aria-current={last ? "page" : undefined}>
                    {item.label}
                  </span>
                )}
              </li>
              {!last && (
                <li aria-hidden="true" className="text-faint">
                  /
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
