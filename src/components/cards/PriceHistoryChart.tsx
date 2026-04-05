"use client";

import { useState, useMemo } from "react";
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
  price: number;
  priceFr?: number | null;
}

type Period = "1w" | "1m" | "3m" | "6m" | "1y" | "max";

interface Props {
  data: PricePoint[];
  currentPrice: number | null;
  currentPriceFr?: number | null;
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

function formatEur(value: number): string {
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
  period,
  onPeriodChange,
  loading,
}: Props) {
  const displayPrice = currentPriceFr ?? currentPrice;

  // Compute price change
  const priceChange = useMemo(() => {
    if (data.length < 2) return null;
    const first = data[0].priceFr ?? data[0].price;
    const last = data[data.length - 1].priceFr ?? data[data.length - 1].price;
    const diff = last - first;
    const pct = first !== 0 ? (diff / first) * 100 : 0;
    return { diff, pct, positive: diff >= 0 };
  }, [data]);

  // Use priceFr if available, otherwise price
  const chartData = useMemo(
    () => data.map((d) => ({ ...d, displayPrice: d.priceFr ?? d.price })),
    [data]
  );

  return (
    <div className="space-y-3">
      {/* Current price + change */}
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">
          {displayPrice != null ? formatEur(displayPrice) : "—"}
        </p>
        {currentPriceFr != null && (
          <span className="text-xs text-[var(--text-tertiary)]">Prix FR</span>
        )}
        {priceChange && (
          <p className={`text-sm font-medium ${priceChange.positive ? "text-[#10B981]" : "text-red-400"}`}>
            {priceChange.positive ? "+" : ""}
            {formatEur(priceChange.diff)} ({priceChange.positive ? "+" : ""}
            {priceChange.pct.toFixed(1)}%)
          </p>
        )}
      </div>

      {/* Chart */}
      <div className="h-[200px] sm:h-[280px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#10B981] border-t-transparent" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              Pas encore de données d'historique
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Les prix sont enregistrés quotidiennement
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
                ? "bg-[#10B981]/15 text-[#10B981]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
