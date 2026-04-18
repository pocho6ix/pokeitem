import type { Metadata } from "next";
import DashboardContent from "@/components/dashboard/DashboardContent";

export const metadata: Metadata = {
  title: "Classeur — Items scellés",
  description:
    "Tableau de bord de votre classeur de produits scellés Pokémon TCG : valeur totale, gains, statistiques et suivi de vos Booster Boxes, ETB et coffrets.",
  robots: { index: false, follow: true },
};

export default function PortfolioItemsPage() {
  return <DashboardContent compact />;
}
