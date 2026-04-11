"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PricePoint {
  date: string;
  price: number | null;
  priceFr?: number | null;
  priceReverse?: number | null;
}

type Period = "1w" | "1m" | "3m" | "6m" | "1y" | "max";
type ChartMode = "normal" | "reverse";

interface Props {
  data: PricePoint[];
  currentPrice: number | null;
  currentPriceFr?: number | null;
  currentPriceReverse?: number | null;
  mode?: ChartMode;
  period: Period;
  onPeriodChange: (p: Period) => void;
  loading?: boolean;
}

// ─── Period buttons ──────────────────────────────────────────────────────────

const PERIODS: { value: Period; label: string }[] = [
  { value: "1w", label: "1S" },
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1A" },
  { value: "max", label: "MAX" },
];

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatEur(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Custom tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;
  const price = payload[0]?.value;
  return (
    <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] px-3 py-2 shadow-lg">
      <p className="text-xs text-[var(--text-secondary)]">{formatDateFull(label)}</p>
      <p className="text-sm font-bold text-[#10B981]">{formatEur(price)}</p>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PriceHistoryChart({
  data,
  currentPrice,
  currentPriceFr,
  currentPriceReverse,
  mode = "normal",
  period,
  onPeriodChange,
  loading,
}: Props) {
  const isReverse = mode === "reverse";
  const displayPrice = isReverse
    ? currentPriceReverse
    : (currentPriceFr ?? currentPrice);

  // Normal mode: priceFr > price ; Reverse mode: priceReverse only
  const chartData = useMemo(
    () =>
      data
        .map((d) => ({
          ...d,
          displayPrice: isReverse ? d.priceReverse ?? null : d.priceFr ?? d.price,
        }))
        .filter((d) => d.displayPrice != null),
    [data, isReverse]
  );

  // Compute price change and stats
  const stats = useMemo(() => {
    const prices = chartData.map((d) => d.displayPrice as number);
    if (prices.length === 0) return null;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

    const first = prices[0];
    const last = prices[prices.length - 1];
    const diff = last - first;
    const pct = first !== 0 ? (diff / first) * 100 : 0;

    return { min, max, avg, diff, pct, positive: diff >= 0 };
  }, [chartData]);

  return (
    <div className="space-y-3">
      {/* Current price + change */}
      <div className="flex items-end gap-3">
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {displayPrice != null ? formatEur(displayPrice) : "—"}
          </p>
          {isReverse ? (
            <span className="text-xs text-[var(--text-tertiary)]">🌍 Reverse · marché global</span>
          ) : currentPriceFr != null ? (
            <span className="text-xs text-[var(--text-tertiary)]">🇫🇷 Prix FR</span>
          ) : null}
        </div>
        {stats && (
          <p
            className={`mb-0.5 text-sm font-medium ${
              stats.positive ? "text-[#10B981]" : "text-red-400"
            }`}
          >
            {stats.positive ? "+" : ""}
            {formatEur(stats.diff)} ({stats.positive ? "+" : ""}
            {stats.pct.toFixed(1)}%)
          </p>
        )}
      </div>

      {/* Chart */}
      <div className="h-[180px] sm:h-[240px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#10B981] border-t-transparent" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              Pas encore de données d&apos;historique
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Les prix sont enregistrés quotidiennement
            </p>
          </div>
        ) : chartData.length < 2 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <div className="rounded-xl bg-[var(--bg-secondary)] px-5 py-3">
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {formatEur(chartData[0].displayPrice as number)}
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {formatDateFull(chartData[0].date)}
              </p>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Extension récente — l&apos;historique s&apos;enrichit chaque jour
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={formatDateShort}
                tick={{ fill: "#9CA3AF", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={(v) => `${v}€`}
                tick={{ fill: "#9CA3AF", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={55}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="displayPrice"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#priceGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#10B981", stroke: "#0D9668", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Period selector */}
      <div className="flex gap-1.5">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPeriodChange(p.value)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
              period === p.value
                ? "bg-[#E7BA76]/15 text-[#E7BA76]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Min / Moy / Max stats */}
      {stats && chartData.length > 1 && (
        <div className="grid grid-cols-3 gap-2 pt-1">
          <StatPill label="Min" value={stats.min} color="text-[#10B981]" />
          <StatPill label="Moy" value={stats.avg} color="text-[var(--text-primary)]" />
          <StatPill label="Max" value={stats.max} color="text-red-400" />
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-[var(--bg-secondary)] py-2">
      <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{formatEur(value)}</span>
    </div>
  );
}
