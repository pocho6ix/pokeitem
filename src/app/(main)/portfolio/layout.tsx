import { ClasseurBetaOffer } from "@/components/beta/ClasseurBetaOffer";
import { PortfolioBackLink } from "./PortfolioBackLink";

// The Classeur refactor removed the legacy sub-page dashboard (mini
// KPIs + evolution chart). Sub-pages (Mes cartes / Mes items /
// Mes doubles / Liste de souhaits) now render only their own content
// — global KPIs and the evolution chart live exclusively on the
// /portfolio root (owned by ClasseurView).
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

      {/* Page content — ClasseurView on root, sub-page content elsewhere */}
      {children}
    </div>
  );
}
