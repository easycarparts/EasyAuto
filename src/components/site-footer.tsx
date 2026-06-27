import Link from "next/link";
import { Container } from "./container";
import { Logo } from "./logo";
import { getCities } from "@/lib/data";
import { SERVICE_GROUPS } from "@/lib/taxonomy";
import { formatCount } from "@/lib/format";

// Footer with the service groups + emirates for internal linking (SEO).
export async function SiteFooter() {
  const cities = await getCities();
  const topCities = cities.slice(0, 7);

  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <Container className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-xs text-sm text-muted">
              The UAE&apos;s directory of trusted auto-service businesses — wash,
              detailing, parts, repair, towing and more.
            </p>
          </div>

          <FooterCol title="Services">
            {SERVICE_GROUPS.map((g) => (
              <FooterLink key={g.slug} href={`/business-category/${g.slug}`}>
                {g.name}
              </FooterLink>
            ))}
          </FooterCol>

          <FooterCol title="Browse by emirate">
            {topCities.map((c) => (
              <li key={c.city} className="text-sm text-muted">
                {c.city}{" "}
                <span className="text-faint">({formatCount(c.count)})</span>
              </li>
            ))}
          </FooterCol>

          <FooterCol title="Easy Auto">
            <FooterLink href="/news">News &amp; guides</FooterLink>
            <FooterLink href="/">Home</FooterLink>
          </FooterCol>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 text-sm text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Easy Auto. All rights reserved.</p>
          <p>Listings sourced from public business information.</p>
        </div>
      </Container>
    </footer>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-muted hover:text-brand-600">
        {children}
      </Link>
    </li>
  );
}
