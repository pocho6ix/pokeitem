import type { Metadata } from "next";
import { ClasseurView } from "@/components/classeur/ClasseurView";

// Auth-gated Classeur landing. Not indexable; `follow: true` matches
// the portfolio convention (sub-pages all carry the same directive).
export const metadata: Metadata = {
  title: "Classeur",
  description:
    "Accédez à votre classeur Pokémon TCG PokeItem : cartes, produits scellés, statistiques, wishlist et suivi de cote.",
  robots: { index: false, follow: true },
};

export default function PortfolioPage() {
  return <ClasseurView />;
}
