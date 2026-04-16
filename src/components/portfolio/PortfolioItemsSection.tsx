"use client";
import { useState, useMemo, useEffect } from "react";
import type { PortfolioItemData, PortfolioSummary } from "@/types/portfolio";
import { ItemsHeader } from "./ItemsHeader";
import { ItemsToolbar } from "./ItemsToolbar";
import { ItemCard } from "./ItemCard";
import { ItemCardGrid } from "./ItemCardGrid";
import { ItemsEmptyState } from "./ItemsEmptyState";
import { ItemsLoadingState } from "./ItemsLoadingState";

type SortKey = "recent" | "price-desc" | "price-asc" | "perf-desc" | "perf-asc" | "name-asc";
type ViewMode = "list" | "grid";

interface PortfolioItemsSectionProps {
  items: PortfolioItemData[];
  summary: PortfolioSummary;
  loading?: boolean;
  onUpdatePrice: (item: PortfolioItemData["item"]) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}

export function PortfolioItemsSection({
  items,
  summary,
  loading,
  onUpdatePrice,
  onDelete,
  deletingId,
}: PortfolioItemsSectionProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useState<ViewMode>("grid");

  // Hydrate view from localStorage (client only)
  useEffect(() => {
    const stored = localStorage.getItem("pokeitem.items.view") as ViewMode | null;
    if (stored === "list" || stored === "grid") setView(stored);
  }, []);

  // Persist view preference
  useEffect(() => {
    localStorage.setItem("pokeitem.items.view", view);
  }, [view]);

  // Debounce query 200ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  // Compute available types from data
  const availableTypes = useMemo(
    () => Array.from(new Set(items.map((i) => i.item.type))).sort(),
    [items]
  );

  // Filter + sort
  const filteredItems = useMemo(() => {
    let result = items;
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter((i) => i.item.name.toLowerCase().includes(q));
    }
    if (typeFilter !== "ALL") {
      result = result.filter((i) => i.item.type === typeFilter);
    }
    return [...result].sort((a, b) => {
      switch (sort) {
        case "recent":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "price-desc":
          return b.currentValue - a.currentValue;
        case "price-asc":
          return a.currentValue - b.currentValue;
        case "perf-desc":
          return b.pnlPercent - a.pnlPercent;
        case "perf-asc":
          return a.pnlPercent - b.pnlPercent;
        case "name-asc":
          return a.item.name.localeCompare(b.item.name, "fr");
        default:
          return 0;
      }
    });
  }, [items, debouncedQuery, typeFilter, sort]);

  return (
    <section className="space-y-4">
      <ItemsHeader
        count={summary.itemCount}
        totalInvested={summary.totalInvested}
        totalValue={summary.totalCurrentValue}
        perfPct={summary.totalPnlPercent}
      />

      {items.length > 0 && (
        <ItemsToolbar
          query={query}
          onQueryChange={setQuery}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          availableTypes={availableTypes}
          sort={sort}
          onSortChange={(v) => setSort(v as SortKey)}
          view={view}
          onViewChange={setView}
        />
      )}

      {loading ? (
        <ItemsLoadingState />
      ) : items.length === 0 ? (
        <ItemsEmptyState variant="empty" />
      ) : filteredItems.length === 0 ? (
        <ItemsEmptyState
          variant="no-results"
          query={debouncedQuery}
          onClear={() => {
            setQuery("");
            setTypeFilter("ALL");
          }}
        />
      ) : view === "list" ? (
        <div className="space-y-2">
          {filteredItems.map((row) => (
            <ItemCard
              key={row.id}
              row={row}
              onDelete={onDelete}
              onRefresh={onUpdatePrice}
              isDeleting={deletingId === row.id}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filteredItems.map((row) => (
            <ItemCardGrid key={row.id} row={row} />
          ))}
        </div>
      )}
    </section>
  );
}
