import { SerieCartesClient } from "./SerieCartesClient";
import { SERIES } from "@/data/series";

// Enumerate every bloc×serie combination from the static SERIES array so
// each possible URL gets a pre-generated HTML file. Without this, clicking
// a serie in the catalog 404s in the Capacitor WebView (static export has
// no server to resolve runtime params).
export function generateStaticParams() {
  return SERIES.map((s) => ({ blocSlug: s.blocSlug, serieSlug: s.slug }));
}

export const dynamicParams = false;

export default function CollectionSerieCartesPage() {
  return <SerieCartesClient />;
}
