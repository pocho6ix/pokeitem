"use client";
import { Search, List, Grid3X3 } from "lucide-react";
import { ITEM_TYPE_LABELS } from "@/lib/constants";

interface ItemsToolbarProps {
  query: string;
  onQueryChange: (v: string) => void;
  typeFilter: string;
  onTypeFilterChange: (v: string) => void;
  availableTypes: string[];
  sort: string;
  onSortChange: (v: string) => void;
  view: "list" | "grid";
  onViewChange: (v: "list" | "grid") => void;
}

export function ItemsToolbar({
  query,
  onQueryChange,
  typeFilter,
  onTypeFilterChange,
  availableTypes,
  sort,
  onSortChange,
  view,
  onViewChange,
}: ItemsToolbarProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {/* Search input */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] pointer-events-none" />
        <input
          type="search"
          placeholder="Rechercher un item…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="h-9 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] pl-9 pr-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[#E7BA76] focus:ring-2 focus:ring-[#E7BA76]/20 transition-colors"
        />
      </div>

      {/* Type filter */}
      <select
        value={typeFilter}
        onChange={(e) => onTypeFilterChange(e.target.value)}
        className="h-9 shrink-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-2 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[#E7BA76] appearance-none cursor-pointer"
      >
        <option value="ALL">Tous</option>
        {availableTypes.map((t) => (
          <option key={t} value={t}>
            {ITEM_TYPE_LABELS[t] ?? t}
          </option>
        ))}
      </select>

      {/* Sort */}
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        className="h-9 shrink-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-2 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[#E7BA76] appearance-none cursor-pointer"
      >
        <option value="recent">Récent</option>
        <option value="price-desc">Prix ↓</option>
        <option value="price-asc">Prix ↑</option>
        <option value="perf-desc">Perf ↓</option>
        <option value="perf-asc">Perf ↑</option>
        <option value="name-asc">Nom A→Z</option>
      </select>

      {/* View toggle */}
      <div className="flex shrink-0 rounded-xl border border-[var(--border-default)] overflow-hidden">
        <button
          type="button"
          onClick={() => onViewChange("list")}
          className={`flex items-center justify-center h-9 w-9 transition-colors ${
            view === "list"
              ? "bg-[#E7BA76]/20 text-[#E7BA76]"
              : "bg-[var(--bg-card)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          }`}
          aria-label="Vue liste"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onViewChange("grid")}
          className={`flex items-center justify-center h-9 w-9 transition-colors ${
            view === "grid"
              ? "bg-[#E7BA76]/20 text-[#E7BA76]"
              : "bg-[var(--bg-card)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          }`}
          aria-label="Vue grille"
        >
          <Grid3X3 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
