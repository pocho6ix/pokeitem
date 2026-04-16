"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useWishlistStore } from "@/stores/wishlistStore";
import { useToast } from "@/components/ui/Toast";
import { WishlistHeartButton } from "@/components/wishlist/WishlistHeartButton";
import { getDisplayPrice } from "@/lib/display-price";
import { getCardRarityImage, CardRarity, CARD_RARITY_LABELS } from "@/types/card";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WishlistCard {
  id: string;
  number: string;
  name: string;
  rarity: string;
  imageUrl: string | null;
  price?: number | null;
  priceFr?: number | null;
  priceReverse?: number | null;
  types?: string[];
  category?: string | null;
  trainerType?: string | null;
  energyType?: string | null;
  serie: {
    id: string;
    slug: string;
    name: string;
    abbreviation?: string | null;
    bloc: { slug: string };
  };
}

interface WishlistItem {
  wishlistId: string;
  addedAt: string;
  priority: number;
  maxPrice?: number | null;
  note?: string | null;
  card: WishlistCard;
}

type GridSize = "small" | "medium" | "large";
type Tab = "all" | "by-serie";
type SortKey = "date-desc" | "date-asc" | "name-asc" | "price-desc" | "price-asc" | "rarity";

const GRID_CLASS: Record<GridSize, string> = {
  small:  "grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8",
  medium: "grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8",
  large:  "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
};

const RARITY_ORDER: Record<string, number> = {
  MEGA_HYPER_RARE: 0,
  MEGA_ATTAQUE_RARE: 1,
  HYPER_RARE: 2,
  SPECIAL_ILLUSTRATION_RARE: 3,
  ILLUSTRATION_RARE: 4,
  ULTRA_RARE: 5,
  DOUBLE_RARE: 6,
  NOIR_BLANC_RARE: 7,
  SECRET_RARE: 8,
  ACE_SPEC_RARE: 9,
  HOLO_RARE: 10,
  RARE: 11,
  UNCOMMON: 12,
  COMMON: 13,
  PROMO: 14,
  NO_RARITY: 15,
};

function cardPrice(card: WishlistCard): number {
  return getDisplayPrice(card) ?? 0;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function WishlistPageClient({ items: initialItems }: { items: WishlistItem[] }) {
  const router = useRouter();
  const { remove, add } = useWishlistStore();
  const { toast } = useToast();

  const [items, setItems] = useState<WishlistItem[]>(initialItems);
  const [tab, setTab] = useState<Tab>("by-serie");
  const [gridSize, setGridSize] = useState<GridSize>("medium");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date-desc");
  const [showSortModal, setShowSortModal] = useState(false);
  const [collapsedSeries, setCollapsedSeries] = useState<Set<string>>(new Set());
  const [activeRarity, setActiveRarity] = useState<string | null>(null);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalValue = useMemo(
    () => items.reduce((sum, wi) => sum + cardPrice(wi.card), 0),
    [items]
  );

  const uniqueSeries = useMemo(
    () => new Set(items.map((wi) => wi.card.serie.id)).size,
    [items]
  );

  // ── Rarity chips ──────────────────────────────────────────────────────────

  const rarityCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const wi of items) {
      m.set(wi.card.rarity, (m.get(wi.card.rarity) ?? 0) + 1);
    }
    return m;
  }, [items]);

  const rarities = useMemo(
    () =>
      [...rarityCounts.entries()]
        .sort((a, b) => (RARITY_ORDER[a[0]] ?? 99) - (RARITY_ORDER[b[0]] ?? 99))
        .map(([r, count]) => ({ rarity: r, count })),
    [rarityCounts]
  );

  // ── Filtered + sorted ─────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...items];
    if (activeRarity) list = list.filter((wi) => wi.card.rarity === activeRarity);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (wi) =>
          wi.card.name.toLowerCase().includes(q) ||
          wi.card.number.toLowerCase().includes(q) ||
          wi.card.serie.name.toLowerCase().includes(q)
      );
    }
    switch (sortKey) {
      case "date-desc": list.sort((a, b) => b.addedAt.localeCompare(a.addedAt)); break;
      case "date-asc":  list.sort((a, b) => a.addedAt.localeCompare(b.addedAt)); break;
      case "name-asc":  list.sort((a, b) => a.card.name.localeCompare(b.card.name)); break;
      case "price-desc": list.sort((a, b) => cardPrice(b.card) - cardPrice(a.card)); break;
      case "price-asc":  list.sort((a, b) => cardPrice(a.card) - cardPrice(b.card)); break;
      case "rarity":    list.sort((a, b) => (RARITY_ORDER[a.card.rarity] ?? 99) - (RARITY_ORDER[b.card.rarity] ?? 99)); break;
    }
    return list;
  }, [items, activeRarity, search, sortKey]);

  // ── Grouped by serie ──────────────────────────────────────────────────────

  const groupedBySerie = useMemo(() => {
    const map = new Map<string, { serie: WishlistCard["serie"]; items: WishlistItem[] }>();
    for (const wi of filtered) {
      const sid = wi.card.serie.id;
      if (!map.has(sid)) map.set(sid, { serie: wi.card.serie, items: [] });
      map.get(sid)!.items.push(wi);
    }
    return [...map.values()];
  }, [filtered]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleRemove(wi: WishlistItem) {
    // Optimistic remove
    setItems((prev) => prev.filter((x) => x.wishlistId !== wi.wishlistId));
    remove(wi.card.id);

    try {
      const res = await fetch(`/api/wishlist/cards/${wi.card.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Retiré de ta liste 💔", "info", {
        action: {
          label: "Annuler",
          onClick: () => {
            setItems((prev) => [wi, ...prev]);
            add(wi.card.id);
            fetch("/api/wishlist/cards", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ cardId: wi.card.id }),
            });
          },
        },
      });
    } catch {
      setItems((prev) => [wi, ...prev]);
      add(wi.card.id);
      toast("Erreur, réessaie", "error");
    }
  }

  function toggleCollapse(serieId: string) {
    setCollapsedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(serieId)) next.delete(serieId);
      else next.add(serieId);
      return next;
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const SORT_LABELS: Record<SortKey, string> = {
    "date-desc":  "Date d'ajout (récent)",
    "date-asc":   "Date d'ajout (ancien)",
    "name-asc":   "Nom A–Z",
    "price-desc": "Prix décroissant",
    "price-asc":  "Prix croissant",
    "rarity":     "Rareté",
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        {/* Watermark heart */}
        <svg width="120" height="120" viewBox="0 0 24 24" fill="#A855F7" opacity="0.15" className="mb-6">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <p className="text-xl font-bold text-[var(--text-primary)]">Ta liste de souhaits est vide</p>
        <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-xs">
          Appuie sur le 💜 sur une carte pour l&apos;ajouter à ta liste.
        </p>
        <button
          onClick={() => router.push("/portfolio/cartes")}
          className="mt-6 rounded-lg bg-purple-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-600 transition-colors"
        >
          Parcourir mes cartes
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#A855F7" stroke="#A855F7" strokeWidth="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          Liste de souhaits
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {items.length} carte{items.length > 1 ? "s" : ""} ·{" "}
          {totalValue > 0 && (
            <>{totalValue.toFixed(2).replace(".", ",")} € valeur estimée · </>
          )}
          {uniqueSeries} extension{uniqueSeries > 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="mb-4 flex gap-1 rounded-lg bg-[var(--bg-secondary)] p-1 w-fit">
        {(["all", "by-serie"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t
                ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            {t === "all" ? "Toutes" : "Par série"}
          </button>
        ))}
      </div>

      {/* ── Controls ──────────────────────────────────────────────── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="search"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </div>

        {/* Sort */}
        <button
          onClick={() => setShowSortModal(true)}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M7 12h10M11 18h2"/></svg>
          {SORT_LABELS[sortKey]}
        </button>

        {/* Grid size */}
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-1">
          {(["small", "medium", "large"] as GridSize[]).map((s) => {
            const labels = { small: "Petit", medium: "Moyen", large: "Grand" };
            return (
              <button
                key={s}
                onClick={() => setGridSize(s)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  gridSize === s
                    ? "bg-purple-500 text-white"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {labels[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Rarity chips ──────────────────────────────────────────── */}
      {rarities.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveRarity(null)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors border",
              activeRarity === null
                ? "bg-purple-500 text-white border-purple-500"
                : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-purple-400"
            )}
          >
            Toutes ({items.length})
          </button>
          {rarities.map(({ rarity, count }) => (
            <button
              key={rarity}
              onClick={() => setActiveRarity(rarity === activeRarity ? null : rarity)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors border",
                activeRarity === rarity
                  ? "bg-purple-500 text-white border-purple-500"
                  : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-purple-400"
              )}
            >
              {CARD_RARITY_LABELS[rarity as CardRarity] ?? rarity} ({count})
            </button>
          ))}
        </div>
      )}

      {/* ── Grid / grouped ────────────────────────────────────────── */}
      {tab === "all" ? (
        <CardGrid items={filtered} gridSize={gridSize} onRemove={handleRemove} />
      ) : (
        <div className="space-y-6">
          {groupedBySerie.map(({ serie, items: serieItems }) => {
            const collapsed = collapsedSeries.has(serie.id);
            const abbr = serie.abbreviation ? ` · ${serie.abbreviation}` : "";
            return (
              <div key={serie.id}>
                <button
                  onClick={() => toggleCollapse(serie.id)}
                  className="mb-2 flex w-full items-center justify-between gap-2 text-left"
                >
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {serie.name}{abbr} ({serieItems.length})
                  </span>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={cn("text-[var(--text-secondary)] transition-transform", collapsed ? "-rotate-90" : "")}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                {!collapsed && (
                  <CardGrid items={serieItems} gridSize={gridSize} onRemove={handleRemove} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sort modal ──────────────────────────────────────────────── */}
      {showSortModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
          onClick={() => setShowSortModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-[var(--bg-card)] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Trier par</h3>
            <div className="space-y-1">
              {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setSortKey(key); setShowSortModal(false); }}
                  className={cn(
                    "w-full rounded-lg px-4 py-3 text-left text-sm transition-colors",
                    sortKey === key
                      ? "bg-purple-500/10 text-purple-500 font-semibold"
                      : "text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CardGrid sub-component ────────────────────────────────────────────────────

function CardGrid({
  items,
  gridSize,
  onRemove,
}: {
  items: WishlistItem[];
  gridSize: GridSize;
  onRemove: (wi: WishlistItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[var(--text-secondary)]">
        Aucune carte trouvée
      </div>
    );
  }

  return (
    <div className={GRID_CLASS[gridSize]}>
      {items.map((wi) => (
        <CardVignette key={wi.wishlistId} wi={wi} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ── CardVignette sub-component ────────────────────────────────────────────────

function CardVignette({
  wi,
  onRemove,
}: {
  wi: WishlistItem;
  onRemove: (wi: WishlistItem) => void;
}) {
  const { card } = wi;
  const price = getDisplayPrice(card);
  const blocSlug = card.serie.bloc.slug;

  return (
    <div className="group relative flex flex-col">
      <div className="relative aspect-[2.5/3.5] overflow-hidden rounded-lg bg-[var(--bg-secondary)] shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
        {card.imageUrl ? (
          <Image
            src={card.imageUrl}
            alt={`${card.name} — ${card.number}`}
            fill
            sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
            <span className="text-xs font-bold text-[var(--text-secondary)]">{card.number}</span>
            <span className="text-[10px] leading-tight text-[var(--text-tertiary)]">{card.name}</span>
          </div>
        )}

        {/* Wishlist heart — top left — filled violet, tap to remove */}
        <WishlistHeartButton
          cardId={card.id}
          size="sm"
          className="absolute top-1 left-1 z-10"
        />

        {/* Number + rarity badge — bottom left */}
        <div className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
          <span>{card.number}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getCardRarityImage(card.rarity as CardRarity, blocSlug)}
            alt=""
            className="h-3 w-auto object-contain opacity-90"
            style={
              (card.rarity === CardRarity.COMMON ||
                card.rarity === CardRarity.UNCOMMON ||
                card.rarity === CardRarity.RARE)
                ? { filter: "drop-shadow(0 0 1px rgba(255,255,255,0.9)) drop-shadow(0 0 0.5px rgba(255,255,255,0.9))" }
                : undefined
            }
          />
        </div>

        {/* Price — bottom right */}
        {price != null && price > 0 && (
          <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
            {price.toFixed(2).replace(".", ",")} €
          </div>
        )}
      </div>

      {/* Card name below */}
      <div className="mt-1 px-0.5">
        <p className="truncate text-[10px] font-medium leading-tight text-[var(--text-secondary)]">
          {card.name}
        </p>
      </div>
    </div>
  );
}
