"use client";

import { useState, useMemo, useCallback, useTransition, lazy, Suspense } from "react";
import Image from "next/image";
import {
  CardRarity,
  CardCondition,
  CARD_RARITY_LABELS,
  CARD_RARITY_IMAGE,
  CARD_RARITY_ORDER,
  CARD_CONDITION_LABELS,
  CARD_LANGUAGES,
} from "@/types/card";
import { CardVersion, getSerieVersions, VERSION_SORT_ORDER } from "@/data/card-versions";
import { SERIES } from "@/data/series";
import { POKEMON_TYPES, POKEMON_TYPE_MAP, type TypeConfig } from "@/lib/pokemon-types";
import { useSubscription } from "@/hooks/useSubscription";
import { usePaywall } from "@/hooks/usePaywall";
import { PaywallModal } from "@/components/subscription/PaywallModal";

const CardDetailModal = lazy(() =>
  import("./CardDetailModal").then((m) => ({ default: m.CardDetailModal }))
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CardRow {
  id: string;
  number: string;
  name: string;
  rarity: CardRarity;
  imageUrl: string | null;
  price?: number | null;
  priceReverse?: number | null;
  isSpecial?: boolean;
  types?: string[];
  category?: string | null;
  trainerType?: string | null;
  energyType?: string | null;
}

export interface OwnedEntry {
  id: string;
  cardId: string;
  quantity: number;
  condition: CardCondition;
  language: string;
  foil: boolean;
  version: CardVersion;
  gradeValue?: number | null;
}

interface Props {
  cards: CardRow[];
  serieSlug: string;
  blocSlug: string;
  initialOwned: OwnedEntry[];
  isAuthenticated: boolean;
}

type SortKey    = "number" | "name" | "rarity";
type SortOrder  = "asc" | "desc";
type ViewFilter = "all" | "owned" | "missing";
type ActiveModal = null | "add-collection" | "sort" | "options";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Nested map: cardId → version → entry */
type OwnedVersionMap = Map<string, Map<CardVersion, OwnedEntry>>;

function buildOwnedMap(entries: OwnedEntry[]): OwnedVersionMap {
  const m: OwnedVersionMap = new Map();
  for (const e of entries) {
    // Normalize: version may arrive as a raw string from Prisma — coerce to CardVersion
    const version = (e.version ?? CardVersion.NORMAL) as CardVersion;
    if (!m.has(e.cardId)) m.set(e.cardId, new Map());
    m.get(e.cardId)!.set(version, { ...e, version });
  }
  return m;
}

function totalOwned(ownedMap: OwnedVersionMap, cardId: string): number {
  const versions = ownedMap.get(cardId);
  if (!versions) return 0;
  return Array.from(versions.values()).reduce((s, e) => s + e.quantity, 0);
}

// ─── Sub-component: SortModal ─────────────────────────────────────────────────

function SortModal({
  sortBy, sortOrder, onApply, onClose,
}: {
  sortBy: SortKey; sortOrder: SortOrder;
  onApply: (by: SortKey, order: SortOrder) => void; onClose: () => void;
}) {
  const [localBy, setLocalBy]       = useState<SortKey>(sortBy);
  const [localOrder, setLocalOrder] = useState<SortOrder>(sortOrder);

  const OPTS: { value: SortKey; label: string }[] = [
    { value: "number", label: "Numéro de carte" },
    { value: "name",   label: "Nom" },
    { value: "rarity", label: "Rareté" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-card)] p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Options de tri</h2>
          <button onClick={onClose} className="rounded-full p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <p className="mb-3 text-sm font-medium text-[var(--text-secondary)]">Trier par</p>
        <div className="mb-5 space-y-2">
          {OPTS.map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-center gap-3">
              <input type="radio" name="sortBy" value={opt.value} checked={localBy === opt.value}
                onChange={() => setLocalBy(opt.value)} className="accent-[#E7BA76]" />
              <span className="text-sm text-[var(--text-primary)]">{opt.label}</span>
            </label>
          ))}
        </div>
        <p className="mb-3 text-sm font-medium text-[var(--text-secondary)]">Ordre</p>
        <div className="mb-6 space-y-2">
          {(["asc", "desc"] as const).map((o) => (
            <label key={o} className="flex cursor-pointer items-center gap-3">
              <input type="radio" name="sortOrder" value={o} checked={localOrder === o}
                onChange={() => setLocalOrder(o)} className="accent-[#E7BA76]" />
              <span className="text-sm text-[var(--text-primary)]">{o === "asc" ? "Croissant" : "Décroissant"}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setLocalBy("number"); setLocalOrder("asc"); }}
            className="flex-1 rounded-xl border border-[var(--border-default)] py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
            Réinitialiser
          </button>
          <button onClick={() => { onApply(localBy, localOrder); onClose(); }}
            className="flex-1 rounded-xl bg-[#E7BA76] py-2.5 text-sm font-medium text-black hover:bg-[#d4a660]">
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component: OptionsModal ──────────────────────────────────────────────

function OptionsModal({
  showTransparency, onToggleTransparency, onAddAll, onRemoveAll, onClose,
}: {
  showTransparency: boolean; onToggleTransparency: () => void;
  onAddAll: () => void; onRemoveAll: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-card)] p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Options</h2>
          <button onClick={onClose} className="rounded-full p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Affichage</p>
        <label className="mb-5 flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={showTransparency} onChange={onToggleTransparency} className="mt-0.5 accent-[#E7BA76]" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Transparence des cartes manquantes</p>
            <p className="text-xs text-[var(--text-secondary)]">Rendre les cartes non possédées plus transparentes</p>
          </div>
        </label>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Ajouts</p>
        <div className="mb-5">
          <button onClick={() => { onAddAll(); onClose(); }}
            className="flex w-full items-center gap-2 rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Ajouter toute la série à ma collection
          </button>
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-red-500">Suppressions</p>
        <button
          onClick={() => { if (confirm("Supprimer toutes vos cartes de cette série ?")) { onRemoveAll(); onClose(); } }}
          className="flex w-full items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          Supprimer toute ma collection pour cette série
        </button>
      </div>
    </div>
  );
}

// ─── Sub-component: AddToCollectionModal ─────────────────────────────────────

const CONDITION_PILLS: { value: CardCondition; label: string }[] = [
  { value: CardCondition.POOR,         label: "Mauvais état" },
  { value: CardCondition.LIGHT_PLAYED, label: "Played" },
  { value: CardCondition.GOOD,         label: "Bon état" },
  { value: CardCondition.NEAR_MINT,    label: "Near Mint" },
  { value: CardCondition.GRADED,       label: "Gradée ⭐" },
];

const GRADE_VALUES = [5, 6, 7, 8, 9, 9.5, 10];

const MODAL_VERSION_LABELS: Record<CardVersion, string> = {
  [CardVersion.NORMAL]:             "Commune",
  [CardVersion.REVERSE]:            "Reverse",
  [CardVersion.REVERSE_POKEBALL]:   "Pokéball",
  [CardVersion.REVERSE_MASTERBALL]: "Masterball",
};

/** Rarity-aware version labels:
 *  - COMMON / UNCOMMON → Commune / Reverse
 *  - RARE             → Holo / Reverse Holo
 *  - ≥ DOUBLE_RARE    → (no version picker, locked to NORMAL)
 */
function getVersionLabel(v: CardVersion, rarity?: CardRarity): string {
  if (rarity === CardRarity.RARE) {
    if (v === CardVersion.NORMAL)  return "Holo";
    if (v === CardVersion.REVERSE) return "Reverse Holo";
  }
  return MODAL_VERSION_LABELS[v];
}

type PriceMode = "packed" | "current" | "manual";

function AddToCollectionModal({
  selectedCards, availableVersions, ownedMap, onSubmit, onClose, isPending,
}: {
  selectedCards: CardRow[];
  availableVersions: CardVersion[];
  ownedMap: OwnedVersionMap;
  onSubmit: (data: { quantity: number; condition: CardCondition; language: string; versions: CardVersion[]; foil: boolean; priceMode: PriceMode; manualPrice?: number; gradeValue?: number | null }) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [quantity,         setQuantity]         = useState(1);
  const [condition,        setCondition]        = useState<CardCondition>(CardCondition.NEAR_MINT);
  const [language,         setLanguage]         = useState("FR");
  const [selectedVersions, setSelectedVersions] = useState<Set<CardVersion>>(new Set([availableVersions[0]]));
  const [priceMode,        setPriceMode]        = useState<PriceMode>("packed");
  const [manualPrice,      setManualPrice]      = useState("");
  const [gradeValue,       setGradeValue]       = useState<number | null>(null);

  function toggleVersion(v: CardVersion) {
    setSelectedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(v)) {
        if (next.size > 1) next.delete(v); // keep at least one
      } else {
        next.add(v);
      }
      return next;
    });
  }

  // Current price preview (single card + single version only)
  const singleCard    = selectedCards.length === 1 ? selectedCards[0] : null;
  const singleVersion = selectedVersions.size === 1 ? Array.from(selectedVersions)[0] : null;
  const currentPrice  = singleCard && singleVersion
    ? (singleVersion === CardVersion.NORMAL ? (singleCard.price ?? null) : (singleCard.priceReverse ?? singleCard.price ?? null))
    : null;

  const versionsArray = Array.from(selectedVersions);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-[var(--bg-card)] shadow-2xl sm:rounded-3xl flex flex-col max-h-[calc(100dvh-4rem)] sm:max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-[var(--border-default)]" />
        </div>

        <div className="overflow-y-auto px-6 pt-3 pb-24 sm:pb-8">
          {/* Header */}
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Ajouter à ma collection</h2>
              <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                {selectedCards.length === 1 ? selectedCards[0].name : `${selectedCards.length} cartes`}
              </p>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Version checkboxes — multi-select (hidden for special cards) */}
          {availableVersions.length > 1 && !selectedCards.every((c) => c.isSpecial) && (
            <div className="mb-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Version</p>
              <div className={cn("grid gap-1.5", availableVersions.length <= 2 ? "grid-cols-2" : "grid-cols-4")}>
                {availableVersions.map((v) => {
                  const qty       = selectedCards.length === 1 ? ownedMap.get(selectedCards[0].id)?.get(v)?.quantity ?? 0 : 0;
                  const isChecked = selectedVersions.has(v);
                  const label     = selectedCards.length === 1 ? getVersionLabel(v, selectedCards[0].rarity) : MODAL_VERSION_LABELS[v];
                  return (
                    <button key={v} onClick={() => toggleVersion(v)}
                      className={cn(
                        "relative flex flex-col items-center rounded-xl border px-1 py-2 text-xs font-medium transition-all",
                        isChecked
                          ? "border-[#E7BA76] bg-[#E7BA76] text-black shadow-sm"
                          : "border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[#E7BA76]/70"
                      )}>
                      {label}
                      {qty > 0 && <span className={cn("mt-0.5 rounded-full px-1 text-[9px] font-bold", isChecked ? "bg-black/20 text-black" : "bg-[#E7BA76] text-black")}>×{qty}</span>}
                    </button>
                  );
                })}
              </div>
              {selectedVersions.size > 1 && (
                <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">{selectedVersions.size} versions sélectionnées</p>
              )}
            </div>
          )}
          {selectedCards.length === 1 && selectedCards[0].isSpecial && (
            <p className="mb-2 text-xs text-[var(--text-tertiary)] italic">
              Carte spéciale — version unique
            </p>
          )}

          {/* Quantity stepper */}
          <div className="mb-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Quantité</p>
            <div className="flex items-center justify-between rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-xl font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">−</button>
              <span className="text-lg font-bold text-[var(--text-primary)]">{quantity}</span>
              <button onClick={() => setQuantity(Math.min(99, quantity + 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-xl font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">+</button>
            </div>
          </div>

          {/* Condition pills */}
          <div className="mb-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">État de la carte</p>
            <div className="grid grid-cols-2 gap-2">
              {CONDITION_PILLS.map((c) => (
                <button key={c.value} onClick={() => { setCondition(c.value); if (c.value !== CardCondition.GRADED) setGradeValue(null); }}
                  className={cn(
                    "rounded-2xl border py-2.5 text-sm font-medium transition-all",
                    condition === c.value
                      ? "border-[#E7BA76] bg-[#E7BA76] text-black shadow-sm"
                      : "border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[#E7BA76]/70"
                  )}>
                  {c.label}
                </button>
              ))}
            </div>
            {/* Grade value chips — shown only when GRADED is selected */}
            {condition === CardCondition.GRADED && (
              <div className="mt-2">
                <p className="mb-1.5 text-xs text-[var(--text-tertiary)]">Note PSA / BGS</p>
                <div className="flex flex-wrap gap-1.5">
                  {GRADE_VALUES.map((g) => (
                    <button key={g} onClick={() => setGradeValue(gradeValue === g ? null : g)}
                      className={cn(
                        "rounded-xl border px-3 py-1.5 text-xs font-bold transition-all",
                        gradeValue === g
                          ? "border-amber-400 bg-amber-400 text-black shadow-sm"
                          : "border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-amber-400/70"
                      )}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Language */}
          <div className="mb-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Langue</p>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#E7BA76]">
              {CARD_LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>

          {/* Purchase price */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Prix d&apos;achat</p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setPriceMode("packed")}
                className={cn(
                  "rounded-2xl border py-2.5 text-sm font-medium transition-all",
                  priceMode === "packed"
                    ? "border-[#E7BA76] bg-[#E7BA76] text-black shadow-sm"
                    : "border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[#E7BA76]/70"
                )}>
                Packée
                <span className={cn("block text-[10px] font-normal mt-0.5", priceMode === "packed" ? "text-black/60" : "text-[var(--text-tertiary)]")}>0,70&nbsp;€</span>
              </button>
              <button onClick={() => setPriceMode("current")}
                className={cn(
                  "rounded-2xl border py-2.5 text-sm font-medium transition-all",
                  priceMode === "current"
                    ? "border-[#E7BA76] bg-[#E7BA76] text-black shadow-sm"
                    : "border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[#E7BA76]/70"
                )}>
                Cote actuelle
                <span className={cn("block text-[10px] font-normal mt-0.5", priceMode === "current" ? "text-black/60" : "text-[var(--text-tertiary)]")}>
                  {currentPrice != null ? `${currentPrice.toFixed(2)}\u00a0€` : "—"}
                </span>
              </button>
              <button onClick={() => setPriceMode("manual")}
                className={cn(
                  "rounded-2xl border py-2.5 text-sm font-medium transition-all",
                  priceMode === "manual"
                    ? "border-[#E7BA76] bg-[#E7BA76] text-black shadow-sm"
                    : "border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[#E7BA76]/70"
                )}>
                Manuel
                <span className={cn("block text-[10px] font-normal mt-0.5", priceMode === "manual" ? "text-black/60" : "text-[var(--text-tertiary)]")}>Saisir</span>
              </button>
            </div>
            {priceMode === "manual" && (
              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2.5">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">€</span>
              </div>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={() => onSubmit({ quantity, condition, language, versions: versionsArray, foil: false, priceMode, manualPrice: manualPrice ? parseFloat(manualPrice) : undefined, gradeValue })}
            disabled={isPending}
            className="w-full rounded-2xl bg-[#E7BA76] py-4 text-base font-bold text-black hover:bg-[#d4a660] active:scale-[0.98] disabled:opacity-60 transition-all shadow-lg shadow-[#E7BA76]/30">
            {isPending ? "Enregistrement…" : "Ajouter à ma collection"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Version badge helper ─────────────────────────────────────────────────────

const VERSION_BADGE: Record<CardVersion, { label: string; cls: string }> = {
  [CardVersion.NORMAL]:             { label: "C", cls: "bg-[#E7BA76] text-black" },
  [CardVersion.REVERSE]:            { label: "R", cls: "bg-violet-600 text-white" },
  [CardVersion.REVERSE_POKEBALL]:   { label: "P", cls: "bg-purple-600 text-white" },
  [CardVersion.REVERSE_MASTERBALL]: { label: "M", cls: "bg-amber-500 text-white" },
};

/** Rarity-aware version badge: RARE cards show H (Holo) instead of C (Commune) */
function getVersionBadge(v: CardVersion, rarity?: CardRarity): { label: string; cls: string } {
  if (rarity === CardRarity.RARE) {
    if (v === CardVersion.NORMAL)  return { label: "H", cls: "bg-yellow-500 text-black" };
    if (v === CardVersion.REVERSE) return { label: "RH", cls: "bg-violet-600 text-white" };
  }
  return VERSION_BADGE[v];
}

/** Versions applicable for a card (special = NORMAL only) */
function getCardVersions(card: CardRow, serieVersions: CardVersion[]): CardVersion[] {
  return card.isSpecial ? [CardVersion.NORMAL] : serieVersions;
}

/** Missing versions for a card */
function getMissingVersions(card: CardRow, owned: OwnedVersionMap, serieVersions: CardVersion[]): CardVersion[] {
  const applicable = getCardVersions(card, serieVersions);
  const ownedCard  = owned.get(card.id);
  return applicable.filter((v) => !ownedCard?.has(v));
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CardCollectionGrid({
  cards, serieSlug, blocSlug, initialOwned, isAuthenticated,
}: Props) {

  // ── Resolve available versions for this serie ────────────────────────────
  const availableVersions = useMemo(() => getSerieVersions(serieSlug, blocSlug), [serieSlug, blocSlug]);

  // ── Subscription / paywall ────────────────────────────────────────────────
  const { canAddCard, usage } = useSubscription();
  const { paywallState, showPaywall, closePaywall } = usePaywall();

  // ── State ─────────────────────────────────────────────────────────────────
  const [selectedIds,      setSelectedIds]      = useState<Set<string>>(new Set());
  const [search,           setSearch]           = useState("");
  const [rarityFilter,     setRarityFilter]     = useState<CardRarity | null>(null);
  const [viewFilter,       setViewFilter]       = useState<ViewFilter>("all");
  const [sortBy,           setSortBy]           = useState<SortKey>("number");
  const [sortOrder,        setSortOrder]        = useState<SortOrder>("asc");
  const [showTransparency, setShowTransparency] = useState(true);
  const [activeModal,      setActiveModal]      = useState<ActiveModal>(null);
  const [isPending,        startTransition]     = useTransition();
  const [typeFilter,       setTypeFilter]       = useState<Set<string>>(new Set());

  const [ownedMap, setOwnedMap] = useState<OwnedVersionMap>(() => buildOwnedMap(initialOwned));
  const [detailCardId, setDetailCardId] = useState<string | null>(null);

  // ── Derived data ──────────────────────────────────────────────────────────

  const rarityCounts = useMemo(() => {
    const m = new Map<CardRarity, number>();
    for (const c of cards) m.set(c.rarity, (m.get(c.rarity) ?? 0) + 1);
    return m;
  }, [cards]);

  /** Counts how many cards match each TypeConfig filter key */
  const typeCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cards) {
      // Pokemon energy types
      if (c.types) for (const t of c.types) m.set(t, (m.get(t) ?? 0) + 1);
      // Trainer subtypes
      if (c.trainerType) m.set(c.trainerType, (m.get(c.trainerType) ?? 0) + 1);
      // Energy subtypes
      if (c.energyType) m.set(c.energyType, (m.get(c.energyType) ?? 0) + 1);
    }
    return m;
  }, [cards]);

  function toggleType(key: string) {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  /** Check if a card matches ANY of the selected type filters (OR logic) */
  function cardMatchesTypeFilter(c: CardRow, selectedKeys: Set<string>): boolean {
    if (selectedKeys.size === 0) return true;
    for (const key of selectedKeys) {
      const cfg = POKEMON_TYPE_MAP[key];
      if (!cfg) continue;
      if (cfg.matchField === "types" && c.types?.includes(cfg.matchValue)) return true;
      if (cfg.matchField === "trainerType" && c.trainerType === cfg.matchValue) return true;
      if (cfg.matchField === "energyType" && c.energyType === cfg.matchValue) return true;
    }
    return false;
  }

  const filteredCards = useMemo(() => {
    let result = cards;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q) || c.number.toLowerCase().includes(q));
    }
    if (rarityFilter)  result = result.filter((c) => c.rarity === rarityFilter);
    if (typeFilter.size > 0) result = result.filter((c) => cardMatchesTypeFilter(c, typeFilter));
    if (viewFilter === "owned")   result = result.filter((c) => ownedMap.has(c.id));
    // "missing" = at least one applicable version is not owned
    if (viewFilter === "missing") result = result.filter((c) => getMissingVersions(c, ownedMap, availableVersions).length > 0);

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "number") cmp = a.number.localeCompare(b.number, undefined, { numeric: true });
      if (sortBy === "name")   cmp = a.name.localeCompare(b.name, "fr");
      if (sortBy === "rarity") cmp = CARD_RARITY_ORDER[a.rarity] - CARD_RARITY_ORDER[b.rarity];
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [cards, search, rarityFilter, typeFilter, viewFilter, sortBy, sortOrder, ownedMap, availableVersions]);

  const ownedCount   = useMemo(() => ownedMap.size, [ownedMap]);
  // Cards where at least one applicable version is missing
  const missingCount = useMemo(
    () => cards.filter((c) => getMissingVersions(c, ownedMap, availableVersions).length > 0).length,
    [cards, ownedMap, availableVersions]
  );
  const progressPct  = cards.length > 0 ? Math.round((ownedCount / cards.length) * 100) : 0;

  // ── Selection ─────────────────────────────────────────────────────────────

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll   = () => setSelectedIds(new Set(filteredCards.map((c) => c.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const selectedCards = useMemo(() => cards.filter((c) => selectedIds.has(c.id)), [cards, selectedIds]);

  // Versions disponibles pour le modal — si toutes les cartes sélectionnées sont spéciales → NORMAL uniquement
  const modalVersions = useMemo(() => {
    if (selectedCards.length > 0 && selectedCards.every(c => c.isSpecial)) {
      return [CardVersion.NORMAL]
    }
    return availableVersions
  }, [selectedCards, availableVersions]);

  // ── Collection actions ────────────────────────────────────────────────────

  const handleAddToCollection = useCallback(
    (data: { quantity: number; condition: CardCondition; language: string; versions: CardVersion[]; foil: boolean; priceMode: PriceMode; manualPrice?: number; gradeValue?: number | null }) => {
      if (!isAuthenticated) return;

      const { priceMode, manualPrice, versions, gradeValue, ...rest } = data;

      const getPurchasePrice = (card: CardRow, version: CardVersion): number | null => {
        if (priceMode === "packed") return 0.70;
        if (priceMode === "manual") return manualPrice ?? null;
        return version === CardVersion.NORMAL ? (card.price ?? null) : (card.priceReverse ?? card.price ?? null);
      };

      // Build (card, version) pairs — special cards are NORMAL only
      const pairs: { card: CardRow; version: CardVersion }[] = [];
      for (const card of selectedCards) {
        const applicableVersions = card.isSpecial ? [CardVersion.NORMAL] : versions;
        for (const version of applicableVersions) {
          pairs.push({ card, version });
        }
      }
      if (pairs.length === 0) return;

      const optimistic = cloneOwnedMap(ownedMap);
      for (const { card, version } of pairs) {
        const entry: OwnedEntry = { id: `tmp-${card.id}-${version}`, cardId: card.id, ...rest, version, gradeValue };
        if (!optimistic.has(card.id)) optimistic.set(card.id, new Map());
        optimistic.get(card.id)!.set(version, entry);
      }
      setOwnedMap(optimistic);
      setActiveModal(null);
      setSelectedIds(new Set());

      startTransition(async () => {
        try {
          const res = await fetch("/api/cards/collection", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cards: pairs.map(({ card, version }) => ({
                cardId: card.id, ...rest, version,
                purchasePrice: getPurchasePrice(card, version),
                ...(gradeValue != null ? { gradeValue } : {}),
              })),
            }),
          });
          if (!res.ok) {
            setOwnedMap(buildOwnedMap(initialOwned));
            alert("Erreur lors de l'ajout. Veuillez réessayer.");
          } else {
            const { results } = await res.json();
            setOwnedMap((prev) => {
              const m = cloneOwnedMap(prev);
              for (const r of results) {
                if (r.record) {
                  if (!m.has(r.cardId)) m.set(r.cardId, new Map());
                  m.get(r.cardId)!.set(r.version as CardVersion, { id: r.record.id, cardId: r.cardId, ...rest, version: r.version as CardVersion, gradeValue: r.record.gradeValue });
                }
              }
              return m;
            });
          }
        } catch {
          setOwnedMap(buildOwnedMap(initialOwned));
        }
      });
    },
    [selectedCards, ownedMap, initialOwned, isAuthenticated]
  );

  const handleRemoveSelected = useCallback(() => {
    if (!isAuthenticated || selectedIds.size === 0) return;
    const optimistic = cloneOwnedMap(ownedMap);
    for (const id of selectedIds) optimistic.delete(id);
    setOwnedMap(optimistic);
    setSelectedIds(new Set());

    startTransition(async () => {
      try {
        const res = await fetch("/api/cards/collection", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries: Array.from(selectedIds).map((cardId) => ({ cardId })) }),
        });
        if (!res.ok) setOwnedMap(buildOwnedMap(initialOwned));
      } catch {
        setOwnedMap(buildOwnedMap(initialOwned));
      }
    });
  }, [selectedIds, ownedMap, initialOwned, isAuthenticated]);

  const handleAddAllToCollection = useCallback(() => {
    if (!isAuthenticated) return;
    const missing = cards.filter((c) => !ownedMap.has(c.id));
    if (missing.length === 0) return;
    const optimistic = cloneOwnedMap(ownedMap);
    for (const c of missing) {
      const entry: OwnedEntry = { id: `tmp-${c.id}`, cardId: c.id, quantity: 1, condition: CardCondition.NEAR_MINT, language: "FR", foil: false, version: CardVersion.NORMAL };
      optimistic.set(c.id, new Map([[CardVersion.NORMAL, entry]]));
    }
    setOwnedMap(optimistic);

    startTransition(async () => {
      try {
        const res = await fetch("/api/cards/collection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cards: missing.map((c) => ({ cardId: c.id, quantity: 1, condition: "NEAR_MINT", language: "FR", version: "NORMAL", foil: false })) }),
        });
        if (!res.ok) setOwnedMap(buildOwnedMap(initialOwned));
      } catch {
        setOwnedMap(buildOwnedMap(initialOwned));
      }
    });
  }, [cards, ownedMap, initialOwned, isAuthenticated]);

  const handleRemoveAllFromCollection = useCallback(() => {
    if (!isAuthenticated) return;
    const ownedCardIds = Array.from(ownedMap.keys());
    if (ownedCardIds.length === 0) return;
    setOwnedMap(new Map());

    startTransition(async () => {
      try {
        const res = await fetch("/api/cards/collection", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries: ownedCardIds.map((cardId) => ({ cardId })) }),
        });
        if (!res.ok) setOwnedMap(buildOwnedMap(initialOwned));
      } catch {
        setOwnedMap(buildOwnedMap(initialOwned));
      }
    });
  }, [ownedMap, initialOwned, isAuthenticated]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative pb-24">

      {/* Auth banner */}
      {!isAuthenticated && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#E7BA76]/30 bg-[#E7BA76]/10 px-4 py-3 text-sm dark:border-[#E7BA76]/30 dark:bg-[#E7BA76]/10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[#E7BA76]"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          <span className="text-[#1B2E6B] dark:text-[#E7BA76]">
            <a href="/connexion" className="font-semibold underline">Connectez-vous</a> pour gérer votre collection.
          </span>
        </div>
      )}

      {/* Progress bar */}
      {isAuthenticated && cards.length > 0 && (
        <div className="mb-5">
          <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>{ownedCount} / {cards.length} cartes possédées</span>
            <span className="font-semibold text-[var(--text-primary)]">{progressPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
            <div className="h-full rounded-full bg-[#E7BA76] transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* View filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {([
          { value: "all",     label: `Toutes (${cards.length})` },
          { value: "owned",   label: `Possédées (${ownedCount})` },
          { value: "missing", label: `Manquantes (${missingCount})` },
        ] as { value: ViewFilter; label: string }[]).map((tab) => (
          <button key={tab.value} onClick={() => setViewFilter(tab.value)}
            className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              viewFilter === tab.value ? "bg-[#E7BA76] text-black" : "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]")}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" placeholder="Nom ou numéro…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] py-2 pl-8 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#E7BA76] placeholder:text-[var(--text-tertiary)]" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
        <button onClick={() => setActiveModal("sort")}
          className="flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[#E7BA76]/70 hover:text-[#E7BA76]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M7 12h10M11 18h2"/></svg>
          Trier
        </button>
        {isAuthenticated && (
          <button onClick={() => setActiveModal("options")}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[#E7BA76]/70 hover:text-[#E7BA76]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
            Options
          </button>
        )}
      </div>

      {/* Rarity filter chips */}
      {rarityCounts.size > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
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
                <img
                  src={CARD_RARITY_IMAGE[rarity]}
                  alt={CARD_RARITY_LABELS[rarity]}
                  className={cn("h-4 w-auto object-contain", active ? "brightness-125" : "brightness-90")}
                />
                <span>{count}</span>
              </button>
            );
          })}
        </div>
      )}


      {/* Type filter chips (pokemon types + trainer subtypes + energy subtypes) */}
      {typeCounts.size > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {POKEMON_TYPES.filter((t) => typeCounts.has(t.key)).map((t) => {
            const active = typeFilter.has(t.key);
            return (
              <button key={t.key} onClick={() => toggleType(t.key)}
                title={t.label}
                className={cn("flex h-8 w-8 items-center justify-center rounded-full border transition-all",
                  active ? "border-white bg-white/15 ring-1 ring-white/40"
                    : "border-[var(--border-default)] bg-transparent opacity-50 hover:opacity-80")}>
                {t.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={t.image} alt={t.label} className="h-5 w-5 object-contain" />
                ) : (
                  <span className={cn("text-[9px] font-bold leading-none", active ? "text-white" : "text-gray-300")}>
                    {t.abbreviation}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Selection banner */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2.5">
          <span className="text-sm font-medium text-green-400">
            {selectedIds.size} carte{selectedIds.size > 1 ? "s" : ""} sélectionnée{selectedIds.size > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-3">
            <button onClick={selectAll} className="text-xs text-[#E7BA76] underline">Tout sélectionner</button>
            <button onClick={deselectAll} className="text-xs text-[var(--text-tertiary)] underline">Tout désélectionner</button>
          </div>
        </div>
      )}

      {/* Card grid */}
      {filteredCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-semibold text-[var(--text-primary)]">Aucune carte trouvée</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Essayez de modifier vos filtres.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
          {filteredCards.map((card) => {
            const isSelected    = selectedIds.has(card.id);
            const ownedTotal    = totalOwned(ownedMap, card.id);
            const isOwned       = ownedTotal > 0;
            const dim           = showTransparency && isAuthenticated && !isOwned;
            // Collect owned version badges for display — sorted C→R→P→M
            const ownedVersions = ownedMap.get(card.id)
              ? Array.from(ownedMap.get(card.id)!.keys()).sort((a, b) => VERSION_SORT_ORDER[a] - VERSION_SORT_ORDER[b])
              : [];
            // Missing versions — shown as dimmed badges when card is partially owned
            const cardMissingVersions = isOwned
              ? getMissingVersions(card, ownedMap, availableVersions)
              : [];

            return (
              <div key={card.id} onClick={() => isAuthenticated && toggleSelect(card.id)}
                className={cn("group relative", isAuthenticated ? "cursor-pointer" : "cursor-default")}
                title={`${card.number} · ${card.name}`}>
                <div className={cn(
                  "relative aspect-[2.5/3.5] overflow-hidden rounded-lg bg-[var(--bg-secondary)] shadow-sm transition-all",
                  isAuthenticated && "group-hover:-translate-y-0.5 group-hover:shadow-md",
                  dim && "opacity-40",
                  isSelected && "ring-2 ring-green-400 ring-offset-1"
                )}>
                  {card.imageUrl ? (
                    <Image src={card.imageUrl} alt={`${card.name} — ${card.number}`} fill
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 12.5vw"
                      className="object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
                      <span className="text-xs font-bold text-[var(--text-secondary)]">{card.number}</span>
                      <span className="text-[10px] leading-tight text-[var(--text-tertiary)]">{card.name}</span>
                    </div>
                  )}

                  {/* Detail button — top left */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDetailCardId(card.id); }}
                    className="absolute top-1 left-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-black/70"
                    title="Voir les détails"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  </button>

                  {/* Number + rarity badge — bottom left */}
                  <div className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
                    <span>{card.number}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={CARD_RARITY_IMAGE[card.rarity]} alt="" className="h-3 w-auto object-contain opacity-90" />
                  </div>

                  {/* Version pills (owned + missing) — bottom right, stacked (hidden for special cards) */}
                  {!card.isSpecial && (ownedVersions.length > 0 || cardMissingVersions.length > 0) && (
                    <div className="absolute bottom-1 right-1 flex flex-col items-end gap-0.5">
                      {ownedVersions.map((v) => {
                        const qty = ownedMap.get(card.id)!.get(v)!.quantity;
                        const b   = getVersionBadge(v, card.rarity);
                        return (
                          <span key={v} className={`rounded px-1 py-px text-[8px] font-bold leading-none shadow-sm ${b.cls}`}>
                            {b.label}{qty > 1 ? `×${qty}` : ""}
                          </span>
                        );
                      })}
                      {cardMissingVersions.map((v) => {
                        const b = getVersionBadge(v, card.rarity);
                        return (
                          <span key={`missing-${v}`} className={`rounded px-1 py-px text-[8px] font-bold leading-none opacity-40 ring-1 ring-inset ring-white/40 ${b.cls}`}>
                            {b.label}?
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Selection overlay */}
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-green-400/25">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-400 text-black shadow">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card name + price */}
                <p className="mt-1 truncate text-center text-[10px] text-[var(--text-secondary)]">{card.name}</p>
                <p className="truncate text-center text-[9px] text-[var(--text-tertiary)]">
                  {card.price != null ? `${card.price.toFixed(2)}\u00a0€` : "–\u00a0€"}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky action bar */}
      {isAuthenticated && (
        <div className={cn("fixed bottom-16 left-0 right-0 z-[60] transition-all duration-200 sm:bottom-0",
          selectedIds.size > 0 ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none")}>
          <div className="mx-auto max-w-7xl px-4 pb-4 sm:pb-6">
            <div className="flex items-center gap-2 rounded-2xl bg-[var(--bg-card)] p-3 shadow-2xl border border-[var(--border-default)]">
              <button onClick={selectAll} title="Tout sélectionner"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[#E7BA76]/10 hover:text-[#E7BA76]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">
                {selectedIds.size} carte{selectedIds.size > 1 ? "s" : ""}
              </span>
              {selectedIds.size === 1 && (
                <button onClick={() => setDetailCardId(Array.from(selectedIds)[0])}
                  className="flex items-center gap-1 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[#E7BA76]/70 hover:text-[#E7BA76]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  Détail
                </button>
              )}
              <button onClick={() => {
                if (!canAddCard) {
                  showPaywall('CARD_LIMIT_REACHED', usage.cards.current, usage.cards.limit ?? 100);
                  return;
                }
                setActiveModal("add-collection");
              }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E7BA76] text-black hover:bg-[#d4a660]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              </button>
              <button onClick={handleRemoveSelected} title="Retirer de ma collection"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
              </button>
              <button onClick={deselectAll}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {activeModal === "sort" && (
        <SortModal sortBy={sortBy} sortOrder={sortOrder}
          onApply={(by, order) => { setSortBy(by); setSortOrder(order); }}
          onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "options" && (
        <OptionsModal showTransparency={showTransparency}
          onToggleTransparency={() => setShowTransparency((v) => !v)}
          onAddAll={handleAddAllToCollection}
          onRemoveAll={handleRemoveAllFromCollection}
          onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "add-collection" && selectedCards.length > 0 && (
        <AddToCollectionModal
          selectedCards={selectedCards}
          availableVersions={modalVersions}
          ownedMap={ownedMap}
          onSubmit={handleAddToCollection}
          onClose={() => setActiveModal(null)}
          isPending={isPending} />
      )}
      <PaywallModal
        isOpen={paywallState.isOpen}
        reason={paywallState.reason}
        current={paywallState.current}
        limit={paywallState.limit}
        onClose={closePaywall}
      />

      {/* Card detail modal (lazy loaded) */}
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

// ─── Map clone helpers (avoid mutating state directly) ────────────────────────

function cloneOwnedMap(src: OwnedVersionMap): OwnedVersionMap {
  const m: OwnedVersionMap = new Map();
  for (const [k, v] of src) m.set(k, new Map(v));
  return m;
}

