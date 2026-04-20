"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "@/lib/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import { ProButton } from "@/components/subscription/ProButton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChartDataPoint {
  date: string;
  value: number;
  invested: number;
}

interface SerieMeta {
  slug: string;
  name: string;
  abbreviation: string | null;
}

const PERIODS = ["7J", "1M", "3M", "6M", "1A", "MAX"] as const;
type Period = (typeof PERIODS)[number];

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const valueEntry    = payload.find((p) => p.dataKey === "value");
  const investedEntry = payload.find((p) => p.dataKey === "invested");
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 shadow-lg">
      <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
      {valueEntry    && <p className="text-sm font-bold text-[var(--text-primary)]">{fmt(valueEntry.value)}</p>}
      {investedEntry && <p className="text-xs text-[var(--text-tertiary)]">Investi : {fmt(investedEntry.value)}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PortfolioEvolutionChart() {
  const { status } = useSession();
  const { isPro, isLoading: subLoading } = useSubscription();
  const [chartData,     setChartData]     = useState<ChartDataPoint[]>([]);
  const [series,        setSeries]        = useState<SerieMeta[]>([]);
  const [period,        setPeriod]        = useState<Period>("7J");
  const [selectedSerie, setSelectedSerie] = useState<string | null>(null);
  const [loading,       setLoading]       = useState(true);

  const fetchChart = useCallback(async (p: Period, serie: string | null) => {
    setLoading(true);
    try {
      const url = `/api/portfolio/chart?period=${p}${serie ? `&serie=${serie}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setChartData(data.data ?? []);
        // Only update series list on first fetch (no filter) to keep full list available
        if (!serie) setSeries(data.series ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && isPro) fetchChart(period, selectedSerie);
    else if (status !== "loading") setLoading(false);
  }, [period, selectedSerie, status, fetchChart, isPro]);

  // Don't render until we know auth status
  if (status !== "authenticated") return null;

  // Free user — show locked placeholder
  if (!subLoading && !isPro) {
    return (
      <div className="mb-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-5 py-4">
        <p className="mb-4 font-semibold text-[var(--text-primary)]">Évolution de mon classeur</p>
        <div className="flex h-36 flex-col items-center justify-center gap-3 rounded-xl bg-[var(--bg-subtle)]">
          <p className="text-sm text-[var(--text-secondary)]">Graphique réservé aux abonnés Pro</p>
          <ProButton size="md" />
        </div>
      </div>
    );
  }

  if (!loading && chartData.length < 2) return null;

  const formatted = chartData.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
  }));

  const lastValue    = chartData.at(-1)?.value    ?? 0;
  const firstValue   = chartData[0]?.value        ?? 0;
  const isPositive   = lastValue >= firstValue;

  return (
    <div className="mb-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-5 py-4">
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-[var(--text-primary)]">Évolution de mon classeur</p>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                period === p
                  ? "btn-gold text-black"
                  : "text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>


      {/* Chart */}
      {loading ? (
        <div className="h-52 animate-pulse rounded-xl bg-[var(--bg-secondary)]" />
      ) : (
        <>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formatted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradientClasseur" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`)}
                  width={42}
                />
                <RechartsTooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="invested"
                  stroke="var(--text-tertiary)"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  fill="none"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={isPositive ? "#22c55e" : "#ef4444"}
                  strokeWidth={2}
                  fill="url(#gradientClasseur)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
            <span className="flex items-center gap-1.5">
              <span className={`h-0.5 w-4 rounded ${isPositive ? "bg-green-500" : "bg-red-500"}`} />
              Valeur marché
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded border-t border-dashed border-[var(--text-tertiary)]" />
              Prix d&apos;achat cumulé
            </span>
          </div>
        </>
      )}
    </div>
  );
}
