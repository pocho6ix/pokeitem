import { SerieCartesClient } from "./SerieCartesClient";

// A single placeholder params entry is required for Next's static export.
// The `_` segment is just a stub file; the real URLs are resolved
// client-side via `useParams` in `SerieCartesClient`.
export function generateStaticParams() {
  return [{ blocSlug: "_", serieSlug: "_" }];
}

export const dynamicParams = false;

export default function CollectionSerieCartesPage() {
  return <SerieCartesClient />;
}
