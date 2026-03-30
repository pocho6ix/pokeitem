import type { Metadata } from "next";
import DashboardContent from "@/components/dashboard/DashboardContent";

export const metadata: Metadata = {
  title: "Classeur | PokeItem",
  description:
    "Tableau de bord de votre classeur de produits Pokémon scellés. Suivez la valeur, le P&L et les tendances du marché.",
};

export default function PortfolioPage() {
  // The layout (layout.tsx) handles the page header, KPI stats and TabNav.
  // DashboardContent renders in compact mode: charts + items table only.
  return <DashboardContent compact />;
}
