"use client";
import Link from "next/link";
import { ItemImage } from "@/components/shared/ItemImage";
import { CollectionValue } from "@/components/collection/CollectionValue";
import { ItemBadge } from "./ItemBadge";
import { PerfBadge } from "./PerfBadge";
import type { PortfolioItemData } from "@/types/portfolio";

interface ItemCardGridProps {
  row: PortfolioItemData;
}

export function ItemCardGrid({ row }: ItemCardGridProps) {
  return (
    <Link
      href={`/portfolio/items/${row.id}`}
      className="rounded-2xl bg-[var(--bg-card)] overflow-hidden border border-[var(--border-default)] transition-all duration-[120ms] hover:bg-[var(--bg-card-hover)] hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7BA76] focus-visible:ring-offset-2"
    >
      {/* Image area — 4:3 ratio */}
      <div className="bg-white h-32 flex items-center justify-center p-2">
        <ItemImage
          src={row.item.imageUrl}
          slug={row.item.slug}
          alt={row.item.name}
          size="md"
          className="h-full w-full"
        />
      </div>

      {/* Content */}
      <div className="p-3 space-y-1.5">
        <p className="truncate font-semibold text-[13px] text-[var(--text-primary)]">
          {row.item.name}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <ItemBadge type={row.item.type} />
          <span className="text-xs text-[var(--text-tertiary)]">× {row.quantity}</span>
        </div>
        <div className="flex items-center justify-between gap-1 pt-0.5">
          <CollectionValue
            value={row.currentValue}
            className="font-data font-semibold text-[15px] text-[var(--text-primary)]"
          />
          <PerfBadge value={row.pnlPercent} />
        </div>
      </div>
    </Link>
  );
}
