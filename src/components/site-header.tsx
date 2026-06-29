import Link from "next/link";
import { Container } from "./container";
import { Logo } from "./logo";
import { SearchBar } from "./search-bar";
import { AuthNav } from "./auth-nav";

const NAV_LINKS = [
  { href: "/map", label: "Map" },
  { href: "/business", label: "Browse" },
  { href: "/news", label: "Guides & news" },
  { href: "/near-me", label: "Near me" },
] as const;

// Sticky top bar present on every page. Server component; embeds the client SearchBar.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
      <Container className="flex h-16 items-center gap-3 sm:gap-4">
        <Logo />

        <nav
          aria-label="Main"
          className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto text-xs font-medium text-body [-ms-overflow-style:none] [scrollbar-width:none] sm:text-sm md:flex-none md:overflow-visible [&::-webkit-scrollbar]:hidden"
        >
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-lg px-2.5 py-2 hover:bg-canvas hover:text-ink sm:px-3"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden w-44 sm:block lg:w-56">
            <SearchBar />
          </div>
          <Link
            href="/submit-business"
            className="hidden rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 md:inline-block"
          >
            List your business
          </Link>
          <AuthNav />
        </div>
      </Container>
    </header>
  );
}
