import { PortfolioDoublesSerieClient } from "./PortfolioDoublesSerieClient";

export function generateStaticParams() {
  return [{ blocSlug: "_", serieSlug: "_" }];
}

export const dynamicParams = false;

export default function DoublesSerieDetailPage() {
  return <PortfolioDoublesSerieClient />;
}
