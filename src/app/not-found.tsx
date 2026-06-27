import Link from "next/link";
import { Container } from "@/components/container";
import { SearchBar } from "@/components/search-bar";

export default function NotFound() {
  return (
    <Container className="py-24">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-600">404</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-3 text-muted">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
          Try searching for a business or browse a category.
        </p>
        <div className="mx-auto mt-8 max-w-md">
          <SearchBar />
        </div>
        <div className="mt-6">
          <Link href="/" className="font-semibold text-brand-600 hover:text-brand-700">
            ← Back to home
          </Link>
        </div>
      </div>
    </Container>
  );
}
