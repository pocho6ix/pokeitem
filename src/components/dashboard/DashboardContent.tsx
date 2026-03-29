"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Package,
  BarChart3,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ExternalLink,
  Wallet,
} from "lucide-react";
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
import { Badge } from "@/components/ui/Badge";
import { formatPrice, formatPriceChange } from "@/lib/utils";
import { ITEM_TYPE_LABELS, ITEM_TYPE_COLORS, CHART_COLORS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Mock data — will be replaced with real API calls
// ---------------------------------------------------------------------------

const MOCK_KPI = {
  totalValue: 4_523.0,
  totalInvested: 3_700.0,
  plTotal: 823.0,
  plPercent: 22.24,
  variation24h: 45.0,
  variation24hPercent: 1.0,
  totalItems: 47,
};

// Chart data (mock portfolio evolution)
const CHART_DATA_1M = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  const base = 3700 + i * 28 + Math.random() * 80 - 40;
  return {
    date: date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    value: Math.round(base),
    invested: 3700,
  };
});

const PERIODS = ["7J", "1M", "3M", "6M", "1A", "MAX"] as const;

const MOCK_DISTRIBUTION = [
  { name: "Booster Box", value: 40, type: "BOOSTER_BOX" },
  { name: "ETB", value: 35, type: "ETB" },
  { name: "Tin", value: 15, type: "TIN" },
  { name: "UPC", value: 10, type: "UPC" },
];

const MOCK_TOP_PERFORMERS = [
  { name: "UPC Pokémon 151", purchasePrice: 130, currentPrice: 319, pl: 145.2 },
  { name: "Booster Box Évolutions Prismatiques", purchasePrice: 155, currentPrice: 293, pl: 89.0 },
  { name: "ETB Évolution Céleste", purchasePrice: 45, currentPrice: 75, pl: 67.3 },
  { name: "Booster Box Pokémon 151", purchasePrice: 165, currentPrice: 245, pl: 48.7 },
  { name: "Tin Pikachu EX", purchasePrice: 15, currentPrice: 21, pl: 40.0 },
];

interface CollectionRow {
  id: string;
  name: string;
  type: string;
  qty: number;
  purchasePrice: number;
  marketPrice: number;
}

const MOCK_COLLECTION: CollectionRow[] = [
  { id: "1", name: "Booster Box Pokémon 151", type: "BOOSTER_BOX", qty: 2, purchasePrice: 160, marketPrice: 228 },
  { id: "2", name: "ETB Évolutions à Paldea", type: "ETB", qty: 3, purchasePrice: 52, marketPrice: 68.5 },
  { id: "3", name: "UPC Dracaufeu", type: "UPC", qty: 1, purchasePrice: 135, marketPrice: 174 },
  { id: "4", name: "Booster Box Flammes Obsidiennes", type: "BOOSTER_BOX", qty: 1, purchasePrice: 160, marketPrice: 189 },
  { id: "5", name: "Tin Pikachu EX", type: "TIN", qty: 4, purchasePrice: 27, marketPrice: 25.8 },
];

const MOCK_ACTIVITY = [
  { text: "Ajouté 2x ETB Méga-Évolution", time: "il y a 3 heures" },
  { text: "Ajouté 1x Booster Box Évolutions Prismatiques", time: "hier" },
  { text: "Prix mis à jour : UPC 151 → 319€ (+5€)", time: "il y a 12h" },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  trend,
  icon: Icon,
  trendLabel,
}: {
  label: string;
  value: string;
  trend?: number;
  icon: React.ElementType;
  trendLabel?: string;
}) {
  const positive = (trend ?? 0) >= 0;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)]">{label}</span>
          <Icon className="h-4 w-4 text-[var(--text-tertiary)]" />
        </div>
        <p className="font-data mt-2 text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        {trend !== undefined && (
          <div className="mt-1 flex items-center gap-1">
            {positive ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
            )}
            <span className={`font-data text-xs font-medium ${positive ? "text-green-500" : "text-red-500"}`}>
              {formatPriceChange(trend)}
            </span>
            {trendLabel && (
              <span className="text-xs text-[var(--text-tertiary)]">{trendLabel}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopPerformerRow({
  name,
  purchasePrice,
  currentPrice,
  pl,
  rank,
}: {
  name: string;
  purchasePrice: number;
  currentPrice: number;
  pl: number;
  rank: number;
}) {
  const positive = pl >= 0;
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="text-sm font-bold text-[var(--text-tertiary)] w-5">{rank}.</span>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{name}</p>
        <p className="text-xs text-[var(--text-tertiary)]">
          Acheté: {formatPrice(purchasePrice)} &middot; Actuel: {formatPrice(currentPrice)}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {positive ? (
          <TrendingUp className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
        )}
        <span className={`font-data text-sm font-bold ${positive ? "text-green-500" : "text-red-500"}`}>
          {positive ? "+" : ""}{pl.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// Custom tooltip for the area chart
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
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

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export default function DashboardContent() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("1M");
  const isPositive = MOCK_KPI.plTotal >= 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Mon Portfolio</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Vue d&apos;ensemble de votre portefeuille d&apos;investissement
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Valeur Actuelle"
          value={formatPrice(MOCK_KPI.totalValue)}
          trend={MOCK_KPI.variation24hPercent}
          trendLabel="(24h)"
          icon={BarChart3}
        />
        <KpiCard
          label="Investi Total"
          value={formatPrice(MOCK_KPI.totalInvested)}
          icon={Wallet}
        />
        <KpiCard
          label="P&L"
          value={`${isPositive ? "+" : ""}${formatPrice(MOCK_KPI.plTotal)}`}
          trend={MOCK_KPI.plPercent}
          icon={TrendingUp}
        />
        <KpiCard
          label="P&L %"
          value={formatPriceChange(MOCK_KPI.plPercent)}
          trend={MOCK_KPI.plPercent}
          icon={Percent}
        />
      </div>

      {/* Portfolio evolution chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Évolution du Portfolio</CardTitle>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    period === p
                      ? "bg-[var(--color-primary)] text-white"
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
              <AreaChart data={CHART_DATA_1M} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradientValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
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
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
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
              <span className={`h-0.5 w-4 rounded ${isPositive ? "bg-green-500" : "bg-red-500"}`} />
              Valeur marché
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded border-t border-dashed border-[var(--text-tertiary)]" />
              Prix d&apos;achat cumulé
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Distribution + Top Performers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Distribution donut */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={MOCK_DISTRIBUTION}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {MOCK_DISTRIBUTION.map((entry, index) => (
                      <Cell key={entry.type} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span className="text-xs text-[var(--text-secondary)]">{value}</span>
                    )}
                  />
                  <RechartsTooltip
                    formatter={(value) => [`${value}%`]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-[var(--border-default)]">
              {MOCK_TOP_PERFORMERS.map((item, i) => (
                <TopPerformerRow
                  key={item.name}
                  rank={i + 1}
                  name={item.name}
                  purchasePrice={item.purchasePrice}
                  currentPrice={item.currentPrice}
                  pl={item.pl}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collection table */}
      <Card>
        <CardHeader>
          <CardTitle>Mes Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-left text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                  <th className="pb-3 pr-4">Image</th>
                  <th className="pb-3 pr-4">Nom</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4 text-right">Qté</th>
                  <th className="pb-3 pr-4 text-right">Achat</th>
                  <th className="pb-3 pr-4 text-right">Actuel</th>
                  <th className="pb-3 text-right">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {MOCK_COLLECTION.map((row) => {
                  const pl = (row.marketPrice - row.purchasePrice) * row.qty;
                  const plPercent = row.purchasePrice > 0
                    ? ((row.marketPrice - row.purchasePrice) / row.purchasePrice) * 100
                    : 0;
                  const plPositive = pl >= 0;
                  return (
                    <tr key={row.id} className="group cursor-pointer hover:bg-[var(--bg-hover)]">
                      <td className="py-3 pr-4">
                        <div className="h-10 w-10 rounded-md bg-[var(--bg-subtle)]" />
                      </td>
                      <td className="py-3 pr-4 font-medium text-[var(--text-primary)]">
                        {row.name}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge className={ITEM_TYPE_COLORS[row.type]}>
                          {ITEM_TYPE_LABELS[row.type]}
                        </Badge>
                      </td>
                      <td className="font-data py-3 pr-4 text-right text-[var(--text-primary)]">
                        {row.qty}
                      </td>
                      <td className="font-data py-3 pr-4 text-right text-[var(--text-primary)]">
                        <div>{formatPrice(row.purchasePrice * row.qty)}</div>
                        <div className="text-xs text-[var(--text-tertiary)]">{formatPrice(row.purchasePrice)}/u</div>
                      </td>
                      <td className="font-data py-3 pr-4 text-right text-[var(--text-primary)]">
                        <div>{formatPrice(row.marketPrice * row.qty)}</div>
                        <div className="text-xs text-[var(--text-tertiary)]">{formatPrice(row.marketPrice)}/u</div>
                      </td>
                      <td className={`font-data py-3 text-right font-medium ${plPositive ? "text-green-500" : "text-red-500"}`}>
                        <div>{plPositive ? "+" : ""}{formatPrice(pl)}</div>
                        <div className="text-xs">
                          {plPositive ? "+" : ""}{plPercent.toFixed(1)}%
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Activité Récente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {MOCK_ACTIVITY.map((entry, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-blue-100 p-1.5 dark:bg-blue-900/30">
                  <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-primary)]">{entry.text}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{entry.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
