import { PortfolioDoublesSerieClient } from "./PortfolioDoublesSerieClient";
import { SERIES } from "@/data/series";

export function generateStaticParams() {
  return SERIES.map((s) => ({ blocSlug: s.blocSlug, serieSlug: s.slug }));
}

export const dynamicParams = false;

export default function DoublesSerieDetailPage() {
  return <PortfolioDoublesSerieClient />;
}
