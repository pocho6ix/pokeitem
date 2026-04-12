"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { CollectionValue } from "@/components/collection/CollectionValue";
import { useSubscription } from "@/hooks/useSubscription";
import { ProButton } from "@/components/subscription/ProButton";
import { useHideValues } from "@/components/ui/HideValuesContext";

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

const MASK = <span className="tracking-widest opacity-40">••••</span>;

export function PortfolioMiniStats() {
  const { status } = useSession();
  const { isPro } = useSubscription();
  const searchParams = useSearchParams();
  const rarity = searchParams.get("rarity");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const { hidden, toggle } = useHideValues();

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    setLoading(true);
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
    <div className="mb-6">
      {/* Toggle row */}
      <div className="mb-2 flex justify-end">
        <button
          onClick={toggle}
          aria-label={hidden ? "Afficher les valeurs" : "Masquer les valeurs"}
          className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
        >
          {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {hidden ? "Afficher" : "Masquer"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Valeur actuelle */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3">
          {loading || !stats ? (
            <div className="animate-pulse space-y-2">
              <div className="h-3 w-20 rounded bg-[var(--bg-subtle)]" />
              <div className="h-5 w-24 rounded bg-[var(--bg-subtle)]" />
            </div>
          ) : (
            <>
              <p className="text-xs text-[var(--text-secondary)]">Valeur actuelle</p>
              {hidden ? (
                <p className="mt-0.5 text-lg font-bold text-[var(--text-primary)]">{MASK}</p>
              ) : (
                <CollectionValue
                  value={stats.totalValue}
                  className="mt-0.5 text-lg font-bold text-[var(--text-primary)]"
                />
              )}
            </>
          )}
        </div>

        {/* Investi total */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3">
          {loading || !stats ? (
            <div className="animate-pulse space-y-2">
              <div className="h-3 w-20 rounded bg-[var(--bg-subtle)]" />
              <div className="h-5 w-24 rounded bg-[var(--bg-subtle)]" />
            </div>
          ) : (
            <>
              <p className="text-xs text-[var(--text-secondary)]">Investi total</p>
              <p className="mt-0.5 text-lg font-bold text-[var(--text-primary)]">
                {hidden ? MASK : fmt(stats.totalInvested)}
              </p>
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
                  {hidden ? MASK : <>{isPositive ? "+" : ""}{fmt(stats.profitLoss)}</>}
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
                  {hidden ? MASK : <>{isPositive ? "+" : ""}{stats.profitLossPercent.toFixed(1)} %</>}
                </p>
              ) : (
                <div className="mt-1"><ProButton size="sm" /></div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
