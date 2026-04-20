import type { Metadata } from "next";
import { CardDetailClient } from "./CardDetailClient";

export const metadata: Metadata = {
  title: "Détails de la carte",
  description:
    "Découvrez les détails d'une carte Pokémon TCG : rareté, prix Cardmarket et versions possédées.",
};

export function generateStaticParams() {
  return [{ cardId: "_" }];
}

export const dynamicParams = false;

export default function CardDetailPage() {
  return <CardDetailClient />;
}
