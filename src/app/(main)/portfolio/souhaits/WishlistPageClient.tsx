"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, Heart, Plus, Eye } from "lucide-react";
import { useWishlistStore } from "@/stores/wishlistStore";
import { useToast } from "@/components/ui/Toast";
import { CardDetailModal } from "@/components/cards/CardDetailModal";
import { getDisplayPrice, isFrenchPrice } from "@/lib/display-price";
import { getCardRarityImage, CardRarity, CARD_RARITY_LABELS, CardCondition } from "@/types/card";
import { CardVersion } from "@/data/card-versions";
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

  // Detail modal — opened via the dedicated "Voir les détails" action in the
  // bulk bar (appears when exactly one card is selected).
  const [detailCardId, setDetailCardId] = useState<string | null>(null);

  // Selection is always-on on this page: every tap toggles the cardId in
  // `selected`. The bulk-action bar mounts as soon as at least one is picked.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);

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

  const rarityBlocMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const wi of items) {
      if (!m.has(wi.card.rarity)) m.set(wi.card.rarity, wi.card.serie.bloc.slug);
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
    const baseList = (() => {
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
      return list;
    })();

    const map = new Map<string, { serie: WishlistCard["serie"]; items: WishlistItem[] }>();
    for (const wi of baseList) {
      const sid = wi.card.serie.id;
      if (!map.has(sid)) map.set(sid, { serie: wi.card.serie, items: [] });
      map.get(sid)!.items.push(wi);
    }
    for (const group of map.values()) {
      group.items.sort((a, b) =>
        a.card.number.localeCompare(b.card.number, undefined, { numeric: true })
      );
    }
    return [...map.values()].sort((a, b) => {
      const latestA = Math.max(...a.items.map((wi) => new Date(wi.addedAt).getTime()));
      const latestB = Math.max(...b.items.map((wi) => new Date(wi.addedAt).getTime()));
      return latestB - latestA;
    });
  }, [items, activeRarity, search]);

  // ── Selection helpers ─────────────────────────────────────────────────────

  function toggleSelect(cardId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function handleCardTap(wi: WishlistItem) {
    toggleSelect(wi.card.id);
  }

  function openDetailsForSelected() {
    if (selected.size !== 1) return;
    const id = selected.values().next().value;
    if (id) setDetailCardId(id);
  }

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

  /**
   * Bulk remove selected cards from the wishlist. One API call per card (the
   * existing endpoint is per-id); fast enough for typical selections and we
   * roll back individually on failure.
   */
  async function handleBulkRemove() {
    if (selected.size === 0) return;
    setBulkPending(true);
    const ids = Array.from(selected);
    const removed = items.filter((wi) => ids.includes(wi.card.id));

    setItems((prev) => prev.filter((wi) => !ids.includes(wi.card.id)));
    for (const id of ids) remove(id);

    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/wishlist/cards/${id}`, { method: "DELETE" }).then((r) => {
            if (!r.ok) throw new Error();
          }),
        ),
      );
      toast(`${ids.length} carte${ids.length > 1 ? "s retirées" : " retirée"} 💔`, "info");
      clearSelection();
    } catch {
      setItems((prev) => [...removed, ...prev]);
      for (const id of ids) add(id);
      toast("Erreur, réessaie", "error");
    } finally {
      setBulkPending(false);
    }
  }

  /**
   * "Je l'ai" bulk action: add each selected card to the collection (Near Mint,
   * Normal, FR, qty 1, current displayed price) and remove from wishlist on
   * success. Uses the existing /api/cards/collection batch endpoint.
   */
  async function handleBulkOwn() {
    if (selected.size === 0) return;
    setBulkPending(true);
    const ids = Array.from(selected);
    const removed = items.filter((wi) => ids.includes(wi.card.id));

    try {
      const res = await fetch("/api/cards/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cards: ids.map((id) => ({
            cardId:    id,
            quantity:  1,
            condition: CardCondition.NEAR_MINT,
            language:  "FR",
            version:   CardVersion.NORMAL,
            foil:      false,
            priceMode: "current",
          })),
        }),
      });
      if (!res.ok) throw new Error();

      // Remove from wishlist in parallel (best-effort — collection add succeeded).
      setItems((prev) => prev.filter((wi) => !ids.includes(wi.card.id)));
      for (const id of ids) remove(id);
      Promise.all(ids.map((id) => fetch(`/api/wishlist/cards/${id}`, { method: "DELETE" }))).catch(() => {});

      toast(`${ids.length} carte${ids.length > 1 ? "s ajoutées" : " ajoutée"} à ta collection ✨`, "success");
      clearSelection();
    } catch {
      toast("Erreur, réessaie", "error");
      // Keep items in place — user can retry or deselect.
      void removed; // unused but captured for potential rollback extension
    } finally {
      setBulkPending(false);
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

        <button
          onClick={() => setShowSortModal(true)}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M7 12h10M11 18h2"/></svg>
          {SORT_LABELS[sortKey]}
        </button>

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
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              activeRarity === null
                ? "border-purple-500 bg-purple-500 text-white"
                : "border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-purple-400"
            )}
          >
            Toutes ({items.length})
          </button>

          {rarities.map(({ rarity, count }) => {
            const blocSlug = rarityBlocMap.get(rarity) ?? "";
            const isActive = activeRarity === rarity;
            const needsWhiteFilter =
              rarity === CardRarity.COMMON ||
              rarity === CardRarity.UNCOMMON ||
              rarity === CardRarity.RARE ||
              rarity === "NO_RARITY";
            return (
              <button
                key={rarity}
                onClick={() => setActiveRarity(isActive ? null : rarity)}
                title={CARD_RARITY_LABELS[rarity as CardRarity] ?? rarity}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                  isActive
                    ? "border-purple-500 bg-purple-500/15 text-purple-400"
                    : "border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-purple-400"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getCardRarityImage(rarity as CardRarity, blocSlug)}
                  alt={CARD_RARITY_LABELS[rarity as CardRarity] ?? rarity}
                  className={cn("h-4 w-auto object-contain", isActive ? "brightness-125" : "brightness-90")}
                  style={needsWhiteFilter
                    ? { filter: "drop-shadow(0 0 1px rgba(255,255,255,0.9)) drop-shadow(0 0 0.5px rgba(255,255,255,0.9))" }
                    : undefined}
                />
                <span>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Grid / grouped ────────────────────────────────────────── */}
      {tab === "all" ? (
        <CardGrid
          items={filtered}
          gridSize={gridSize}
          selected={selected}
          onTap={handleCardTap}
        />
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
                  <CardGrid
                    items={serieItems}
                    gridSize={gridSize}
                    selected={selected}
                    onTap={handleCardTap}
                  />
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

      {/* ── Card detail modal — opened on single tap when NOT in selection ─── */}
      {detailCardId && (
        <CardDetailModal
          cardId={detailCardId}
          onClose={() => {
            // Also prune the local list if the card is no longer wishlisted
            // (user removed it from inside the modal).
            const stillWished = useWishlistStore.getState().ids.has(detailCardId);
            if (!stillWished) {
              setItems((prev) => prev.filter((wi) => wi.card.id !== detailCardId));
            }
            setDetailCardId(null);
          }}
        />
      )}

      {/* ── Bulk action bar (sticky bottom) ──────────────────────────── */}
      {selected.size > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border-default)] bg-[var(--bg-card)]/95 backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black/50"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs font-medium text-[var(--text-tertiary)] underline-offset-2 hover:text-[var(--text-secondary)] hover:underline"
            >
              Désélectionner
            </button>
            <div className="ml-auto flex flex-wrap justify-end gap-2">
              {/* Details button — only when exactly one card is picked */}
              {selected.size === 1 && (
                <button
                  type="button"
                  onClick={openDetailsForSelected}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
                >
                  <Eye className="h-4 w-4" />
                  Voir les détails
                </button>
              )}
              <button
                type="button"
                disabled={bulkPending}
                onClick={handleBulkRemove}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-sm font-medium text-purple-400 transition-colors hover:bg-purple-500/20 disabled:opacity-60"
              >
                <Heart className="h-4 w-4" />
                Retirer
              </button>
              <button
                type="button"
                disabled={bulkPending}
                onClick={handleBulkOwn}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#F2D58A] via-[#E7BA76] to-[#C99A4F] px-4 py-2 text-sm font-semibold text-[#2A1A06] shadow-md shadow-[#E7BA76]/30 transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                Je l&apos;ai
              </button>
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
  selected,
  onTap,
}: {
  items: WishlistItem[];
  gridSize: GridSize;
  selected: Set<string>;
  onTap: (wi: WishlistItem) => void;
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
        <CardVignette
          key={wi.wishlistId}
          wi={wi}
          isSelected={selected.has(wi.card.id)}
          onTap={onTap}
        />
      ))}
    </div>
  );
}

// ── CardVignette sub-component ────────────────────────────────────────────────

/**
 * A single tappable wishlist card. Selection is always-on: each tap toggles
 * inclusion in the parent's `selected` set. The parent renders the bulk
 * action bar that reacts to that set. We intentionally don't paint a heart
 * badge on the card — being on this page already means it's wishlisted.
 */
function CardVignette({
  wi,
  isSelected,
  onTap,
}: {
  wi: WishlistItem;
  isSelected: boolean;
  onTap: (wi: WishlistItem) => void;
}) {
  const { card } = wi;
  const price = getDisplayPrice(card);
  const isFr = isFrenchPrice(card);
  const blocSlug = card.serie.bloc.slug;

  return (
    <button
      type="button"
      onClick={() => onTap(wi)}
      className={cn(
        "group relative flex flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-lg",
        isSelected && "ring-2 ring-purple-500",
      )}
      aria-pressed={isSelected}
      aria-label={`${card.name} — ${card.number} (${isSelected ? "sélectionnée, toucher pour désélectionner" : "toucher pour sélectionner"})`}
    >
      <div
        className={cn(
          "relative aspect-[2.5/3.5] overflow-hidden rounded-lg bg-[var(--bg-secondary)] shadow-sm transition-all",
          !isSelected && "group-hover:-translate-y-0.5 group-hover:shadow-md",
          isSelected && "scale-[0.97]",
        )}
      >
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

        {/* Selection indicator — only shown when picked */}
        {isSelected && (
          <div className="absolute top-1 left-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 shadow-md">
            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          </div>
        )}

        {/* Number + rarity — bottom left */}
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

        {/* Price — bottom right. Prefixed with 🇫🇷 when the value is the
            cheapest French NM listing (same convention as Collection/Classeur). */}
        {price != null && price > 0 && (
          <div className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
            {isFr && <span aria-hidden>🇫🇷</span>}
            <span>{price.toFixed(2).replace(".", ",")} €</span>
          </div>
        )}
      </div>

      <div className="mt-1 px-0.5">
        <p className="truncate text-[10px] font-medium leading-tight text-[var(--text-secondary)]">
          {card.name}
        </p>
      </div>
    </button>
  );
}
