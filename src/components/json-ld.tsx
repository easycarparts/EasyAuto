// Renders a structured-data <script>. JSON.stringify doesn't escape `<`, so we
// replace it with its unicode form to avoid XSS via stored strings (per Next docs).
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
