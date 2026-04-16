"use client";
import { useRef, useState, useEffect } from "react";
import { MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { ItemImage } from "@/components/shared/ItemImage";
import { CollectionValue } from "@/components/collection/CollectionValue";
import { ItemBadge } from "./ItemBadge";
import { PerfBadge } from "./PerfBadge";
import type { PortfolioItemData } from "@/types/portfolio";

interface ItemCardProps {
  row: PortfolioItemData;
  onDelete: (id: string) => void;
  onRefresh: (item: PortfolioItemData["item"]) => void;
  isDeleting?: boolean;
}

export function ItemCard({ row, onDelete, onRefresh, isDeleting }: ItemCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`rounded-2xl bg-[var(--bg-card)] p-3 flex items-center gap-3 shadow-[var(--shadow-card)] transition-all duration-[120ms] hover:bg-[var(--bg-card-hover)] hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7BA76] focus-visible:ring-offset-2 cursor-pointer ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* Image */}
      <ItemImage
        src={row.item.imageUrl}
        slug={row.item.slug}
        alt={row.item.name}
        size="sm"
        className="w-16 h-16 rounded-xl shrink-0"
      />

      {/* Main content */}
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
        </div>
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        {/* Kebab menu */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="flex items-center justify-center h-7 w-7 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            aria-label="Options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-lg overflow-hidden">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh(row.item);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                Rafraîchir le prix
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Supprimer cet item ?")) {
                    onDelete(row.id);
                  }
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] text-[var(--color-error)] hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                Supprimer
              </button>
            </div>
          )}
        </div>

        {/* Current value */}
        <CollectionValue
          value={row.currentValue}
          className="font-data font-semibold text-[17px] text-[var(--text-primary)]"
        />

        {/* P&L % */}
        <PerfBadge value={row.pnlPercent} />

        {/* P&L absolute */}
        <span
          className={`font-data text-[11px] opacity-70 whitespace-nowrap ${row.pnl >= 0 ? "trend-up" : "trend-down"}`}
        >
          {row.pnl >= 0 ? "+" : "−"}
          <CollectionValue value={Math.abs(row.pnl)} className="inline" />
        </span>
      </div>
    </div>
  );
}
