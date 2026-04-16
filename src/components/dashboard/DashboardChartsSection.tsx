"use client";

/**
 * Recharts-heavy chart sections for DashboardContent.
 * Kept in a separate module so it can be lazy-loaded with next/dynamic,
 * preventing recharts from entering the initial JS bundle.
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { formatPrice } from "@/lib/utils";
import { ITEM_TYPE_LABELS, CHART_COLORS } from "@/lib/constants";

// ─── Types (mirrored from DashboardContent to avoid coupling) ─────────────────

interface ChartDataPoint {
  date: string;
  value: number;
  invested: number;
}

interface DistributionEntry {
  name: string;
  value: number;
  type: string;
}

const PERIODS = ["7J", "1M", "3M", "6M", "1A", "MAX"] as const;
type Period = (typeof PERIODS)[number];

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 shadow-lg">
      <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
      <p className="font-data text-sm font-bold text-[var(--text-primary)]">
        {formatPrice(payload[0].value)}
      </p>
      {payload[1] && (
        <p className="font-data text-xs text-[var(--text-tertiary)]">
          Investi: {formatPrice(payload[1].value)}
        </p>
      )}
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface DashboardChartsSectionProps {
  chartData: ChartDataPoint[];
  distributionByType: DistributionEntry[];
  isPositive: boolean;
  period: Period;
  onPeriodChange: (p: Period) => void;
  compact: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardChartsSection({
  chartData,
  distributionByType,
  isPositive,
  period,
  onPeriodChange,
  compact,
}: DashboardChartsSectionProps) {
  return (
    <>
      {/* Portfolio evolution chart — only in standalone mode */}
      {!compact && chartData.length > 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Évolution de mon classeur</CardTitle>
              <div className="flex gap-1">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    onClick={() => onPeriodChange(p)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      period === p
                        ? "bg-[var(--color-primary)] text-black"
                        : "text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradientValue" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={isPositive ? "#22c55e" : "#ef4444"}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor={isPositive ? "#22c55e" : "#ef4444"}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-default)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`
                    }
                    width={45}
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
                    fill="url(#gradientValue)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
              <span className="flex items-center gap-1.5">
                <span
                  className={`h-0.5 w-4 rounded ${isPositive ? "bg-green-500" : "bg-red-500"}`}
                />
                Valeur marché
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded border-t border-dashed border-[var(--text-tertiary)]" />
                Prix d&apos;achat cumulé
              </span>
            </div>
          </CardContent>
        </Card>
      )}

    </>
  );
}
