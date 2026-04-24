"use client";

import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp, Wallet, ShoppingCart } from "lucide-react";
import { useHideValues } from "@/components/ui/HideValuesContext";
import { useSubscription } from "@/hooks/useSubscription";
import { ProButton } from "@/components/subscription/ProButton";
import { GOLD, fmtEUR } from "./constants";

interface PortfolioGlobalCardProps {
  totalValue: number | null;
  profitLoss: number | null;
  profitLossPercent: number | null;
  totalInvested: number | null;
  loading: boolean;
}

const MASK = <span className="tracking-widest opacity-40">••••</span>;

// Hero card at the top of the Classeur: one surface consolidating the
// 4 KPIs that used to live in PortfolioMiniStats (Valeur actuelle /
// Investi / P&L / P&L %).
//
// Shape:
// ┌─────────────────────────────────────────────┐
// │ 💰 Portefeuille global · Valeur totale   [Voir plus →] │
// │                                             │
// │   10 463,74 €                               │  ← totalValue (gold, huge)
// │                                             │
// │  ┌────────────┐  ┌────────────┐             │
// │  │📈 Gain     │  │🛒 Investi  │             │
// │  │ +7 649 €   │  │ 2 815 €    │             │
// │  │ +271.7 %   │  │            │             │
// │  └────────────┘  └────────────┘             │
// └─────────────────────────────────────────────┘
//
// P&L + P&L% are Pro-gated (matches the legacy behaviour) — free
// users see a ProButton nudge instead of the numbers.

export function PortfolioGlobalCard({
  totalValue,
  profitLoss,
  profitLossPercent,
  totalInvested,
  loading,
}: PortfolioGlobalCardProps) {
  const { hidden } = useHideValues();
  const { isPro } = useSubscription();

  const isPositive = (profitLoss ?? 0) >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <section
      className="relative mb-6 overflow-hidden rounded-3xl border bg-[var(--bg-card)] p-5 shadow-lg"
      style={{ borderColor: "rgba(231, 186, 118, 0.22)" }}
      aria-label="Portefeuille global"
    >
      {/* Subtle gold glow in the corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: GOLD }}
      />

      {/* Row 1 — identity + "Voir plus" */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(231, 186, 118, 0.15)" }}
          >
            <Wallet className="h-5 w-5" style={{ color: GOLD }} />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Portefeuille global
            </p>
            <p className="text-xs text-[var(--text-secondary)]">Valeur totale</p>
          </div>
        </div>

        <Link
          href="/portfolio/details"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[#E7BA76]/10"
          style={{ color: GOLD }}
          aria-label="Voir le détail du portefeuille"
        >
          Voir plus
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Row 2 — big value */}
      <div className="relative mt-4">
        {loading || totalValue == null ? (
          <div className="h-10 w-48 animate-pulse rounded-lg bg-[var(--bg-subtle)]" />
        ) : (
          <p
            className="text-4xl font-bold tabular-nums"
            style={{ color: GOLD }}
          >
            {hidden ? MASK : fmtEUR(totalValue, 2)}
          </p>
        )}
      </div>

      {/* Row 3 — two sub-cards */}
      <div className="relative mt-5 grid grid-cols-2 gap-3">
        {/* Gain */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <TrendIcon
              className="h-3.5 w-3.5"
              style={{ color: isPositive ? "#22C55E" : "#EF4444" }}
            />
            Gain
          </div>
          {loading || profitLoss == null ? (
            <div className="mt-2 h-6 w-20 animate-pulse rounded bg-[var(--bg-subtle)]" />
          ) : !isPro ? (
            <div className="mt-2">
              <ProButton size="sm" />
            </div>
          ) : (
            <>
              <p
                className={`mt-1 text-lg font-bold tabular-nums ${
                  isPositive ? "text-green-500" : "text-red-500"
                }`}
              >
                {hidden ? (
                  MASK
                ) : (
                  <>
                    {isPositive ? "+" : ""}
                    {fmtEUR(profitLoss)}
                  </>
                )}
              </p>
              {profitLossPercent != null && !hidden && (
                <p
                  className={`text-xs tabular-nums ${
                    isPositive ? "text-green-500/80" : "text-red-500/80"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {profitLossPercent.toFixed(1)} %
                </p>
              )}
            </>
          )}
        </div>

        {/* Investi */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <ShoppingCart className="h-3.5 w-3.5" />
            Investi
          </div>
          {loading || totalInvested == null ? (
            <div className="mt-2 h-6 w-20 animate-pulse rounded bg-[var(--bg-subtle)]" />
          ) : (
            <p className="mt-1 text-lg font-bold tabular-nums text-[var(--text-primary)]">
              {hidden ? MASK : fmtEUR(totalInvested)}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
