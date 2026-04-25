"use client";
import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { ItemImage } from "@/components/shared/ItemImage";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CollectionValue } from "@/components/collection/CollectionValue";
import { ItemBadge } from "./ItemBadge";
import { PerfBadge } from "./PerfBadge";
import { formatPrice } from "@/lib/utils";
import type { PortfolioItemData } from "@/types/portfolio";

interface ItemCardProps {
  row:        PortfolioItemData;
  onDelete:   (id: string) => void;
  isDeleting?: boolean;
}

/**
 * List-view row for a sealed item. The whole card is a tappable link to the
 * detail route. A ⋯ button opens a mobile-friendly action sheet with quick
 * actions (Modifier / Retirer / Annuler). We never mutate price in-place from
 * here — all editing is done on the detail page for a calmer UX.
 */
export function ItemCard({ row, onDelete, isDeleting }: ItemCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const detailHref = `/portfolio/items/${row.id}`;

  const onMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(true);
  };

  const onEdit = () => {
    setMenuOpen(false);
    // Use an <a> click via location to navigate — we're in an event handler
    // outside Link's capture. Use Next's client router via window.location is
    // noisy; simpler: just trigger a navigation through an invisible link.
    window.location.href = detailHref;
  };

  const onAskDelete = () => {
    setMenuOpen(false);
    setConfirmOpen(true);
  };

  const onConfirmDelete = () => {
    onDelete(row.id);
    setConfirmOpen(false);
  };

  return (
    <>
      <Link
        href={detailHref}
        className={`rounded-2xl bg-[var(--bg-card)] p-3 flex items-center gap-3 shadow-[var(--shadow-card)] transition-all duration-[120ms] hover:bg-[var(--bg-card-hover)] hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7BA76] focus-visible:ring-offset-2 ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}
      >
        <ItemImage
          src={row.item.imageUrl}
          slug={row.item.slug}
          alt={row.item.name}
          size="sm"
          className="w-16 h-16 rounded-xl shrink-0"
        />

        <div className="flex-1 min-w-0">
          <p className="line-clamp-2 font-semibold text-[15px] text-[var(--text-primary)]">
            {row.item.name}
          </p>
          <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
            <ItemBadge type={row.item.type} />
            <span className="text-[var(--text-tertiary)] text-xs">·</span>
            <span className="text-xs text-[var(--text-secondary)]">Qté {row.quantity}</span>
            <span className="text-[var(--text-tertiary)] text-xs">·</span>
            <span className="text-xs text-[var(--text-secondary)]">
              Acheté{" "}
              <CollectionValue
                value={row.purchasePricePerUnit}
                className="inline font-medium text-[var(--text-primary)]"
              />
            </span>
            {row.item.priceFrom != null && (
              <>
                <span className="text-[var(--text-tertiary)] text-xs">·</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  <span aria-hidden>🇫🇷</span>{" "}
                  <span className="font-medium text-[var(--text-primary)]">
                    {formatPrice(row.item.priceFrom)}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="flex items-center justify-center h-7 w-7 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            aria-label="Options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          <CollectionValue
            value={row.currentValue}
            className="font-data font-semibold text-[17px] text-[var(--text-primary)]"
          />
          <PerfBadge value={row.pnlPercent} />
          <span
            className={`font-data text-[11px] opacity-70 whitespace-nowrap ${row.pnl >= 0 ? "trend-up" : "trend-down"}`}
          >
            {row.pnl >= 0 ? "+" : "−"}
            <CollectionValue value={Math.abs(row.pnl)} className="inline" />
          </span>
        </div>
      </Link>

      {/* ⋯ action sheet */}
      <BottomSheet
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={row.item.name}
      >
        <div className="flex flex-col gap-1 p-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-12 items-center gap-3 rounded-lg px-3 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
          >
            <Pencil className="h-5 w-5 text-[var(--text-secondary)]" />
            Modifier
          </button>
          <button
            type="button"
            onClick={onAskDelete}
            className="flex h-12 items-center gap-3 rounded-lg px-3 text-left text-sm text-red-500 transition-colors hover:bg-red-500/10"
          >
            <Trash2 className="h-5 w-5" />
            Retirer de ma collection
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="mt-1 flex h-12 items-center justify-center rounded-lg border border-[var(--border-default)] text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
          >
            Annuler
          </button>
        </div>
      </BottomSheet>

      {/* Confirm-delete sheet */}
      <BottomSheet
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmer la suppression"
      >
        <div className="px-3 py-2">
          <p className="text-sm text-[var(--text-primary)]">
            Supprimer <span className="font-semibold">{row.item.name}</span> de votre collection&nbsp;?
          </p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            Cette action est irréversible.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={onConfirmDelete}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-500 px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Suppression…" : "Supprimer"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--border-default)] px-6 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
            >
              Annuler
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
