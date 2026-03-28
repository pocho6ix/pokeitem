"use client";

import { TrendingUp, TrendingDown, Package, BarChart3, Percent, ArrowUpRight, ArrowDownRight, ExternalLink, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, formatPriceChange } from "@/lib/utils";
import { ITEM_TYPE_LABELS, ITEM_TYPE_COLORS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_KPI = {
  totalValue: 4_872.5,
  totalValueTrend: 5.2,
  totalItems: 47,
  plTotal: 623.4,
  plPercent: 14.7,
};

const MOCK_TOP_PERFORMERS = [
  { name: "Display Ecarlate et Violet 151", pl: 42.3 },
  { name: "ETB Evolutions a Paldea", pl: 31.8 },
  { name: "Coffret Ultra Premium Dracaufeu", pl: 28.5 },
  { name: "Display Flammes Obsidiennes", pl: 18.2 },
  { name: "Pokebox Pikachu EX", pl: -4.6 },
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
  { id: "1", name: "Display Ecarlate et Violet 151", type: "DISPLAY", qty: 2, purchasePrice: 160, marketPrice: 228 },
  { id: "2", name: "ETB Evolutions a Paldea", type: "ETB", qty: 3, purchasePrice: 52, marketPrice: 68.5 },
  { id: "3", name: "Coffret Ultra Premium Dracaufeu", type: "COFFRET_PREMIUM", qty: 1, purchasePrice: 135, marketPrice: 174 },
  { id: "4", name: "Display Flammes Obsidiennes", type: "DISPLAY", qty: 1, purchasePrice: 160, marketPrice: 189 },
  { id: "5", name: "Pokebox Pikachu EX", type: "POKEBOX", qty: 4, purchasePrice: 27, marketPrice: 25.8 },
];

const MOCK_ACTIVITY = [
  { text: "Ajoute 1x Display ME01", time: "il y a 2 heures" },
  { text: "Mis a jour le prix de ETB Evolutions", time: "il y a 5 heures" },
  { text: "Ajoute 3x Booster Flammes Obsidiennes", time: "il y a 1 jour" },
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

function TopPerformerRow({ name, pl }: { name: string; pl: number }) {
  const positive = pl >= 0;
  return (
    <div className="flex items-center justify-between py-2">
      <span className="truncate pr-4 text-sm text-[var(--text-primary)]">{name}</span>
      <div className="flex shrink-0 items-center gap-1">
        {positive ? (
          <TrendingUp className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
        )}
        <span className={`font-data text-sm font-medium ${positive ? "text-green-500" : "text-red-500"}`}>
          {formatPriceChange(pl)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export default function DashboardContent() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Ma Collection</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Vue d&apos;ensemble de votre portefeuille
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Valeur Totale"
          value={formatPrice(MOCK_KPI.totalValue)}
          trend={MOCK_KPI.totalValueTrend}
          trendLabel="vs. mois dernier"
          icon={BarChart3}
        />
        <KpiCard label="Items Totaux" value={String(MOCK_KPI.totalItems)} icon={Package} />
        <KpiCard
          label="P&L Total"
          value={formatPrice(MOCK_KPI.plTotal)}
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

      {/* Chart placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Evolution de la valeur</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-subtle)]">
            <span className="text-sm text-[var(--text-tertiary)]">Graphique valeur</span>
          </div>
        </CardContent>
      </Card>

      {/* Distribution + Top Performers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribution par type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-subtle)]">
              <span className="text-sm text-[var(--text-tertiary)]">Donut chart placeholder</span>
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
              {MOCK_TOP_PERFORMERS.map((item) => (
                <TopPerformerRow key={item.name} name={item.name} pl={item.pl} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collection table */}
      <Card>
        <CardHeader>
          <CardTitle>Collection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-left text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                  <th className="pb-3 pr-4">Image</th>
                  <th className="pb-3 pr-4">Nom</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4 text-right">Qte</th>
                  <th className="pb-3 pr-4 text-right">Achat</th>
                  <th className="pb-3 pr-4 text-right">Marche</th>
                  <th className="pb-3 text-right">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {MOCK_COLLECTION.map((row) => {
                  const pl = (row.marketPrice - row.purchasePrice) * row.qty;
                  const plPositive = pl >= 0;
                  return (
                    <tr key={row.id} className="group hover:bg-[var(--bg-hover)]">
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
                        {formatPrice(row.purchasePrice)}
                      </td>
                      <td className="font-data py-3 pr-4 text-right text-[var(--text-primary)]">
                        {formatPrice(row.marketPrice)}
                      </td>
                      <td className={`font-data py-3 text-right font-medium ${plPositive ? "text-green-500" : "text-red-500"}`}>
                        {plPositive ? "+" : ""}
                        {formatPrice(pl)}
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
          <CardTitle>Activite recente</CardTitle>
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
