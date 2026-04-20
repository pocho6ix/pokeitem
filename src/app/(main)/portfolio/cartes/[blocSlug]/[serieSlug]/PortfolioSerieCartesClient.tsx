"use client";

import { SerieCartesClient } from "@/app/(main)/collection/cartes/[blocSlug]/[serieSlug]/SerieCartesClient";

export function PortfolioSerieCartesClient() {
  // Same UI as the collection serie page for now — diverges once an
  // owned-only endpoint is wired in.
  return <SerieCartesClient />;
}
