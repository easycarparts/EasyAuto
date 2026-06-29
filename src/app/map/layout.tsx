// Map page fills the viewport below the header (no footer scroll).
export default function MapLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="h-[calc(100dvh-4rem)]">{children}</div>;
}
