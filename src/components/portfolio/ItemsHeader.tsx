import Link from "next/link";
import { Plus } from "lucide-react";
import { CollectionValue } from "@/components/collection/CollectionValue";
import { PerfBadge } from "./PerfBadge";

interface ItemsHeaderProps {
  count: number;
  totalInvested: number;
  totalValue: number;
  perfPct: number;
}

export function ItemsHeader({ count, totalInvested, perfPct }: ItemsHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Mes Items</h2>
        {count > 0 && (
          <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[13px] text-[var(--text-secondary)]">
            <span>
              {count} produit{count > 1 ? "s" : ""}
            </span>
            <span className="text-[var(--text-tertiary)]">·</span>
            <CollectionValue value={totalInvested} className="inline" /> investis
            <span className="text-[var(--text-tertiary)]">·</span>
            <PerfBadge value={perfPct} />
          </p>
        )}
      </div>
      <Link
        href="/portfolio/ajouter"
        className="btn-gold shrink-0 rounded-xl px-3 py-1.5 text-[13px] font-semibold text-black flex items-center gap-1.5"
      >
        <Plus className="h-4 w-4" />
        Ajouter
      </Link>
    </div>
  );
}
