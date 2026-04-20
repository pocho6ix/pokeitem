import { SerieProduitsClient } from "./SerieProduitsClient";

export function generateStaticParams() {
  return [{ blocSlug: "_", serieSlug: "_" }];
}

export const dynamicParams = false;

export default function CollectionSerieProduitsPage() {
  return <SerieProduitsClient />;
}
