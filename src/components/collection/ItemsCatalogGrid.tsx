"use client";

// ---------------------------------------------------------------------------
// Flat cross-series sealed-products catalog with type chips + search
// ---------------------------------------------------------------------------
// Renders the universe of known (series × product type) combinations as a
// dense 3-column grid. Filter chips and the search box both write to the
// URL (`?type=etb&q=mega`) so that the view is shareable and survives a
// back/forward navigation.
//
// Static-first: entries come from `buildStaticCatalog()`. DB items (when
// available) are merged in by (serieSlug, type) to supply real prices,
// canonical slugs for deep-linking, and overridden image URLs.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  buildStaticCatalog,
  ITEM_CATEGORIES,
  type ItemCategory,
  normalizeQuery,
} from "@/lib/items-catalog";
import { ItemImage } from "@/components/shared/ItemImage";
import { fetchApi } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

type DbItem = {
  id: string;
  slug: string | null;
  name: string;
  type: string;
  imageUrl: string | null;
  currentPrice: number | null;
  priceTrend: number | null;
  retailPrice: number | null;
  serie?: { slug?: string; name: string; abbreviation: string | null } | null;
};

const VALID_CATEGORIES = new Set<string>(ITEM_CATEGORIES.map((c) => c.id));

function categoryFromParam(raw: string | null): ItemCategory | null {
  if (!raw) return null;
  return VALID_CATEGORIES.has(raw) ? (raw as ItemCategory) : null;
}

export function ItemsCatalogGrid() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlType = categoryFromParam(searchParams.get("type"));
  const urlQuery = searchParams.get("q") ?? "";

  // Local mirrors of URL state. Changes are pushed back to the URL via a
  // debounced router.replace to keep the address bar in sync without
  // thrashing history on every keystroke.
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | null>(urlType);
  const [query, setQuery] = useState(urlQuery);

  useEffect(() => {
    setSelectedCategory(urlType);
  }, [urlType]);
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  // Sync local → URL (debounced). replace() so back-button doesn't fill up
  // with a history entry per keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("type", selectedCategory);
      if (query.trim()) params.set("q", query.trim());
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    }, 200);
    return () => clearTimeout(id);
    // router is stable; intentionally only re-run on user-driven state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, query]);

  // Static catalog is heavy enough (≈600 entries) that we memoize it and
  // overlay DB data when it arrives.
  const staticCatalog = useMemo(() => buildStaticCatalog(), []);
  const [dbItems, setDbItems] = useState<DbItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchApi("/api/items?limit=100");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setDbItems(data.items ?? []);
      } catch {
        // Non-fatal: static catalog alone is already a usable fallback.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Index DB items by (serieSlug, type) for O(1) merge during render.
  const dbIndex = useMemo(() => {
    const idx = new Map<string, DbItem>();
    for (const it of dbItems) {
      const serieSlug = it.serie?.slug;
      if (!serieSlug) continue;
      idx.set(`${serieSlug}::${it.type}`, it);
    }
    return idx;
  }, [dbItems]);

  const filtered = useMemo(() => {
    const normQ = query ? normalizeQuery(query.trim()) : "";
    return staticCatalog.filter((entry) => {
      if (selectedCategory && entry.category !== selectedCategory) return false;
      if (normQ) {
        const hay =
          normalizeQuery(entry.serieName) +
          " " +
          normalizeQuery(entry.typeLabel) +
          " " +
          normalizeQuery(entry.blocName) +
          " " +
          (entry.serieAbbreviation ? normalizeQuery(entry.serieAbbreviation) : "");
        if (!hay.includes(normQ)) return false;
      }
      return true;
    });
  }, [staticCatalog, selectedCategory, query]);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: chips (scrollable on small screens) + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex gap-2 overflow-x-auto pb-1 sm:flex-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <Chip
            selected={selectedCategory === null}
            onClick={() => setSelectedCategory(null)}
          >
            Tous
          </Chip>
          {ITEM_CATEGORIES.map((cat) => (
            <Chip
              key={cat.id}
              selected={selectedCategory === cat.id}
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === cat.id ? null : cat.id,
                )
              }
            >
              {cat.label}
            </Chip>
          ))}
        </div>

        <div className="relative sm:w-64 sm:shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher…"
            className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] py-2 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-[#E7BA76]/40"
            aria-label="Rechercher un produit"
          />
        </div>
      </div>

      {/* Result count */}
      <p className="text-xs text-[var(--text-tertiary)]">
        {filtered.length} produit{filtered.length > 1 ? "s" : ""}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-12 text-center text-sm text-[var(--text-secondary)]">
          Aucun produit ne correspond à ces filtres.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 min-[360px]:grid-cols-3 sm:gap-4">
          {filtered.map((entry) => {
            const db = dbIndex.get(`${entry.serieSlug}::${entry.type}`);
            const href = db?.slug
              ? `/collection/produits/${entry.blocSlug}/${entry.serieSlug}/${db.slug}`
              : `/collection/produits/${entry.blocSlug}/${entry.serieSlug}`;

            const priceToShow = db?.currentPrice ?? entry.typicalMsrp;

            return (
              <Link
                key={entry.key}
                href={href}
                className="group flex flex-col overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] transition-all hover:-translate-y-0.5 hover:border-[var(--border-hover)] hover:shadow-lg"
              >
                <div className="relative">
                  <ItemImage
                    src={db?.imageUrl}
                    slug={entry.key}
                    alt={`${entry.typeLabel} ${entry.serieName}`}
                    size="lg"
                    bgClassName="bg-transparent"
                    className="aspect-square w-full"
                  />
                  <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                    {entry.typeBadgeLabel}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1 p-2 sm:p-3">
                  <h3 className="line-clamp-2 break-words text-[13px] font-semibold leading-tight text-[var(--text-primary)] sm:text-sm">
                    {entry.serieName}
                  </h3>
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    {entry.serieAbbreviation ?? entry.blocName}
                  </p>
                  {priceToShow > 0 && (
                    <p className="font-data mt-auto pt-1 text-xs font-semibold text-[var(--text-secondary)] sm:text-sm">
                      {formatPrice(priceToShow)}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chip({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all"
      style={{
        border: selected ? "1px solid #E7BA76" : "1px solid var(--border-default)",
        backgroundColor: selected
          ? "rgba(231,186,118,0.12)"
          : "var(--bg-card)",
        color: selected ? "#F5DFB6" : "var(--text-secondary)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}
