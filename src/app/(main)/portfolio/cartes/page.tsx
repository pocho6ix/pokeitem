import type { Metadata } from "next";
import { PortfolioCartesClient } from "./PortfolioCartesClient";

export const metadata: Metadata = {
  title: "Classeur — Mes cartes",
  description:
    "Consultez et gérez votre classeur virtuel de cartes Pokémon TCG par série : progression, valeur, doublons et cartes manquantes avec leur cote Cardmarket.",
  robots: { index: false, follow: true },
};

export default function PortfolioCartesPage() {
  return <PortfolioCartesClient />;
}
