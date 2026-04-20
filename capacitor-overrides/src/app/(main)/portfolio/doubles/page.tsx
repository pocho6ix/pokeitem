import type { Metadata } from "next";
import { PortfolioDoublesClient } from "./PortfolioDoublesClient";

export const metadata: Metadata = {
  title: "Doublons — Mon classeur",
  description:
    "Retrouvez toutes les cartes en doublon (quantité > 1) de votre classeur Pokémon TCG, classées par série, avec leur cote Cardmarket pour faciliter vos échanges.",
  robots: { index: false, follow: true },
};

export default function PortfolioDoublesPage() {
  return <PortfolioDoublesClient />;
}
