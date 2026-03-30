import { PortfolioMiniStats } from "@/components/dashboard/PortfolioMiniStats";
import { PortfolioTabNav } from "@/components/dashboard/PortfolioTabNav";

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Mon Classeur</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Suivez la valeur de vos items et gérez votre collection de cartes
        </p>
      </div>

      {/* Portfolio KPI metrics — always visible on both tabs */}
      <PortfolioMiniStats />

      {/* Tab navigation: Cartes | Items */}
      <PortfolioTabNav />

      {/* Tab content */}
      {children}
    </div>
  );
}
