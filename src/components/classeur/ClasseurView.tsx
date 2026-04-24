"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeftRight, LineChart, PieChart, Star } from "lucide-react";
import { useSession } from "@/lib/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import { fetchApi } from "@/lib/api";
import { isNative } from "@/lib/native";
import { getPeriodFromFirstActivity } from "@/lib/portfolio/getPeriodFromFirstActivity";
import { ClasseurHeader } from "./ClasseurHeader";
import { PortfolioGlobalCard } from "./PortfolioGlobalCard";
import { InvestmentHeroCard } from "./InvestmentHeroCard";
import { InvestmentCompactCard } from "./InvestmentCompactCard";
import { TopPerformancesSection } from "./TopPerformancesSection";
import { GOLD, GOLD_GRADIENT } from "./constants";

// Lazy-load the Recharts-heavy evolution chart (~150 KB). Matches the
// pattern that used to live in portfolio/layout.tsx — same loader
// skeleton so the perceived fold stays consistent.
const PortfolioEvolutionChart = dynamic(
  () =>
    import("@/components/dashboard/PortfolioEvolutionChart").then(
      (m) => m.PortfolioEvolutionChart,
    ),
  {
    loading: () => (
      <div className="mb-6 h-44 animate-pulse rounded-xl bg-[var(--bg-secondary)]" />
    ),
  },
);

interface Stats {
  totalValue: number;
  totalInvested: number;
  profitLoss: number;
  profitLossPercent: number;
  totalItems: number;
  cardCount?: number;
  cardValue?: number | null;
  doublesCount?: number;
  doublesValue?: number | null;
  itemsValue?: number | null;
  wishlistCount?: number;
  // ISO date of the earliest card/item the user has ever added. Used to
  // pick the evolution-chart's default timeframe ("7J" for fresh
  // accounts, "MAX" for long-running ones). Nullable for brand new users
  // with an empty collection — in that case `getPeriodFromFirstActivity`
  // falls back to "1M".
  firstActivityDate?: string | null;
}

const CARD_PREVIEWS = [
  "/images/classeur/card-preview-1.webp",
  "/images/classeur/card-preview-2.webp",
  "/images/classeur/card-preview-3.webp",
];
const ITEM_PREVIEWS = [
  "/images/classeur/item-preview-1.webp",
  "/images/classeur/item-preview-2.webp",
];
const DOUBLE_PREVIEWS = [
  "/images/classeur/double-preview.webp",
  "/images/classeur/double-preview.webp",
];

// Main Classeur view — iEstims-inspired layout, keeping PokeItem's
// blue-night + gold identity via the existing CSS vars.
//
// Vertical flow:
//   1. Header (title + mask/export actions)
//   2. PortfolioGlobalCard (consolidated KPI hero)
//   3. "Mes investissements" grid
//      ├─ InvestmentHeroCard × 2  (Cartes / Items)
//      └─ InvestmentCompactCard × 2  (Doubles / Wishlist)
//   4. "Chercher un échange" CTA
//   5. TopPerformancesSection (empty state v1)
//   6. PortfolioEvolutionChart (lazy)

export function ClasseurView() {
  const router = useRouter();
  const { status } = useSession();
  const { isPro } = useSubscription();
  // Trade matching ("Chercher un échange") is web-only for now — the
  // native app lacks the wider discovery surface, so we hide the CTA
  // on iOS rather than routing users into a dead-end.
  const showTradeCta = !isNative();

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    setLoading(true);
    // 300 ms debounce mirrors the legacy PortfolioMiniStats behaviour —
    // prevents a thundering-herd on the stats endpoint right after the
    // session hook resolves.
    const t = setTimeout(() => {
      fetchApi("/api/portfolio/stats")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: Stats | null) => {
          if (d) setStats(d);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [status]);

  // Next.js preserves scroll across client-side navigations. When the
  // user taps the bottom-nav "Classeur" while already on another
  // Classeur sub-page we want them at the top of the new layout.
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, []);

  const totalItemsCount = stats?.totalItems ?? null;

  // The outer max-w-7xl + padding wrapper lives in portfolio/layout.tsx
  // (shared with sub-pages), so this component just contributes its
  // internal vertical stack.
  return (
    <>
      {/* 1. Header */}
      <ClasseurHeader />

      {/* 2. Portfolio Global */}
      <PortfolioGlobalCard
        totalValue={stats?.totalValue ?? null}
        profitLoss={stats?.profitLoss ?? null}
        profitLossPercent={stats?.profitLossPercent ?? null}
        totalInvested={stats?.totalInvested ?? null}
        loading={loading}
      />

      {/* 3. Mes investissements */}
      <section aria-label="Mes investissements" className="mb-4">
        <div className="mb-3 flex items-center gap-2">
          <PieChart className="h-5 w-5" style={{ color: GOLD }} />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Mes investissements
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InvestmentHeroCard
            title="Voir mes Cartes"
            href="/portfolio/cartes"
            value={stats?.cardValue ?? null}
            count={stats?.cardCount ?? null}
            countLabel="cartes"
            previewImages={CARD_PREVIEWS}
            previewLayout="cards"
            loading={loading}
          />
          <InvestmentHeroCard
            title="Voir mes Items"
            href="/portfolio/items"
            value={stats?.itemsValue ?? null}
            count={totalItemsCount}
            countLabel="produits"
            previewImages={ITEM_PREVIEWS}
            previewLayout="items"
            loading={loading}
          />
          <InvestmentCompactCard
            title="Mes doubles"
            href="/portfolio/doubles"
            previewImages={DOUBLE_PREVIEWS}
            value={stats?.doublesValue ?? null}
            count={stats?.doublesCount ?? null}
            countLabel="doublons"
            loading={loading}
          />
          <InvestmentCompactCard
            title="Liste de souhaits"
            href="/portfolio/souhaits"
            icon={Star}
            iconColor="#C084FC"
            count={stats?.wishlistCount ?? null}
            countLabel="cartes"
            loading={loading}
          />
        </div>
      </section>

      {/* 4. Chercher un échange — web-only (hidden on iOS) */}
      {showTradeCta && (
        <button
          type="button"
          onClick={() => router.push(isPro ? "/echanges" : "/pricing")}
          className="mb-6 flex w-full items-center justify-between gap-3 rounded-2xl border border-[#E7BA76]/40 bg-[#E7BA76]/8 px-4 py-3.5 text-left transition-colors hover:border-[#E7BA76]/70 hover:bg-[#E7BA76]/12"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: "rgba(231, 186, 118, 0.2)" }}
            >
              <ArrowLeftRight className="h-5 w-5" style={{ color: GOLD }} />
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">
                Chercher un échange
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Trouve un dresseur et vois ce que vous pouvez faire
              </p>
            </div>
          </div>
          {isPro ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="shrink-0 text-[var(--text-tertiary)]"
              aria-hidden
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          ) : (
            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide"
              style={{ background: GOLD_GRADIENT, color: "#1A1A1A" }}
            >
              ★ PREMIUM
            </span>
          )}
        </button>
      )}

      {/* 5. Top performances */}
      <TopPerformancesSection />

      {/* 6. Évolution de mon classeur — default timeframe scales with
           account age (same rule as the home page's CollectionHeroCard). */}
      <div className="mb-2 flex items-center gap-2">
        <LineChart className="h-5 w-5" style={{ color: GOLD }} />
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          Évolution de mon classeur
        </h2>
      </div>
      <PortfolioEvolutionChart
        initialPeriod={getPeriodFromFirstActivity(stats?.firstActivityDate ?? null)}
      />
    </>
  );
}
