import type { Metadata } from "next";
import DashboardContent from "@/components/dashboard/DashboardContent";

export const metadata: Metadata = {
  title: "Ma Collection | PokeItem",
  description:
    "Tableau de bord de votre collection de produits Pokemon scelles. Suivez la valeur, le P&L et les tendances du marche.",
};

export default function MaCollectionPage() {
  return <DashboardContent />;
}
