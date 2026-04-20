import { PortfolioSerieCartesClient } from "./PortfolioSerieCartesClient";

export function generateStaticParams() {
  return [{ blocSlug: "_", serieSlug: "_" }];
}

export const dynamicParams = false;

export default function PortfolioSerieCartesPage() {
  return <PortfolioSerieCartesClient />;
}
