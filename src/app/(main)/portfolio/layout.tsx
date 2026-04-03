import { PortfolioMiniStats } from "@/components/dashboard/PortfolioMiniStats";
import { PortfolioEvolutionChart } from "@/components/dashboard/PortfolioEvolutionChart";
import { PortfolioTabNav } from "@/components/dashboard/PortfolioTabNav";
import { ClasseurBetaOffer } from "@/components/beta/ClasseurBetaOffer";

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

      {/* Beta offer for new non-subscribed users */}
      <ClasseurBetaOffer />

      {/* Portfolio KPI metrics — always visible on all tabs */}
      <PortfolioMiniStats />

      {/* Evolution chart — always visible below KPIs */}
      <PortfolioEvolutionChart />

      {/* Tab navigation: Cartes | Doubles | Items */}
      <PortfolioTabNav />

      {/* Tab content */}
      {children}
    </div>
  );
}
