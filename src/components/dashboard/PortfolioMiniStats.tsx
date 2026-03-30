"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

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
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    fetch("/api/portfolio/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setStats(d); })
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "unauthenticated" || (!loading && !stats)) return null;

  const isPositive = (stats?.profitLoss ?? 0) >= 0;

  const kpis = loading
    ? [null, null, null, null]
    : [
        { label: "Valeur actuelle",  value: fmt(stats!.totalValue),        color: "text-[var(--text-primary)]" },
        { label: "Investi total",    value: fmt(stats!.totalInvested),      color: "text-[var(--text-primary)]" },
        { label: "P&L",              value: `${isPositive ? "+" : ""}${fmt(stats!.profitLoss)}`, color: isPositive ? "text-green-600 dark:text-green-400" : "text-red-500" },
        { label: "P&L %",            value: `${isPositive ? "+" : ""}${stats!.profitLossPercent.toFixed(1)} %`, color: isPositive ? "text-green-600 dark:text-green-400" : "text-red-500" },
      ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {kpis.map((kpi, i) => (
        <div
          key={i}
          className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3"
        >
          {loading || !kpi ? (
            <div className="animate-pulse space-y-2">
              <div className="h-3 w-20 rounded bg-[var(--bg-subtle)]" />
              <div className="h-5 w-24 rounded bg-[var(--bg-subtle)]" />
            </div>
          ) : (
            <>
              <p className="text-xs text-[var(--text-secondary)]">{kpi.label}</p>
              <p className={`mt-0.5 text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
