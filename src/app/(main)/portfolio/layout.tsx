import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PortfolioMiniStats } from "@/components/dashboard/PortfolioMiniStats";
import { ClasseurBetaOffer } from "@/components/beta/ClasseurBetaOffer";
import { PortfolioBackLink } from "./PortfolioBackLink";
import { LegacyDashboardWrapper } from "./LegacyDashboardWrapper";

// Recharts (~150 KB) chargé en lazy — code splitting sans bloquer le bundle principal
const PortfolioEvolutionChart = dynamic(
  () => import("@/components/dashboard/PortfolioEvolutionChart").then((m) => m.PortfolioEvolutionChart),
  {
    loading: () => <div className="mb-6 h-44 animate-pulse rounded-xl bg-[var(--bg-secondary)]" />,
  }
);

// The outer max-w-7xl container stays — sub-pages rely on it for
// their own content wrapping. What changed for the Classeur refactor:
//
//   • PortfolioTiles (the legacy "Mes collections" grid) is gone —
//     the new ClasseurView replaces it on /portfolio root.
//   • PortfolioMiniStats + PortfolioEvolutionChart are now guarded by
//     LegacyDashboardWrapper, so they only render on sub-pages. On
//     /portfolio root the new ClasseurView owns its own hero + chart.
//
// BackLink and BetaOffer self-hide when appropriate (root / Pro users),
// so they stay at the top unconditionally.

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back to classeur root — only on sub-pages (internal guard) */}
      <PortfolioBackLink />

      {/* Beta offer for new non-subscribed users (internal guard) */}
      <ClasseurBetaOffer />

      {/* Legacy dashboard (stats + chart) — sub-pages only */}
      <LegacyDashboardWrapper>
        <Suspense>
          <PortfolioMiniStats />
        </Suspense>
        <PortfolioEvolutionChart />
      </LegacyDashboardWrapper>

      {/* Page content — ClasseurView on root, sub-page content elsewhere */}
      {children}
    </div>
  );
}
