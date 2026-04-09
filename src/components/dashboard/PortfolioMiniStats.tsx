"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { CollectionValue } from "@/components/collection/CollectionValue";
import { useSubscription } from "@/hooks/useSubscription";
import { ProButton } from "@/components/subscription/ProButton";

interface Stats {
  totalValue: number;
  totalInvested: number;
  profitLoss: number;
  profitLossPercent: number;
  totalItems: number;
}

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export function PortfolioMiniStats() {
  const { status } = useSession();
  const { isPro } = useSubscription();
  const searchParams = useSearchParams();
  const rarity = searchParams.get("rarity");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    setLoading(true);
    // 300ms debounce — évite les requêtes en rafale si le filtre change rapidement
    const timer = setTimeout(() => {
      const url = rarity ? `/api/portfolio/stats?rarity=${rarity}` : "/api/portfolio/stats";
      fetch(url)
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d) setStats(d); })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [status, rarity]);

  if (status === "unauthenticated" || (!loading && !stats)) return null;

  const isPositive = (stats?.profitLoss ?? 0) >= 0;

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Valeur actuelle — blurred for free users */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3">
        {loading || !stats ? (
          <div className="animate-pulse space-y-2">
            <div className="h-3 w-20 rounded bg-[var(--bg-subtle)]" />
            <div className="h-5 w-24 rounded bg-[var(--bg-subtle)]" />
          </div>
        ) : (
          <>
            <p className="text-xs text-[var(--text-secondary)]">Valeur actuelle</p>
            <CollectionValue
              value={stats.totalValue}
              className="mt-0.5 text-lg font-bold text-[var(--text-primary)]"
            />
          </>
        )}
      </div>
      {/* Investi total — always visible */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3">
        {loading || !stats ? (
          <div className="animate-pulse space-y-2">
            <div className="h-3 w-20 rounded bg-[var(--bg-subtle)]" />
            <div className="h-5 w-24 rounded bg-[var(--bg-subtle)]" />
          </div>
        ) : (
          <>
            <p className="text-xs text-[var(--text-secondary)]">Investi total</p>
            <p className="mt-0.5 text-lg font-bold text-[var(--text-primary)]">{fmt(stats.totalInvested)}</p>
          </>
        )}
      </div>

      {/* P&L — Pro only */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3">
        {loading || !stats ? (
          <div className="animate-pulse space-y-2">
            <div className="h-3 w-20 rounded bg-[var(--bg-subtle)]" />
            <div className="h-5 w-24 rounded bg-[var(--bg-subtle)]" />
          </div>
        ) : (
          <>
            <p className="text-xs text-[var(--text-secondary)]">P&amp;L</p>
            {isPro ? (
              <p className={`mt-0.5 text-lg font-bold ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                {isPositive ? "+" : ""}{fmt(stats.profitLoss)}
              </p>
            ) : (
              <div className="mt-1"><ProButton size="sm" /></div>
            )}
          </>
        )}
      </div>

      {/* P&L % — Pro only */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3">
        {loading || !stats ? (
          <div className="animate-pulse space-y-2">
            <div className="h-3 w-20 rounded bg-[var(--bg-subtle)]" />
            <div className="h-5 w-24 rounded bg-[var(--bg-subtle)]" />
          </div>
        ) : (
          <>
            <p className="text-xs text-[var(--text-secondary)]">P&amp;L %</p>
            {isPro ? (
              <p className={`mt-0.5 text-lg font-bold ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                {isPositive ? "+" : ""}{stats.profitLossPercent.toFixed(1)} %
              </p>
            ) : (
              <div className="mt-1"><ProButton size="sm" /></div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
