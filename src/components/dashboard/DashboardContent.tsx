"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  TrendingUp,
  TrendingDown,
  Package,
  BarChart3,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Search,
} from "lucide-react";
import { UpdatePriceModal } from "@/components/portfolio/UpdatePriceModal";
import { PortfolioItemsList } from "@/components/portfolio/PortfolioItemsList";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { CollectionValue } from "@/components/collection/CollectionValue";
import { formatPriceChange } from "@/lib/utils";

// Recharts (~150 KB gzipped) — lazy-loaded so it never enters the initial bundle
const DashboardChartsSection = dynamic(
  () => import("@/components/dashboard/DashboardChartsSection").then((m) => m.DashboardChartsSection),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="h-72 animate-pulse rounded-xl bg-[var(--bg-secondary)]" />
        <div className="h-64 animate-pulse rounded-xl bg-[var(--bg-secondary)]" />
      </div>
    ),
    ssr: false,
  }
);

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
  value: React.ReactNode;
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
        <div className="font-data mt-2 text-2xl font-bold text-[var(--text-primary)]">{value}</div>
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
        <p className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
          <span>Acheté:</span>
          <CollectionValue value={purchasePrice} />
          <span>·</span>
          <span>Actuel:</span>
          <CollectionValue value={currentPrice} />
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

function EmptyPortfolio() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 rounded-full bg-[#E7BA76]/20 p-6 dark:bg-[#E7BA76]/10">
        <Package className="h-12 w-12 text-[#E7BA76]" />
      </div>
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
        Votre portfolio est vide
      </h2>
      <p className="text-[var(--text-secondary)] max-w-sm mb-6">
        Ajoutez vos premiers items Pokémon TCG pour suivre la valeur de votre collection en temps réel.
      </p>
      <Link
        href="/collection"
        className="btn-gold inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-black"
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

export default function DashboardContent({ compact = false }: { compact?: boolean }) {
  const { status } = useSession();
  const [items, setItems] = useState<PortfolioItemData[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [distributionByType, setDistributionByType] = useState<DistributionEntry[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformerEntry[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("7J");
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
      <div className={compact ? "space-y-6" : "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"}>
        <div className="animate-pulse space-y-6">
          {!compact && <div className="h-8 w-48 bg-[var(--bg-tertiary)] rounded" />}
          {!compact && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-[var(--bg-tertiary)] rounded-xl" />
              ))}
            </div>
          )}
          <div className="h-72 bg-[var(--bg-tertiary)] rounded-xl" />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className={compact ? "" : "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Connectez-vous pour voir votre portfolio
          </h2>
          <Link
            href="/connexion?callbackUrl=/portfolio"
            className="btn-gold mt-4 rounded-xl px-6 py-3 font-medium text-black"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  if (!summary || items.length === 0) {
    return (
      <div className={compact ? "" : "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"}>
        {!compact && (
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Mon Classeur</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Vue d&apos;ensemble de votre portefeuille d&apos;investissement
            </p>
          </div>
        )}
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
    <div className={compact ? "space-y-8" : "mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8"}>
      {/* Page title — only in standalone mode */}
      {!compact && (
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Mon Classeur</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {summary.itemCount} item{summary.itemCount > 1 ? "s" : ""} &middot;{" "}
            {summary.uniqueItemCount} produit{summary.uniqueItemCount > 1 ? "s" : ""} unique{summary.uniqueItemCount > 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* KPI cards — only in standalone mode (layout handles them in compact) */}
      {!compact && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Valeur Actuelle"
            value={<CollectionValue value={summary.totalCurrentValue} />}
            icon={BarChart3}
          />
          <KpiCard
            label="Investi Total"
            value={<CollectionValue value={summary.totalInvested} />}
            icon={Wallet}
          />
          <KpiCard
            label="P&L"
            value={
              <>
                {isPositive ? "+" : ""}
                <CollectionValue value={summary.totalPnl} className="inline" />
              </>
            }
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
      )}

      {/* Charts — lazy-loaded (recharts excluded from initial bundle) */}
      <DashboardChartsSection
        chartData={chartDataFormatted}
        distributionByType={distributionByType}
        isPositive={isPositive}
        period={period}
        onPeriodChange={setPeriod}
        compact={compact}
      />

      {/* Distribution + Top Performers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                    key={i}
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

      {/* Items list — row-based, mirrors the "mes doubles" look */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Mes Items</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {summary.itemCount} item{summary.itemCount > 1 ? "s" : ""}
            {summary.uniqueItemCount !== summary.itemCount && (
              <>
                {" "}·{" "}
                <span className="text-[var(--text-tertiary)]">
                  {summary.uniqueItemCount} unique{summary.uniqueItemCount > 1 ? "s" : ""}
                </span>
              </>
            )}
          </p>
        </div>
        <PortfolioItemsList
          items={items}
          onUpdatePrice={(item) => setPricingItem(item)}
          onDelete={handleDelete}
          deletingId={deleting}
        />
      </section>
    </div>
  );
}
