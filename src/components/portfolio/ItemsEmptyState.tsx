import Link from "next/link";
import { Package, Search } from "lucide-react";

interface ItemsEmptyStateProps {
  variant: "empty" | "no-results";
  query?: string;
  onClear?: () => void;
}

export function ItemsEmptyState({ variant, query, onClear }: ItemsEmptyStateProps) {
  if (variant === "empty") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-[var(--bg-secondary)] p-5">
          <Package className="h-12 w-12 text-[var(--text-tertiary)]" />
        </div>
        <p className="font-semibold text-[var(--text-primary)] text-[15px]">
          Aucun item pour l&apos;instant
        </p>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
          Scanne ou ajoute ton premier produit
        </p>
        <Link
          href="/portfolio/ajouter"
          className="btn-gold mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-[#1a0e00]"
        >
          + Ajouter un item
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-[var(--bg-secondary)] p-5">
        <Search className="h-10 w-10 text-[var(--text-tertiary)]" />
      </div>
      <p className="font-semibold text-[var(--text-primary)] text-[15px]">
        Aucun résultat{query ? ` pour « ${query} »` : ""}
      </p>
      <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
        Essaie un autre terme ou efface les filtres
      </p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
        >
          Effacer les filtres
        </button>
      )}
    </div>
  );
}
