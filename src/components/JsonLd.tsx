// Server-only component that emits a <script type="application/ld+json">
// tag with the given payload. Centralised so call sites don't sprinkle
// `dangerouslySetInnerHTML` everywhere — and so the serialisation rule
// (no inlining of raw user text) stays in one place.
//
// Usage:
//   <JsonLd data={generateCardJsonLd(card, serie, bloc)} />
//
// The root layout still writes its Organization + WebSite JSON-LD inline
// because it runs before React (pre-hydration) — migrating it would
// require moving it inside <Providers> which changes render order. Out
// of scope for now; safe to leave.

export interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // `JSON.stringify` escapes `</script>` injections in the string values
      // by design; no extra sanitisation needed for well-formed input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
