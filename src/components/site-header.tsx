import Link from "next/link";
import { Container } from "./container";
import { Logo } from "./logo";
import { SearchBar } from "./search-bar";
import { AuthNav } from "./auth-nav";

// Sticky top bar present on every page. Server component; embeds the client SearchBar.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
      <Container className="flex h-16 items-center gap-4">
        <Logo />

        <nav className="ml-2 hidden items-center gap-1 text-sm font-medium text-body md:flex">
          <Link
            href="/business-category/wash-and-cleaning"
            className="rounded-lg px-3 py-2 hover:bg-canvas hover:text-ink"
          >
            Wash
          </Link>
          <Link
            href="/business-category/detailing-and-protection"
            className="rounded-lg px-3 py-2 hover:bg-canvas hover:text-ink"
          >
            Detailing
          </Link>
          <Link
            href="/business-category/parts-and-accessories"
            className="rounded-lg px-3 py-2 hover:bg-canvas hover:text-ink"
          >
            Parts
          </Link>
          <Link
            href="/business-category/repair-and-maintenance"
            className="rounded-lg px-3 py-2 hover:bg-canvas hover:text-ink"
          >
            Repair
          </Link>
          <Link
            href="/news"
            className="rounded-lg px-3 py-2 hover:bg-canvas hover:text-ink"
          >
            News
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden w-56 lg:block">
            <SearchBar />
          </div>
          <AuthNav />
        </div>
      </Container>
    </header>
  );
}
