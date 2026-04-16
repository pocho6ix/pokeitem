"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { getCardRarityImage, CardRarity, CARD_RARITY_LABELS } from "@/types/card";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProfileCardItem {
  id: string;
  number: string;
  name: string;
  rarity: string;
  imageUrl: string | null;
  price?: number | null;
  priceFr?: number | null;
  priceReverse?: number | null;
  serie: {
    id?: string;
    slug: string;
    name: string;
    abbreviation?: string | null;
    bloc: { slug: string };
  };
}

interface Props {
  cards: ProfileCardItem[];
  visitorWishlistIds?: Set<string>;
}

type GridSize = "small" | "medium" | "large";

// ── Constants ─────────────────────────────────────────────────────────────────

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

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ProfileCardSection({ cards, visitorWishlistIds }: Props) {
  const [activeRarity, setActiveRarity] = useState<string | null>(null);
  const [collapsedSeries, setCollapsedSeries] = useState<Set<string>>(new Set());
  const [gridSize, setGridSize] = useState<GridSize>("medium");

  // ── Rarity chips ──────────────────────────────────────────────────────────

  const rarityCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cards) m.set(c.rarity, (m.get(c.rarity) ?? 0) + 1);
    return m;
  }, [cards]);

  const rarityBlocMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of cards) {
      if (!m.has(c.rarity)) m.set(c.rarity, c.serie.bloc.slug);
    }
    return m;
  }, [cards]);

  const rarities = useMemo(
    () =>
      [...rarityCounts.entries()]
        .sort((a, b) => (RARITY_ORDER[a[0]] ?? 99) - (RARITY_ORDER[b[0]] ?? 99))
        .map(([r, count]) => ({ rarity: r, count })),
    [rarityCounts]
  );

  // ── Filtered + grouped by série ───────────────────────────────────────────

  const filtered = useMemo(
    () => (activeRarity ? cards.filter((c) => c.rarity === activeRarity) : cards),
    [cards, activeRarity]
  );

  const groupedBySerie = useMemo(() => {
    const key = (c: ProfileCardItem) => c.serie.id ?? c.serie.slug;
    const map = new Map<string, { serieKey: string; serieName: string; abbr: string | null; items: ProfileCardItem[] }>();
    for (const c of filtered) {
      const k = key(c);
      if (!map.has(k)) {
        map.set(k, {
          serieKey: k,
          serieName: c.serie.name,
          abbr: c.serie.abbreviation ?? null,
          items: [],
        });
      }
      map.get(k)!.items.push(c);
    }
    // Sort cards by number within each group
    for (const g of map.values()) {
      g.items.sort((a, b) =>
        a.number.localeCompare(b.number, undefined, { numeric: true })
      );
    }
    return [...map.values()];
  }, [filtered]);

  if (cards.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-[var(--text-secondary)]">
        Aucune carte à afficher
      </div>
    );
  }

  return (
    <div>
      {/* ── Controls row ─────────────────────────────────────────── */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-[var(--text-tertiary)]">{cards.length} carte{cards.length > 1 ? "s" : ""}</p>
        {/* Grid size */}
        <div className="flex items-center gap-0.5 rounded-lg bg-[var(--bg-secondary)] p-0.5">
          {(["small", "medium", "large"] as GridSize[]).map((s) => {
            const icons = {
              small: (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="0" y="0" width="4" height="4" rx="0.5"/><rect x="6" y="0" width="4" height="4" rx="0.5"/><rect x="12" y="0" width="4" height="4" rx="0.5"/>
                  <rect x="0" y="6" width="4" height="4" rx="0.5"/><rect x="6" y="6" width="4" height="4" rx="0.5"/><rect x="12" y="6" width="4" height="4" rx="0.5"/>
                </svg>
              ),
              medium: (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="0" y="0" width="6" height="6" rx="0.5"/><rect x="9" y="0" width="7" height="6" rx="0.5"/>
                  <rect x="0" y="9" width="6" height="7" rx="0.5"/><rect x="9" y="9" width="7" height="7" rx="0.5"/>
                </svg>
              ),
              large: (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="0" y="0" width="16" height="7" rx="0.5"/>
                  <rect x="0" y="9" width="16" height="7" rx="0.5"/>
                </svg>
              ),
            };
            return (
              <button
                key={s}
                onClick={() => setGridSize(s)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded transition-colors",
                  gridSize === s
                    ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                )}
              >
                {icons[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Rarity chips ─────────────────────────────────────────── */}
      {rarities.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveRarity(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              activeRarity === null
                ? "border-[#E7BA76] bg-[#E7BA76]/15 text-[#E7BA76]"
                : "border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[#E7BA76]/50"
            )}
          >
            Toutes ({cards.length})
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
                    ? "border-[#E7BA76] bg-[#E7BA76]/15 text-[#E7BA76]"
                    : "border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[#E7BA76]/50"
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

      {/* ── Grouped sections ─────────────────────────────────────── */}
      <div className="space-y-5">
        {groupedBySerie.map(({ serieKey, serieName, abbr, items }) => {
          const collapsed = collapsedSeries.has(serieKey);
          return (
            <div key={serieKey}>
              <button
                onClick={() =>
                  setCollapsedSeries((prev) => {
                    const next = new Set(prev);
                    if (next.has(serieKey)) next.delete(serieKey);
                    else next.add(serieKey);
                    return next;
                  })
                }
                className="mb-2 flex w-full items-center justify-between gap-2 text-left"
              >
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {serieName}
                  {abbr && (
                    <span className="ml-1.5 text-xs font-normal text-[var(--text-tertiary)]">· {abbr}</span>
                  )}
                  <span className="ml-1.5 text-xs font-normal text-[var(--text-tertiary)]">({items.length})</span>
                </span>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  className={cn("shrink-0 text-[var(--text-secondary)] transition-transform", collapsed ? "-rotate-90" : "")}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {!collapsed && (
                <div className={GRID_CLASS[gridSize]}>
                  {items.map((card) => (
                    <CardTile key={`${card.id}-${card.number}`} card={card} inVisitorWishlist={visitorWishlistIds?.has(card.id) ?? false} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CardTile ──────────────────────────────────────────────────────────────────

function CardTile({ card, inVisitorWishlist }: { card: ProfileCardItem; inVisitorWishlist: boolean }) {
  const blocSlug = card.serie.bloc.slug;
  const displayPrice = card.priceFr ?? card.price ?? null;

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

        {/* Visitor wishlist heart — top left */}
        {inVisitorWishlist && (
          <div className="absolute top-1 left-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#A855F7" stroke="#A855F7" strokeWidth="1">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
        )}

        {/* Number + rarity badge — bottom left */}
        <div className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/50 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
          <span>{card.number}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getCardRarityImage(card.rarity as CardRarity, blocSlug)}
            alt=""
            className="h-3 w-auto object-contain"
          />
        </div>

        {/* Price — bottom right */}
        {displayPrice != null && displayPrice > 0 && (
          <div className="absolute bottom-1 right-1 rounded bg-black/50 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
            {displayPrice.toFixed(2)} €
          </div>
        )}
      </div>

      <p className="mt-1 truncate text-center text-[10px] text-[var(--text-secondary)]">{card.name}</p>
    </div>
  );
}
