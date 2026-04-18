"use client";

import { useState, useMemo, useTransition, useEffect, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, X, CheckSquare, ArrowUpDown, Search } from "lucide-react";
import { CARD_RARITY_IMAGE, CARD_RARITY_LABELS, CARD_RARITY_ORDER, CardRarity, CardCondition, getCardRarityImage } from "@/types/card";
import { CardVersion, getSerieVersions } from "@/data/card-versions";
import { cn } from "@/lib/utils";
import { getCardImageAlt } from "@/lib/seo/card-image";
import { FirstEditionStamp } from "./FirstEditionStamp";

const CardDetailModal = lazy(() =>
  import("./CardDetailModal").then((m) => ({ default: m.CardDetailModal }))
);

// ── Owned card entry (one per UserCard row) ─────────────────────────────────
export interface ClasseurCard {
  id: string;        // UserCard.id (not used for API, kept for React key)
  cardId: string;    // Card.id
  version: CardVersion;
  condition: CardCondition;
  gradeValue: number | null;
  number: string;
  name: string;
  rarity: CardRarity;
  imageUrl: string | null;
  price: number | null;
  isFrenchPrice?: boolean; // true when `price` is the cheapest FR NM listing
  isSpecial?: boolean;
}

// ── Missing card (not owned, from the full series catalog) ──────────────────
export interface MissingCard {
  cardId: string;
  number: string;
  name: string;
  rarity: CardRarity;
  imageUrl: string | null;
  isSpecial: boolean;
  price: number | null;     // NORMAL market price
  isFrenchPrice: boolean;
}

// ── Version badge images ────────────────────────────────────────────────────
const VERSION_BADGE_IMG: Record<CardVersion, string> = {
  [CardVersion.NORMAL]:             "/badge_normale.png",
  [CardVersion.FIRST_EDITION]:      "/images/badges/first-edition.png",
  [CardVersion.REVERSE]:            "/badge_reverse.png",
  [CardVersion.REVERSE_POKEBALL]:   "/badge_pokeball.png",
  [CardVersion.REVERSE_MASTERBALL]: "/badge_masterball.png",
};

// ASC sort order (NORMALE first, MASTERBALL last)
const VERSION_SORT_ORDER: Record<CardVersion, number> = {
  [CardVersion.NORMAL]:             0,
  [CardVersion.FIRST_EDITION]:      1,
  [CardVersion.REVERSE]:            2,
  [CardVersion.REVERSE_POKEBALL]:   3,
  [CardVersion.REVERSE_MASTERBALL]: 4,
};

const BADGE_SIZE = 15;

function VersionBadgeIcon({ version, qty }: { version: CardVersion; qty?: number }) {
  const showQty = qty != null && qty > 1;
  return (
    <div className={`flex items-center gap-0.5 rounded-full bg-black/60 pl-0.5 ${showQty ? "pr-1" : "pr-0.5"} py-0.5`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={VERSION_BADGE_IMG[version]}
        alt=""
        className="h-4 w-4 shrink-0 rounded-full object-cover"
      />
      {showQty && (
        <span className="text-[8px] font-bold leading-none text-white">×{qty}</span>
      )}
    </div>
  );
}

// ── Grouped owned card (one tile per unique cardId) ─────────────────────────
interface GroupedCard {
  cardId: string;
  number: string;
  name: string;
  rarity: CardRarity;
  imageUrl: string | null;
  isSpecial: boolean;
  ownedVersions: CardVersion[];
  versionQty: Map<CardVersion, number>;
  displayPrice: number | null;
  displayIsFrenchPrice: boolean;
  displayCondition: CardCondition;
  displayGradeValue: number | null;
}

// Condition badge — only shown when not NEAR_MINT (default)
const CONDITION_SHORT: Partial<Record<CardCondition, string>> = {
  [CardCondition.MINT]:         "Mint",
  [CardCondition.EXCELLENT]:    "EX",
  [CardCondition.GOOD]:         "G",
  [CardCondition.LIGHT_PLAYED]: "LP",
  [CardCondition.PLAYED]:       "PL",
  [CardCondition.POOR]:         "PR",
};

type ViewFilter = "owned" | "missing";
type SortKey = "number" | "name" | "rarity" | "price";

interface Props {
  cards: ClasseurCard[];
  allCards?: MissingCard[]; // full serie catalog for computing missing
  blocSlug: string;
  serieSlug: string;
  serieName: string;
}

export function ClasseurCardGrid({ cards, allCards, blocSlug, serieSlug, serieName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [viewFilter, setViewFilter]   = useState<ViewFilter>("owned");

  // ── Grid size ──────────────────────────────────────────────────────────────
  type GridSize = "small" | "medium" | "large";
  const [gridSize, setGridSize] = useState<GridSize>("medium");
  useEffect(() => {
    const saved = localStorage.getItem("classeur-grid-size") as GridSize | null;
    if (saved) setGridSize(saved);
  }, []);
  function changeGridSize(s: GridSize) {
    setGridSize(s);
    localStorage.setItem("classeur-grid-size", s);
  }
  const GRID_CLASS: Record<GridSize, string> = {
    small:  "grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8",
    medium: "grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6",
    large:  "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
  };

  const [editMode, setEditMode]       = useState(false);
  // selected stores cardId strings (one entry per grouped card)
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [confirming, setConfirming]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [detailCardId, setDetailCardId] = useState<string | null>(null);

  // ── Sort & filter state ──────────────────────────────────────────────────
  const [search, setSearch]             = useState("");
  const [sortBy, setSortBy]             = useState<SortKey>("number");
  const [sortOrder, setSortOrder]       = useState<"asc" | "desc">("asc");
  const [rarityFilter, setRarityFilter] = useState<CardRarity | null>(null);
  const [showSort, setShowSort]         = useState(false);

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "number",  label: "Numéro" },
    { key: "name",    label: "Nom" },
    { key: "rarity",  label: "Rareté" },
    { key: "price",   label: "Prix" },
  ];

  // ── Owned versions per cardId ────────────────────────────────────────────
  const ownedVersionsByCardId = useMemo(() => {
    const m = new Map<string, Set<CardVersion>>();
    for (const c of cards) {
      if (!m.has(c.cardId)) m.set(c.cardId, new Set());
      m.get(c.cardId)!.add(c.version);
    }
    return m;
  }, [cards]);

  // ── Serie available versions ───────────────────────────────────────────
  const serieVersions = useMemo(() => getSerieVersions(serieSlug, blocSlug), [serieSlug, blocSlug]);

  // ── All missing cards (unfiltered) — missing = at least one applicable version NOT owned
  const allMissingCards = useMemo<MissingCard[]>(() => {
    if (!allCards) return [];
    return allCards.filter((c) => {
      const applicable = c.isSpecial ? [CardVersion.NORMAL] : serieVersions;
      const owned = ownedVersionsByCardId.get(c.cardId);
      if (!owned) return true; // not owned at all
      return applicable.some((v) => !owned.has(v));
    });
  }, [allCards, ownedVersionsByCardId, serieVersions]);

  // ── Tab counts (stable, before search/rarity filters) ───────────────────
  const ownedCount   = ownedVersionsByCardId.size;
  const missingCount = allMissingCards.length;

  // ── Sort helper ──────────────────────────────────────────────────────────
  function applySortFilter<T extends { number: string; name: string; rarity: CardRarity; price: number | null }>(
    list: T[]
  ): T[] {
    let result = list;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = (result as (T & { name: string; number: string })[]).filter(
        (c) => c.name.toLowerCase().includes(q) || c.number.toLowerCase().includes(q)
      );
    }
    if (rarityFilter) result = result.filter((c) => c.rarity === rarityFilter);
    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "number") cmp = a.number.localeCompare(b.number, undefined, { numeric: true });
      if (sortBy === "name")   cmp = a.name.localeCompare(b.name, "fr");
      if (sortBy === "rarity") cmp = CARD_RARITY_ORDER[a.rarity] - CARD_RARITY_ORDER[b.rarity];
      if (sortBy === "price")  cmp = (a.price ?? 0) - (b.price ?? 0);
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }

  // ── Owned: sorted entries → grouped cards ───────────────────────────────
  const sortedEntries = useMemo(() => applySortFilter(cards), [cards, search, rarityFilter, sortBy, sortOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  const groupedCards = useMemo<GroupedCard[]>(() => {
    const map = new Map<string, { base: ClasseurCard; versionsMap: Map<CardVersion, ClasseurCard>; qtyMap: Map<CardVersion, number> }>();
    for (const c of sortedEntries) {
      if (!map.has(c.cardId)) map.set(c.cardId, { base: c, versionsMap: new Map(), qtyMap: new Map() });
      const grp = map.get(c.cardId)!;
      grp.versionsMap.set(c.version, c);
      grp.qtyMap.set(c.version, (grp.qtyMap.get(c.version) ?? 0) + 1);
      if (c.version === CardVersion.NORMAL) grp.base = c;
    }
    return [...map.values()].map(({ base, versionsMap, qtyMap }) => {
      const ownedVersions = [...versionsMap.keys()].sort(
        (a, b) => VERSION_SORT_ORDER[a] - VERSION_SORT_ORDER[b]
      );
      const displayEntry = versionsMap.get(CardVersion.NORMAL) ?? versionsMap.get(ownedVersions[0])!;
      return {
        cardId: base.cardId,
        number: base.number,
        name: base.name,
        rarity: base.rarity,
        imageUrl: base.imageUrl,
        isSpecial: base.isSpecial ?? false,
        ownedVersions,
        versionQty: qtyMap,
        displayPrice: displayEntry.price,
        displayIsFrenchPrice: displayEntry.isFrenchPrice ?? false,
        displayCondition: displayEntry.condition,
        displayGradeValue: displayEntry.gradeValue,
      };
    });
  }, [sortedEntries]);

  // ── Missing: sorted + filtered ───────────────────────────────────────────
  const filteredMissingCards = useMemo<MissingCard[]>(
    () => applySortFilter(allMissingCards),
    [allMissingCards, search, rarityFilter, sortBy, sortOrder] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Rarity counts (view-dependent, unfiltered by search) ────────────────
  const rarityCounts = useMemo(() => {
    const m = new Map<CardRarity, number>();
    if (viewFilter === "owned") {
      const seen = new Set<string>();
      for (const c of cards) {
        if (!seen.has(c.cardId)) {
          seen.add(c.cardId);
          m.set(c.rarity, (m.get(c.rarity) ?? 0) + 1);
        }
      }
    } else {
      for (const c of allMissingCards) {
        m.set(c.rarity, (m.get(c.rarity) ?? 0) + 1);
      }
    }
    return m;
  }, [cards, allMissingCards, viewFilter]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function switchView(v: ViewFilter) {
    setViewFilter(v);
    setEditMode(false);
    setSelected(new Set());
    setConfirming(false);
    setRarityFilter(null);
    setSearch("");
  }

  function toggleEdit() {
    setEditMode((e) => !e);
    setSelected(new Set());
    setConfirming(false);
    setError(null);
  }

  function toggleCard(cardId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(groupedCards.map((g) => g.cardId)));
  }

  function formatEur(value: number | null | undefined) {
    if (!value) return null;
    return value.toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  async function handleRemove() {
    const toDelete = cards.filter((c) => selected.has(c.cardId));
    if (toDelete.length === 0) return;
    setError(null);
    try {
      const res = await fetch("/api/cards/collection", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: toDelete.map((c) => ({ cardId: c.cardId, version: c.version })),
        }),
      });
      if (!res.ok) throw new Error();
      setEditMode(false);
      setSelected(new Set());
      setConfirming(false);
      startTransition(() => router.refresh());
    } catch {
      setError("Impossible de supprimer. Réessayez.");
    }
  }

  // ── Empty state (no owned cards AND no allCards catalog) ────────────────
  if (cards.length === 0 && !allCards) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-default)] py-16 text-center">
        <p className="text-base font-semibold text-[var(--text-primary)]">Aucune carte possédée</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Ajoutez des cartes depuis la{" "}
          <Link href={`/collection/cartes/${blocSlug}/${serieSlug}`} className="text-blue-400 hover:underline">
            Collection
          </Link>
          .
        </p>
      </div>
    );
  }

  // ── Rarity filter pill shared component ─────────────────────────────────
  const rarityChips = rarityCounts.size > 0 && (
    <div className="flex flex-wrap gap-1.5">
      {(Object.values(CardRarity) as CardRarity[]).filter((r) => rarityCounts.has(r)).map((rarity) => {
        const count  = rarityCounts.get(rarity)!;
        const active = rarityFilter === rarity;
        return (
          <button key={rarity} onClick={() => setRarityFilter(active ? null : rarity)}
            title={CARD_RARITY_LABELS[rarity]}
            className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
              active ? "border-[#E7BA76] bg-[#E7BA76]/20 text-[#E7BA76]"
                : "border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[#E7BA76]/70 hover:text-[#E7BA76]")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={getCardRarityImage(rarity, blocSlug)} alt={CARD_RARITY_LABELS[rarity]}
              className={cn("h-4 w-auto object-contain", active ? "brightness-125" : "brightness-90")}
              style={(rarity === CardRarity.COMMON || rarity === CardRarity.UNCOMMON || rarity === CardRarity.RARE || rarity === CardRarity.NO_RARITY)
                ? { filter: "drop-shadow(0 0 1px rgba(255,255,255,0.9)) drop-shadow(0 0 0.5px rgba(255,255,255,0.9))" }
                : undefined}
            />
            <span>{count}</span>
          </button>
        );
      })}
    </div>
  );

  // ── Number+rarity badge shared snippet ──────────────────────────────────
  function NumberRarityBadge({ number, rarity }: { number: string; rarity: CardRarity }) {
    return (
      <div className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
        <span>{number}</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={getCardRarityImage(rarity, blocSlug)} alt="" className="h-3 w-auto object-contain opacity-90"
          style={
            rarity === CardRarity.COMMON || rarity === CardRarity.UNCOMMON || rarity === CardRarity.RARE || rarity === CardRarity.NO_RARITY
              ? { filter: "drop-shadow(0 0 1px rgba(255,255,255,0.9)) drop-shadow(0 0 0.5px rgba(255,255,255,0.9))" }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div>
      {/* ── View tabs (Possédées / Manquantes) — only when allCards is provided ── */}
      {allCards && (
        <div className="mb-4 flex gap-2">
          {([
            { value: "owned",   label: `Possédées (${ownedCount})` },
            { value: "missing", label: `Manquantes (${missingCount})` },
          ] as { value: ViewFilter; label: string }[]).map((tab) => (
            <button
              key={tab.value}
              onClick={() => switchView(tab.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                viewFilter === tab.value
                  ? "btn-gold text-black"
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Grid size toggle — segmented control */}
      <div className="mb-3 flex items-center rounded-xl bg-[var(--bg-secondary)] p-1">
        {(["small", "medium", "large"] as GridSize[]).map((s) => (
          <button
            key={s}
            onClick={() => changeGridSize(s)}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-xs font-medium transition-all",
              gridSize === s
                ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            {s === "small" ? "Petit" : s === "medium" ? "Moyen" : "Grand"}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* OWNED VIEW                                                          */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {viewFilter === "owned" && (
        <>
          {/* Action bar — edit mode */}
          {editMode ? (
            <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-2.5">
              <div className="flex items-center gap-3">
                <button onClick={toggleEdit} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  <X className="h-5 w-5" />
                </button>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
                </span>
                <button onClick={selectAll} className="text-xs text-blue-400 hover:underline">Tout</button>
              </div>
              <button
                onClick={() => selected.size > 0 && setConfirming(true)}
                disabled={selected.size === 0}
                className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
                Retirer
              </button>
            </div>
          ) : (
            <div className="mb-4 flex justify-end">
              <button onClick={toggleEdit} className="text-xs font-medium text-[#E7BA76] hover:underline">
                Gérer
              </button>
            </div>
          )}

          {/* Confirmation banner */}
          {confirming && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-[var(--bg-card)] px-4 py-3">
              <p className="text-sm text-[var(--text-primary)] mb-2 text-center">
                Retirer {selected.size} carte{selected.size > 1 ? "s" : ""} de votre collection ?
              </p>
              {error && <p className="text-xs text-red-400 text-center mb-2">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => setConfirming(false)}
                  className="flex-1 rounded-lg border border-[var(--border-default)] py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">
                  Annuler
                </button>
                <button onClick={handleRemove} disabled={isPending}
                  className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50">
                  {isPending ? "Suppression…" : "Confirmer"}
                </button>
              </div>
            </div>
          )}

          {/* Search + Sort (owned) */}
          {!editMode && (
            <div className="mb-3 space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nom ou numéro…"
                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[#E7BA76]"
                  />
                </div>
                <div className="relative">
                  <button onClick={() => setShowSort(!showSort)}
                    className="flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] hover:border-[#E7BA76]/70 transition-colors">
                    <ArrowUpDown className="h-4 w-4" />
                    Trier
                  </button>
                  {showSort && (
                    <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] py-1 shadow-xl">
                      {SORT_OPTIONS.map((opt) => (
                        <button key={opt.key}
                          onClick={() => {
                            if (sortBy === opt.key) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                            else { setSortBy(opt.key); setSortOrder(opt.key === "price" ? "desc" : "asc"); }
                            setShowSort(false);
                          }}
                          className={cn("flex w-full items-center justify-between px-3 py-2 text-sm transition-colors",
                            sortBy === opt.key ? "text-[#E7BA76]" : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]")}>
                          {opt.label}
                          {sortBy === opt.key && <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {rarityChips}
            </div>
          )}

          {/* Owned card grid (or empty state) */}
          {groupedCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-default)] py-16 text-center">
              <p className="text-base font-semibold text-[var(--text-primary)]">Aucune carte possédée</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Ajoutez des cartes depuis la{" "}
                <Link href={`/collection/cartes/${blocSlug}/${serieSlug}`} className="text-blue-400 hover:underline">
                  Collection
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className={GRID_CLASS[gridSize]}>
              {groupedCards.map((grp) => {
                const isSelected = selected.has(grp.cardId);
                const cardContent = (
                  <div className="group relative">
                    <div className={cn(
                      "relative aspect-[2.5/3.5] overflow-hidden rounded-lg bg-[var(--bg-secondary)] shadow-sm transition-all",
                      !editMode && "hover:-translate-y-0.5 hover:shadow-md",
                      editMode && isSelected && "ring-2 ring-blue-500 ring-offset-1",
                    )}>
                      {grp.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={grp.imageUrl} alt={getCardImageAlt(grp, serieName)}
                          className={`absolute inset-0 h-full w-full object-cover transition-transform duration-200 ${!editMode ? "group-hover:scale-105" : ""}`}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[var(--text-tertiary)] text-xs">{grp.number}</div>
                      )}
                      {grp.ownedVersions.includes(CardVersion.FIRST_EDITION) && (
                        <FirstEditionStamp size="sm" />
                      )}

                      {/* Version badges — hidden for special cards (single version only).
                          FIRST_EDITION is already signalled by the stamp on the left
                          side of the card, so it's excluded from the right-side stack. */}
                      {(() => {
                        if (grp.isSpecial) return null;
                        const stackVersions = grp.ownedVersions.filter(
                          (v) => v !== CardVersion.FIRST_EDITION,
                        );
                        if (stackVersions.length === 0) return null;
                        return (
                          <div className="absolute bottom-1 right-1 flex flex-col items-end gap-0.5">
                            {[...stackVersions].reverse().map((v) => (
                              <VersionBadgeIcon key={v} version={v} qty={grp.versionQty.get(v)} />
                            ))}
                          </div>
                        );
                      })()}

                      {/* Condition badge — top-right */}
                      {grp.displayCondition === CardCondition.GRADED ? (
                        <span className="absolute top-1.5 right-1.5 rounded bg-amber-400/90 px-1 py-px text-[9px] font-bold leading-none text-black shadow-sm">
                          ⭐{grp.displayGradeValue != null ? grp.displayGradeValue : ""}
                        </span>
                      ) : grp.displayCondition !== CardCondition.NEAR_MINT && CONDITION_SHORT[grp.displayCondition] ? (
                        <span className="absolute top-1.5 right-1.5 rounded bg-black/50 px-1 py-px text-[9px] font-bold leading-none text-white/80 shadow-sm">
                          {CONDITION_SHORT[grp.displayCondition]}
                        </span>
                      ) : null}

                      <NumberRarityBadge number={grp.number} rarity={grp.rarity} />

                      {/* Selection overlay */}
                      {editMode && (
                        <div className={`absolute inset-0 flex items-center justify-center transition-colors ${isSelected ? "bg-blue-500/30" : "bg-black/0"}`}>
                          {isSelected && <CheckSquare className="h-8 w-8 text-white drop-shadow" />}
                        </div>
                      )}
                    </div>
                    <p className="mt-1 truncate text-center text-[10px] text-[var(--text-secondary)]">{grp.name}</p>
                    <p className="truncate text-center text-[9px] text-[var(--text-tertiary)]">
                      {grp.displayPrice != null && grp.displayPrice > 0
                        ? <span className="inline-flex items-center gap-0.5">
                            {grp.displayIsFrenchPrice ? "🇫🇷 " : null}
                            {formatEur(grp.displayPrice)}
                          </span>
                        : "—"}
                    </p>
                  </div>
                );

                if (editMode) {
                  return <button key={grp.cardId} onClick={() => toggleCard(grp.cardId)} className="text-left">{cardContent}</button>;
                }
                return <button key={grp.cardId} onClick={() => setDetailCardId(grp.cardId)} className="group text-left">{cardContent}</button>;
              })}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* MISSING VIEW                                                        */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {viewFilter === "missing" && (
        <>
          {/* Search + Sort (missing) */}
          <div className="mb-3 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nom ou numéro…"
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[#E7BA76]"
                />
              </div>
              <div className="relative">
                <button onClick={() => setShowSort(!showSort)}
                  className="flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] hover:border-[#E7BA76]/70 transition-colors">
                  <ArrowUpDown className="h-4 w-4" />
                  Trier
                </button>
                {showSort && (
                  <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] py-1 shadow-xl">
                    {SORT_OPTIONS.map((opt) => (
                      <button key={opt.key}
                        onClick={() => {
                          if (sortBy === opt.key) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                          else { setSortBy(opt.key); setSortOrder(opt.key === "price" ? "desc" : "asc"); }
                          setShowSort(false);
                        }}
                        className={cn("flex w-full items-center justify-between px-3 py-2 text-sm transition-colors",
                          sortBy === opt.key ? "text-[#E7BA76]" : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]")}>
                        {opt.label}
                        {sortBy === opt.key && <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {rarityChips}
          </div>

          {/* Missing card grid (or empty) */}
          {filteredMissingCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-default)] py-16 text-center">
              <p className="text-base font-semibold text-[var(--text-primary)]">
                {missingCount === 0 ? "Collection complète ! 🎉" : "Aucune carte trouvée"}
              </p>
              {missingCount === 0 && (
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Vous possédez toutes les cartes de cette série.
                </p>
              )}
            </div>
          ) : (
            <div className={GRID_CLASS[gridSize]}>
              {filteredMissingCards.map((c) => (
                <button
                  key={c.cardId}
                  onClick={() => setDetailCardId(c.cardId)}
                  className="group text-left"
                >
                  <div className="group relative">
                    <div className="relative aspect-[2.5/3.5] overflow-hidden rounded-lg bg-[var(--bg-secondary)] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                      {c.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.imageUrl} alt={getCardImageAlt(c, serieName)}
                          className="absolute inset-0 h-full w-full object-cover opacity-40 group-hover:opacity-55 transition-opacity duration-200"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[var(--text-tertiary)] text-xs">{c.number}</div>
                      )}
                      {/* Missing-version badges — only show the versions NOT yet owned
                          (so a partially-owned card surfaces what's still needed) */}
                      {!c.isSpecial && ownedVersionsByCardId.has(c.cardId) && (() => {
                        const owned = ownedVersionsByCardId.get(c.cardId)!;
                        const missing = serieVersions.filter((v) => !owned.has(v));
                        if (missing.length === 0) return null;
                        return (
                          <div className="absolute bottom-1 right-1 flex flex-col items-end gap-0.5">
                            {missing.map((v) => (
                              <div key={v} className="opacity-60">
                                <VersionBadgeIcon version={v} />
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      <NumberRarityBadge number={c.number} rarity={c.rarity} />
                    </div>
                    <p className="mt-1 truncate text-center text-[10px] text-[var(--text-secondary)]">{c.name}</p>
                    <p className="truncate text-center text-[9px] text-[var(--text-tertiary)]">
                      {c.price != null && c.price > 0
                        ? <span className="inline-flex items-center gap-0.5">
                            {c.isFrenchPrice ? "🇫🇷 " : null}
                            {formatEur(c.price)}
                          </span>
                        : "—"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {detailCardId && (
        <Suspense fallback={null}>
          <CardDetailModal
            cardId={detailCardId}
            onClose={() => setDetailCardId(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
