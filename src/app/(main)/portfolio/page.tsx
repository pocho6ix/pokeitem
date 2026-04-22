import type { Metadata } from "next";

// Auth-gated landing — tiles are rendered by the layout above the
// stats/chart. Not indexable; `follow: true` matches the portfolio
// convention (sub-pages all carry the same directive).
export const metadata: Metadata = {
  title: "Classeur",
  description:
    "Accédez à votre classeur Pokémon TCG PokeItem : cartes, produits scellés, statistiques, wishlist et suivi de cote.",
  robots: { index: false, follow: true },
};

// Landing — tiles are rendered by the layout above the stats/chart.
// Nothing extra needed here.
export default function PortfolioPage() {
  return null;
}
