import type { Metadata } from "next";
import Link from "next/link";
import DashboardContent from "@/components/dashboard/DashboardContent";

export const metadata: Metadata = {
  title: "Classeur — Items | PokeItem",
  description: "Tableau de bord de votre classeur de produits Pokémon scellés.",
};

export default function PortfolioItemsPage() {
  return (
    <>
      <Link href="/portfolio" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Classeur
      </Link>
      <DashboardContent compact />
    </>
  );
}
