import type { Metadata } from "next";
import DashboardContent from "@/components/dashboard/DashboardContent";

export const metadata: Metadata = {
  title: "Portfolio | PokeItem",
  description:
    "Tableau de bord de votre portfolio de produits Pokémon scellés. Suivez la valeur, le P&L et les tendances du marché.",
};

export default function PortfolioPage() {
  return <DashboardContent />;
}
