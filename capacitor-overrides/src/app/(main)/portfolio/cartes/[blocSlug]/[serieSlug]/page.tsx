import { PortfolioSerieCartesClient } from "./PortfolioSerieCartesClient";
import { SERIES } from "@/data/series";

export function generateStaticParams() {
  return SERIES.map((s) => ({ blocSlug: s.blocSlug, serieSlug: s.slug }));
}

export const dynamicParams = false;

export default function PortfolioSerieCartesPage() {
  return <PortfolioSerieCartesClient />;
}
