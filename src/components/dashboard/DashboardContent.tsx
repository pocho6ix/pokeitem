"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Package,
  BarChart3,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Trash2,
  Search,
  RefreshCw,
} from "lucide-react";
import { UpdatePriceModal } from "@/components/portfolio/UpdatePriceModal";
import { ItemImage } from "@/components/shared/ItemImage";
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
// Types
// ---------------------------------------------------------------------------

interface PortfolioItemData {
  id: string;
  item: {
    id: string;
    name: string;
    slug: string;
    type: string;
    imageUrl: string | null;
    currentPrice: number | null;
    priceTrend: number | null;
    priceFrom: number | null;
    priceUpdatedAt: string | null;
    lastScrapedAt: string | null;
    cardmarketUrl: string | null;
    retailPrice: number | null;
    serie?: { name: string; bloc?: { name: string } };
  };
  quantity: number;
  purchasePrice: number;
  purchasePricePerUnit: number;
  purchaseDate: string | null;
  currentValue: number;
  currentValuePerUnit: number;
  pnl: number;
  pnlPercent: number;
  notes: string | null;
  createdAt: string;
}

interface PortfolioSummary {
  totalInvested: number;
  totalCurrentValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  itemCount: number;
  uniqueItemCount: number;
}

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

interface TopPerformerEntry {
  name: string;
  purchasePrice: number;
  currentPrice: number;
  pl: number;
}

const PERIODS = ["7J", "1M", "3M", "6M", "1A", "MAX"] as const;

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

function EmptyPortfolio() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 rounded-full bg-blue-100 p-6 dark:bg-blue-900/30">
        <Package className="h-12 w-12 text-blue-600 dark:text-blue-400" />
      </div>
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
        Votre portfolio est vide
      </h2>
      <p className="text-[var(--text-secondary)] max-w-sm mb-6">
        Ajoutez vos premiers items Pokémon TCG pour suivre la valeur de votre collection en temps réel.
      </p>
      <Link
        href="/collection"
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 transition-colors"
      >
        <Search className="h-4 w-4" />
        Explorer le catalogue
      </Link>
      <p className="mt-3 text-xs text-[var(--text-tertiary)]">
        Ou recherchez un item avec Ctrl+K
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export default function DashboardContent() {
  const { status } = useSession();
  const [items, setItems] = useState<PortfolioItemData[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [distributionByType, setDistributionByType] = useState<DistributionEntry[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformerEntry[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("1M");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pricingItem, setPricingItem] = useState<PortfolioItemData["item"] | null>(null);

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setSummary(data.summary);
        setDistributionByType(data.distributionByType);
        setTopPerformers(data.topPerformers);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChart = useCallback(async (p: string) => {
    try {
      const res = await fetch(`/api/portfolio/chart?period=${p}`);
      if (res.ok) {
        const data = await res.json();
        setChartData(data.data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchPortfolio();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, fetchPortfolio]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchChart(period);
    }
  }, [period, status, fetchChart]);

  async function handleDelete(portfolioItemId: string) {
    if (!confirm("Supprimer cet item du portfolio ?")) return;
    setDeleting(portfolioItemId);
    try {
      const res = await fetch(`/api/portfolio/${portfolioItemId}`, {
        method: "DELETE",
      });
      if (res.ok) await fetchPortfolio();
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-[var(--bg-tertiary)] rounded" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-[var(--bg-tertiary)] rounded-xl" />
            ))}
          </div>
          <div className="h-72 bg-[var(--bg-tertiary)] rounded-xl" />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Connectez-vous pour voir votre portfolio
          </h2>
          <Link
            href="/connexion?callbackUrl=/portfolio"
            className="mt-4 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  if (!summary || items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Mon Portfolio</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Vue d&apos;ensemble de votre portefeuille d&apos;investissement
          </p>
        </div>
        <EmptyPortfolio />
      </div>
    );
  }

  const isPositive = summary.totalPnl >= 0;
  const chartDataFormatted = chartData.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    }),
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Mon Portfolio</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {summary.itemCount} item{summary.itemCount > 1 ? "s" : ""} &middot;{" "}
          {summary.uniqueItemCount} produit{summary.uniqueItemCount > 1 ? "s" : ""} unique{summary.uniqueItemCount > 1 ? "s" : ""}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Valeur Actuelle"
          value={formatPrice(summary.totalCurrentValue)}
          icon={BarChart3}
        />
        <KpiCard
          label="Investi Total"
          value={formatPrice(summary.totalInvested)}
          icon={Wallet}
        />
        <KpiCard
          label="P&L"
          value={`${isPositive ? "+" : ""}${formatPrice(summary.totalPnl)}`}
          trend={summary.totalPnlPercent}
          icon={TrendingUp}
        />
        <KpiCard
          label="P&L %"
          value={formatPriceChange(summary.totalPnlPercent)}
          trend={summary.totalPnlPercent}
          icon={Percent}
        />
      </div>

      {/* Portfolio evolution chart */}
      {chartDataFormatted.length > 1 && (
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
                <AreaChart data={chartDataFormatted} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
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
      )}

      {/* Distribution + Top Performers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Distribution donut */}
        {distributionByType.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Répartition par type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distributionByType}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {distributionByType.map((entry, index) => (
                        <Cell key={entry.type} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: string) => (
                        <span className="text-xs text-[var(--text-secondary)]">
                          {ITEM_TYPE_LABELS[value] ?? value}
                        </span>
                      )}
                    />
                    <RechartsTooltip formatter={(value) => [`${value}%`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-[var(--border-default)]">
                {topPerformers.map((item, i) => (
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
        )}
      </div>

      {/* Update Price Modal */}
      {pricingItem && (
        <UpdatePriceModal
          item={pricingItem}
          isOpen={!!pricingItem}
          onClose={() => setPricingItem(null)}
          onSuccess={() => {
            setPricingItem(null);
            fetchPortfolio();
            fetchChart(period);
          }}
        />
      )}

      {/* Items table */}
      <Card>
        <CardHeader>
          <CardTitle>Mes Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-left text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                  <th className="pb-3 pr-2 w-14"></th>
                  <th className="pb-3 pr-4">Nom</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4 text-right">Qté</th>
                  <th className="pb-3 pr-4 text-right">Achat</th>
                  <th className="pb-3 pr-4 text-right">Actuel</th>
                  <th className="pb-3 pr-4 text-right">P&L</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {items.map((row) => {
                  const plPositive = row.pnl >= 0;
                  return (
                    <tr key={row.id} className="group hover:bg-[var(--bg-card-hover)]">
                      <td className="py-3 pr-2">
                        <ItemImage
                          src={row.item.imageUrl}
                          slug={row.item.slug}
                          alt={row.item.name}
                          size="sm"
                          className="w-12 h-12 rounded-lg"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-[var(--text-primary)]">
                          {row.item.name}
                        </p>
                        {row.item.serie && (
                          <p className="text-xs text-[var(--text-tertiary)]">
                            {row.item.serie.name}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge className={ITEM_TYPE_COLORS[row.item.type]}>
                          {ITEM_TYPE_LABELS[row.item.type]}
                        </Badge>
                      </td>
                      <td className="font-data py-3 pr-4 text-right text-[var(--text-primary)]">
                        {row.quantity}
                      </td>
                      <td className="font-data py-3 pr-4 text-right text-[var(--text-primary)]">
                        <div>{formatPrice(row.purchasePrice)}</div>
                        {row.quantity > 1 && (
                          <div className="text-xs text-[var(--text-tertiary)]">
                            {formatPrice(row.purchasePricePerUnit)}/u
                          </div>
                        )}
                      </td>
                      <td className="font-data py-3 pr-4 text-right text-[var(--text-primary)]">
                        <div>{formatPrice(row.currentValue)}</div>
                        {row.quantity > 1 && (
                          <div className="text-xs text-[var(--text-tertiary)]">
                            {formatPrice(row.currentValuePerUnit)}/u
                          </div>
                        )}
                        {row.item.priceUpdatedAt && (
                          <div className="text-[10px] text-[var(--text-tertiary)]">
                            {new Date(row.item.priceUpdatedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                          </div>
                        )}
                      </td>
                      <td className={`font-data py-3 pr-4 text-right font-medium ${plPositive ? "text-green-500" : "text-red-500"}`}>
                        <div>
                          {plPositive ? "+" : ""}
                          {formatPrice(row.pnl)}
                        </div>
                        <div className="text-xs">
                          {plPositive ? "+" : ""}
                          {row.pnlPercent.toFixed(1)}%
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPricingItem(row.item)}
                            className="rounded-lg p-1.5 text-[var(--text-tertiary)] hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-950/30 transition-colors"
                            title="Actualiser le prix"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(row.id)}
                            disabled={deleting === row.id}
                            className="rounded-lg p-1.5 text-[var(--text-tertiary)] hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
    </div>
  );
}
