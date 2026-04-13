import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PortfolioMiniStats } from "@/components/dashboard/PortfolioMiniStats";
import { ClasseurBetaOffer } from "@/components/beta/ClasseurBetaOffer";
import { PortfolioTiles } from "./PortfolioTiles";


// Recharts (~150 KB) chargé en lazy — code splitting sans bloquer le bundle principal
const PortfolioEvolutionChart = dynamic(
  () => import("@/components/dashboard/PortfolioEvolutionChart").then((m) => m.PortfolioEvolutionChart),
  {
    loading: () => <div className="mb-6 h-44 animate-pulse rounded-xl bg-[var(--bg-secondary)]" />,
  }
);

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

      {/* Beta offer for new non-subscribed users */}
      <ClasseurBetaOffer />

      {/* Portfolio KPI metrics */}
      <Suspense>
        <PortfolioMiniStats />
      </Suspense>

      {/* Evolution chart — right after the KPI stats */}
      <PortfolioEvolutionChart />

      {/* Navigation tiles — hidden on sub-pages */}
      <PortfolioTiles />

      {/* Page content */}
      {children}
    </div>
  );
}
