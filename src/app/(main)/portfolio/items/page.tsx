import type { Metadata } from "next";
import DashboardContent from "@/components/dashboard/DashboardContent";

export const metadata: Metadata = {
  title: "Classeur — Items | PokeItem",
  description: "Tableau de bord de votre classeur de produits Pokémon scellés.",
};

export default function PortfolioItemsPage() {
  return <DashboardContent compact />;
}
