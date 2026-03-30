import type { Metadata } from "next";
import DashboardContent from "@/components/dashboard/DashboardContent";
import { TabNav } from "@/components/ui/TabNav";

export const metadata: Metadata = {
  title: "Classeur | PokeItem",
  description:
    "Tableau de bord de votre classeur de produits Pokémon scellés. Suivez la valeur, le P&L et les tendances du marché.",
};

export default function PortfolioPage() {
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <TabNav
          tabs={[
            { label: "Items", href: "/portfolio", active: true },
            { label: "Cartes", href: "/portfolio/cartes", active: false },
          ]}
        />
      </div>
      <DashboardContent />
    </>
  );
}
