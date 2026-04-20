import { ItemDetailClient } from "./ItemDetailClient";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export const dynamicParams = false;

export default function PortfolioItemDetailPage() {
  return <ItemDetailClient />;
}
