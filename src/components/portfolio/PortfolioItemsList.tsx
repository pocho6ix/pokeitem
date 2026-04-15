// ---------------------------------------------------------------------------
// Row-based list for the user's sealed items, styled after BlocSerieDoublesList
// so "mes items" feels consistent with "mes doubles".
// ---------------------------------------------------------------------------
"use client";

import { RefreshCw, Trash2, Package } from "lucide-react";
import { ItemImage } from "@/components/shared/ItemImage";
import { Badge } from "@/components/ui/Badge";
import { CollectionValue } from "@/components/collection/CollectionValue";
import { ITEM_TYPE_LABELS, ITEM_TYPE_COLORS } from "@/lib/constants";

export interface PortfolioItemRow {
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
  currentValue: number;
  currentValuePerUnit: number;
  pnl: number;
  pnlPercent: number;
}

interface PortfolioItemsListProps {
  items: PortfolioItemRow[];
  onUpdatePrice: (item: PortfolioItemRow["item"]) => void;
  onDelete: (portfolioItemId: string) => void;
  deletingId: string | null;
}

function formatUpdatedDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function PortfolioItemsList({
  items,
  onUpdatePrice,
  onDelete,
  deletingId,
}: PortfolioItemsListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-secondary)]">
          <Package className="h-8 w-8 text-[var(--text-secondary)]" />
        </div>
        <p className="text-lg font-semibold text-[var(--text-primary)]">Aucun item</p>
        <p className="mt-1 max-w-xs text-sm text-[var(--text-secondary)]">
          Vos produits scellés apparaîtront ici une fois ajoutés au classeur.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--border-default)] rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
      {items.map((row) => {
        const plPositive = row.pnl >= 0;
        const updated = formatUpdatedDate(row.item.priceUpdatedAt);

        return (
          <div
            key={row.id}
            className="group relative flex items-center gap-4 px-4 py-3 transition-colors hover:bg-[var(--bg-hover)]"
          >
            {/* Product image */}
            <ItemImage
              src={row.item.imageUrl}
              slug={row.item.slug}
              alt={row.item.name}
              size="sm"
              className="h-14 w-14 shrink-0 rounded-lg border border-[var(--border-default)]"
            />

            {/* Name + meta */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {row.item.name}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--text-secondary)]">
                <Badge className={`${ITEM_TYPE_COLORS[row.item.type]} px-1.5 py-0 text-[10px]`}>
                  {ITEM_TYPE_LABELS[row.item.type]}
                </Badge>
                {row.item.serie?.name && <span className="truncate">{row.item.serie.name}</span>}
                <span>·</span>
                <span>
                  Qté&nbsp;<span className="font-data font-medium text-[var(--text-primary)]">{row.quantity}</span>
                </span>
                {updated && (
                  <>
                    <span>·</span>
                    <span className="text-[var(--text-tertiary)]">Màj {updated}</span>
                  </>
                )}
              </div>
            </div>

            {/* Value + P&L */}
            <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
              <CollectionValue
                value={row.currentValue}
                className="font-data text-sm font-semibold text-[var(--text-primary)]"
              />
              <div
                className={`inline-flex items-center gap-1 font-data text-[11px] font-medium ${
                  plPositive ? "text-emerald-500 dark:text-emerald-400" : "text-red-500"
                }`}
              >
                <span>
                  {plPositive ? "+" : ""}
                  <CollectionValue value={row.pnl} className="inline" />
                </span>
                <span className="opacity-70">
                  ({plPositive ? "+" : ""}
                  {row.pnlPercent.toFixed(1)}%)
                </span>
              </div>
              {row.quantity > 1 && (
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  <CollectionValue value={row.currentValuePerUnit} className="inline" />/u
                </p>
              )}
            </div>

            {/* Actions — revealed on hover on desktop, always visible on mobile */}
            <div className="flex shrink-0 items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100 sm:opacity-0">
              <button
                type="button"
                onClick={() => onUpdatePrice(row.item)}
                className="rounded-lg p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[#E7BA76]/10 hover:text-[#E7BA76]"
                title="Actualiser le prix"
                aria-label="Actualiser le prix"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(row.id)}
                disabled={deletingId === row.id}
                className="rounded-lg p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-red-100 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30"
                title="Supprimer"
                aria-label="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
