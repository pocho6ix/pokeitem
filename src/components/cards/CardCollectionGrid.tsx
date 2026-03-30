"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import Image from "next/image";
import {
  CardRarity,
  CardCondition,
  DoubleAvailability,
  CARD_RARITY_LABELS,
  CARD_RARITY_SYMBOL,
  CARD_RARITY_ORDER,
  CARD_CONDITION_LABELS,
  DOUBLE_AVAILABILITY_LABELS,
  CARD_LANGUAGES,
} from "@/types/card";
import { CardVersion, CARD_VERSION_LABELS, getSerieVersions } from "@/data/card-versions";
import { SERIES } from "@/data/series";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CardRow {
  id: string;
  number: string;
  name: string;
  rarity: CardRarity;
  imageUrl: string | null;
}

export interface OwnedEntry {
  id: string;
  cardId: string;
  quantity: number;
  condition: CardCondition;
  language: string;
  foil: boolean;
  version: CardVersion;
}

export interface DoubleEntry {
  id: string;
  cardId: string;
  quantity: number;
  condition: CardCondition;
  language: string;
  version: CardVersion;
  availability: DoubleAvailability;
  price: number | null;
}

interface Props {
  cards: CardRow[];
  serieSlug: string;
  blocSlug: string;
  initialOwned: OwnedEntry[];
  initialDoubles: DoubleEntry[];
  isAuthenticated: boolean;
}

type SortKey    = "number" | "name" | "rarity";
type SortOrder  = "asc" | "desc";
type ViewFilter = "all" | "owned" | "missing";
type ActiveModal = null | "add-collection" | "add-doubles" | "sort" | "options";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Nested map: cardId → version → entry */
type OwnedVersionMap  = Map<string, Map<CardVersion, OwnedEntry>>;
type DoubleVersionMap = Map<string, Map<CardVersion, DoubleEntry>>;

function buildOwnedMap(entries: OwnedEntry[]): OwnedVersionMap {
  const m: OwnedVersionMap = new Map();
  for (const e of entries) {
    if (!m.has(e.cardId)) m.set(e.cardId, new Map());
    m.get(e.cardId)!.set(e.version, e);
  }
  return m;
}

function buildDoubleMap(entries: DoubleEntry[]): DoubleVersionMap {
  const m: DoubleVersionMap = new Map();
  for (const e of entries) {
    if (!m.has(e.cardId)) m.set(e.cardId, new Map());
    m.get(e.cardId)!.set(e.version, e);
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
          <button onClick={onClose} className="rounded-full p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <p className="mb-3 text-sm font-medium text-[var(--text-secondary)]">Trier par</p>
        <div className="mb-5 space-y-2">
          {OPTS.map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-center gap-3">
              <input type="radio" name="sortBy" value={opt.value} checked={localBy === opt.value}
                onChange={() => setLocalBy(opt.value)} className="accent-blue-500" />
              <span className="text-sm text-[var(--text-primary)]">{opt.label}</span>
            </label>
          ))}
        </div>
        <p className="mb-3 text-sm font-medium text-[var(--text-secondary)]">Ordre</p>
        <div className="mb-6 space-y-2">
          {(["asc", "desc"] as const).map((o) => (
            <label key={o} className="flex cursor-pointer items-center gap-3">
              <input type="radio" name="sortOrder" value={o} checked={localOrder === o}
                onChange={() => setLocalOrder(o)} className="accent-blue-500" />
              <span className="text-sm text-[var(--text-primary)]">{o === "asc" ? "Croissant" : "Décroissant"}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setLocalBy("number"); setLocalOrder("asc"); }}
            className="flex-1 rounded-xl border border-[var(--border-default)] py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]">
            Réinitialiser
          </button>
          <button onClick={() => { onApply(localBy, localOrder); onClose(); }}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
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
          <button onClick={onClose} className="rounded-full p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Affichage</p>
        <label className="mb-5 flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={showTransparency} onChange={onToggleTransparency} className="mt-0.5 accent-blue-500" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Transparence des cartes manquantes</p>
            <p className="text-xs text-[var(--text-secondary)]">Rendre les cartes non possédées plus transparentes</p>
          </div>
        </label>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Ajouts</p>
        <div className="mb-5">
          <button onClick={() => { onAddAll(); onClose(); }}
            className="flex w-full items-center gap-2 rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]">
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

function AddToCollectionModal({
  selectedCards, availableVersions, ownedMap, onSubmit, onClose, isPending,
}: {
  selectedCards: CardRow[];
  availableVersions: CardVersion[];
  ownedMap: OwnedVersionMap;
  onSubmit: (data: { quantity: number; condition: CardCondition; language: string; version: CardVersion; foil: boolean }) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [quantity,  setQuantity]  = useState(1);
  const [condition, setCondition] = useState<CardCondition>(CardCondition.NEAR_MINT);
  const [language,  setLanguage]  = useState("FR");
  const [version,   setVersion]   = useState<CardVersion>(availableVersions[0]);
  const [foil,      setFoil]      = useState(false);

  // Pre-fill quantity from existing owned entry when a single card is selected
  const existingQty = selectedCards.length === 1
    ? ownedMap.get(selectedCards[0].id)?.get(version)?.quantity ?? 0
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-[var(--bg-card)] p-6 shadow-xl sm:rounded-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Ajouter à ma collection</h2>
          <button onClick={onClose} className="rounded-full p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <p className="mb-5 text-sm text-[var(--text-secondary)]">
          {selectedCards.length === 1 ? selectedCards[0].name : `${selectedCards.length} cartes sélectionnées`}
          {existingQty > 0 && <span className="ml-2 text-blue-500">· déjà {existingQty} en collection</span>}
        </p>

        {/* Version */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Version</label>
          <div className="flex flex-wrap gap-2">
            {availableVersions.map((v) => {
              const currentQty = selectedCards.length === 1
                ? ownedMap.get(selectedCards[0].id)?.get(v)?.quantity ?? 0
                : 0;
              return (
                <button
                  key={v}
                  onClick={() => setVersion(v)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                    version === v
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                      : "border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:border-blue-400"
                  )}
                >
                  <span>{CARD_VERSION_LABELS[v]}</span>
                  {currentQty > 0 && (
                    <span className="rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white">×{currentQty}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          {/* Quantité */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Quantité</label>
            <div className="flex items-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)]">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2 text-lg font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">−</button>
              <input type="number" min={1} max={999} value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(999, Number(e.target.value))))}
                className="w-full bg-transparent py-2 text-center text-sm font-semibold text-[var(--text-primary)] outline-none" />
              <button onClick={() => setQuantity(Math.min(999, quantity + 1))} className="px-3 py-2 text-lg font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">+</button>
            </div>
          </div>

          {/* Langue */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Langue</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500">
              {CARD_LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>

        {/* État */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">État</label>
          <select value={condition} onChange={(e) => setCondition(e.target.value as CardCondition)}
            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500">
            {(Object.entries(CARD_CONDITION_LABELS) as [CardCondition, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* Foil */}
        <label className="mb-5 flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border-default)] px-4 py-3">
          <input type="checkbox" checked={foil} onChange={(e) => setFoil(e.target.checked)} className="accent-blue-500" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Carte holographique / foil</p>
            <p className="text-xs text-[var(--text-secondary)]">Cocher si la carte est brillante</p>
          </div>
        </label>

        <button onClick={() => onSubmit({ quantity, condition, language, version, foil })}
          disabled={isPending}
          className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {isPending ? "Enregistrement…" : "Ajouter à ma collection"}
        </button>
      </div>
    </div>
  );
}

// ─── Sub-component: AddToDoublesModal ─────────────────────────────────────────

function AddToDoublesModal({
  selectedCards, availableVersions, onSubmit, onClose, isPending,
}: {
  selectedCards: CardRow[];
  availableVersions: CardVersion[];
  onSubmit: (data: { quantity: number; condition: CardCondition; language: string; version: CardVersion; availability: DoubleAvailability; price: number | null }) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [quantity,     setQuantity]     = useState(1);
  const [condition,    setCondition]    = useState<CardCondition>(CardCondition.NEAR_MINT);
  const [language,     setLanguage]     = useState("FR");
  const [version,      setVersion]      = useState<CardVersion>(availableVersions[0]);
  const [availability, setAvailability] = useState<DoubleAvailability>(DoubleAvailability.TRADE);
  const [price,        setPrice]        = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-[var(--bg-card)] p-6 shadow-xl sm:rounded-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Ajouter aux doubles</h2>
          <button onClick={onClose} className="rounded-full p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <p className="mb-5 text-sm text-[var(--text-secondary)]">
          {selectedCards.length === 1 ? selectedCards[0].name : `${selectedCards.length} cartes sélectionnées`}
        </p>

        {/* Version */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Version</label>
          <div className="flex flex-wrap gap-2">
            {availableVersions.map((v) => (
              <button key={v} onClick={() => setVersion(v)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                  version === v
                    ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    : "border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:border-amber-400"
                )}>
                {CARD_VERSION_LABELS[v]}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Quantité</label>
            <div className="flex items-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)]">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2 text-lg font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">−</button>
              <input type="number" min={1} max={999} value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(999, Number(e.target.value))))}
                className="w-full bg-transparent py-2 text-center text-sm font-semibold text-[var(--text-primary)] outline-none" />
              <button onClick={() => setQuantity(Math.min(999, quantity + 1))} className="px-3 py-2 text-lg font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">+</button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Langue</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500">
              {CARD_LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">État</label>
          <select value={condition} onChange={(e) => setCondition(e.target.value as CardCondition)}
            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500">
            {(Object.entries(CARD_CONDITION_LABELS) as [CardCondition, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <div className="mb-5 rounded-xl border border-[var(--border-default)] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Doubles à vendre / échanger</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Dispo</label>
              <select value={availability} onChange={(e) => setAvailability(e.target.value as DoubleAvailability)}
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500">
                {(Object.entries(DOUBLE_AVAILABILITY_LABELS) as [DoubleAvailability, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Prix (€)</label>
              <input type="number" min={0} step={0.01} placeholder="Optionnel" value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 placeholder:text-[var(--text-tertiary)]" />
            </div>
          </div>
        </div>

        <button onClick={() => onSubmit({ quantity, condition, language, version, availability, price: price ? parseFloat(price) : null })}
          disabled={isPending}
          className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {isPending ? "Enregistrement…" : "Ajouter aux doubles"}
        </button>
      </div>
    </div>
  );
}

// ─── Version badge helper ─────────────────────────────────────────────────────

const VERSION_BADGE: Partial<Record<CardVersion, { label: string; cls: string }>> = {
  [CardVersion.REVERSE]:            { label: "R",  cls: "bg-violet-600" },
  [CardVersion.REVERSE_POKEBALL]:   { label: "RP", cls: "bg-purple-600" },
  [CardVersion.REVERSE_MASTERBALL]: { label: "RM", cls: "bg-amber-500" },
};

// ─── Main component ───────────────────────────────────────────────────────────

export function CardCollectionGrid({
  cards, serieSlug, blocSlug, initialOwned, initialDoubles, isAuthenticated,
}: Props) {

  // ── Resolve available versions for this serie ────────────────────────────
  const availableVersions = useMemo(() => getSerieVersions(serieSlug, blocSlug), [serieSlug, blocSlug]);

  // ── State ─────────────────────────────────────────────────────────────────
  const [selectedIds,      setSelectedIds]      = useState<Set<string>>(new Set());
  const [search,           setSearch]           = useState("");
  const [rarityFilter,     setRarityFilter]     = useState<CardRarity | null>(null);
  const [versionFilter,    setVersionFilter]    = useState<CardVersion | null>(null);
  const [viewFilter,       setViewFilter]       = useState<ViewFilter>("all");
  const [sortBy,           setSortBy]           = useState<SortKey>("number");
  const [sortOrder,        setSortOrder]        = useState<SortOrder>("asc");
  const [showTransparency, setShowTransparency] = useState(true);
  const [activeModal,      setActiveModal]      = useState<ActiveModal>(null);
  const [isPending,        startTransition]     = useTransition();

  const [ownedMap,   setOwnedMap]   = useState<OwnedVersionMap>(() => buildOwnedMap(initialOwned));
  const [doublesMap, setDoublesMap] = useState<DoubleVersionMap>(() => buildDoubleMap(initialDoubles));

  // ── Derived data ──────────────────────────────────────────────────────────

  const rarityCounts = useMemo(() => {
    const m = new Map<CardRarity, number>();
    for (const c of cards) m.set(c.rarity, (m.get(c.rarity) ?? 0) + 1);
    return m;
  }, [cards]);

  const filteredCards = useMemo(() => {
    let result = cards;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q) || c.number.toLowerCase().includes(q));
    }
    if (rarityFilter)  result = result.filter((c) => c.rarity === rarityFilter);
    if (versionFilter) result = result.filter((c) => ownedMap.get(c.id)?.has(versionFilter));
    if (viewFilter === "owned")   result = result.filter((c) =>  ownedMap.has(c.id));
    if (viewFilter === "missing") result = result.filter((c) => !ownedMap.has(c.id));

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "number") cmp = a.number.localeCompare(b.number, undefined, { numeric: true });
      if (sortBy === "name")   cmp = a.name.localeCompare(b.name, "fr");
      if (sortBy === "rarity") cmp = CARD_RARITY_ORDER[a.rarity] - CARD_RARITY_ORDER[b.rarity];
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [cards, search, rarityFilter, versionFilter, viewFilter, sortBy, sortOrder, ownedMap]);

  const ownedCount   = ownedMap.size;
  const missingCount = cards.length - ownedCount;
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

  // ── Collection actions ────────────────────────────────────────────────────

  const handleAddToCollection = useCallback(
    (data: { quantity: number; condition: CardCondition; language: string; version: CardVersion; foil: boolean }) => {
      if (!isAuthenticated) return;

      const optimistic = cloneOwnedMap(ownedMap);
      for (const card of selectedCards) {
        const entry: OwnedEntry = { id: `tmp-${card.id}-${data.version}`, cardId: card.id, ...data };
        if (!optimistic.has(card.id)) optimistic.set(card.id, new Map());
        optimistic.get(card.id)!.set(data.version, entry);
      }
      setOwnedMap(optimistic);
      setActiveModal(null);
      setSelectedIds(new Set());

      startTransition(async () => {
        try {
          const res = await fetch("/api/cards/collection", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cards: selectedCards.map((c) => ({ cardId: c.id, ...data })) }),
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
                  m.get(r.cardId)!.set(r.version as CardVersion, { id: r.record.id, cardId: r.cardId, ...data });
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

  const handleAddToDoubles = useCallback(
    (data: { quantity: number; condition: CardCondition; language: string; version: CardVersion; availability: DoubleAvailability; price: number | null }) => {
      if (!isAuthenticated) return;

      const optimistic = cloneDoubleMap(doublesMap);
      for (const card of selectedCards) {
        const entry: DoubleEntry = { id: `tmp-${card.id}-${data.version}`, cardId: card.id, ...data };
        if (!optimistic.has(card.id)) optimistic.set(card.id, new Map());
        optimistic.get(card.id)!.set(data.version, entry);
      }
      setDoublesMap(optimistic);
      setActiveModal(null);
      setSelectedIds(new Set());

      startTransition(async () => {
        try {
          const res = await fetch("/api/cards/doubles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cards: selectedCards.map((c) => ({ cardId: c.id, ...data })) }),
          });
          if (!res.ok) {
            setDoublesMap(buildDoubleMap(initialDoubles));
          } else {
            const { results } = await res.json();
            setDoublesMap((prev) => {
              const m = cloneDoubleMap(prev);
              for (const r of results) {
                if (r.record) {
                  if (!m.has(r.cardId)) m.set(r.cardId, new Map());
                  m.get(r.cardId)!.set(r.version as CardVersion, { id: r.record.id, cardId: r.cardId, ...data });
                }
              }
              return m;
            });
          }
        } catch {
          setDoublesMap(buildDoubleMap(initialDoubles));
        }
      });
    },
    [selectedCards, doublesMap, initialDoubles, isAuthenticated]
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
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-800 dark:bg-blue-950/30">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-blue-500"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          <span className="text-blue-700 dark:text-blue-300">
            <a href="/connexion" className="font-semibold underline">Connectez-vous</a> pour gérer votre collection et vos doubles.
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
          <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
            <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
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
              viewFilter === tab.value ? "bg-blue-600 text-white" : "bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]")}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" placeholder="Nom ou numéro…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] py-2 pl-8 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 placeholder:text-[var(--text-tertiary)]" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
        <button onClick={() => setActiveModal("sort")}
          className="flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:border-blue-400 hover:text-blue-600">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M7 12h10M11 18h2"/></svg>
          Trier
        </button>
        {isAuthenticated && (
          <button onClick={() => setActiveModal("options")}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:border-blue-400 hover:text-blue-600">
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
                className={cn("flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                  active ? "border-blue-500 bg-blue-500 text-white"
                    : "border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:border-blue-400 hover:text-blue-600")}>
                <span>{CARD_RARITY_SYMBOL[rarity]}</span>
                <span>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Version filter chips — only show if the serie has more than just NORMAL+REVERSE */}
      {availableVersions.length > 2 && isAuthenticated && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <span className="self-center text-xs text-[var(--text-tertiary)]">Version :</span>
          {availableVersions.map((v) => {
            const active = versionFilter === v;
            return (
              <button key={v} onClick={() => setVersionFilter(active ? null : v)}
                className={cn("rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  active ? "border-blue-500 bg-blue-500 text-white"
                    : "border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:border-blue-400 hover:text-blue-600")}>
                {CARD_VERSION_LABELS[v]}
              </button>
            );
          })}
        </div>
      )}

      {/* Selection banner */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 dark:border-blue-700 dark:bg-blue-950/30">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {selectedIds.size} carte{selectedIds.size > 1 ? "s" : ""} sélectionnée{selectedIds.size > 1 ? "s" : ""}
          </span>
          <button onClick={deselectAll} className="text-xs text-blue-600 underline dark:text-blue-400">Tout désélectionner</button>
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
            const isSelected = selectedIds.has(card.id);
            const ownedTotal = totalOwned(ownedMap, card.id);
            const isOwned    = ownedTotal > 0;
            const hasDouble  = doublesMap.has(card.id);
            const dim        = showTransparency && isAuthenticated && !isOwned;
            // Collect owned version badges for display
            const ownedVersions = ownedMap.get(card.id) ? Array.from(ownedMap.get(card.id)!.keys()) : [];

            return (
              <div key={card.id} onClick={() => isAuthenticated && toggleSelect(card.id)}
                className={cn("group relative", isAuthenticated ? "cursor-pointer" : "cursor-default")}
                title={`${card.number} · ${card.name}`}>
                <div className={cn(
                  "relative aspect-[2.5/3.5] overflow-hidden rounded-lg bg-[var(--bg-subtle)] shadow-sm transition-all",
                  isAuthenticated && "group-hover:-translate-y-0.5 group-hover:shadow-md",
                  dim && "opacity-40",
                  isSelected && "ring-2 ring-blue-500 ring-offset-1"
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

                  {/* Number + rarity badge */}
                  <div className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
                    <span>{card.number}</span>
                    <span className="opacity-80">{CARD_RARITY_SYMBOL[card.rarity]}</span>
                  </div>

                  {/* Owned total badge */}
                  {isOwned && (
                    <div className="absolute right-1 top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white shadow">
                      ×{ownedTotal}
                    </div>
                  )}

                  {/* Version badges for owned versions (R / RP / RM) */}
                  {ownedVersions.length > 0 && (
                    <div className="absolute bottom-5 left-1 flex flex-col gap-0.5">
                      {ownedVersions
                        .filter((v) => VERSION_BADGE[v])
                        .map((v) => (
                          <span key={v} className={`rounded px-0.5 py-px text-[7px] font-bold text-white ${VERSION_BADGE[v]!.cls}`}>
                            {VERSION_BADGE[v]!.label}
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Double badge */}
                  {hasDouble && (
                    <div className="absolute left-1 top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white shadow">D</div>
                  )}

                  {/* Selection overlay */}
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card name */}
                <p className="mt-1 truncate text-center text-[10px] text-[var(--text-secondary)]">{card.name}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky action bar */}
      {isAuthenticated && (
        <div className={cn("fixed bottom-16 left-0 right-0 z-40 transition-all duration-200 sm:bottom-0",
          selectedIds.size > 0 ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none")}>
          <div className="mx-auto max-w-7xl px-4 pb-4 sm:pb-6">
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--bg-card)] p-3 shadow-2xl border border-[var(--border-default)]">
              <button onClick={selectAll} title="Tout sélectionner"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">
                {selectedIds.size} carte{selectedIds.size > 1 ? "s" : ""} sélectionnée{selectedIds.size > 1 ? "s" : ""}
              </span>
              <button onClick={handleRemoveSelected} title="Retirer de ma collection"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
              </button>
              <button onClick={() => setActiveModal("add-doubles")}
                className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="8" height="10" x="2" y="7" rx="1"/><path d="M22 7H12M22 12H12M22 17H12"/></svg>
                Doubles
              </button>
              <button onClick={() => setActiveModal("add-collection")}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Collection
              </button>
              <button onClick={deselectAll}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]">
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
          availableVersions={availableVersions}
          ownedMap={ownedMap}
          onSubmit={handleAddToCollection}
          onClose={() => setActiveModal(null)}
          isPending={isPending} />
      )}
      {activeModal === "add-doubles" && selectedCards.length > 0 && (
        <AddToDoublesModal
          selectedCards={selectedCards}
          availableVersions={availableVersions}
          onSubmit={handleAddToDoubles}
          onClose={() => setActiveModal(null)}
          isPending={isPending} />
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

function cloneDoubleMap(src: DoubleVersionMap): DoubleVersionMap {
  const m: DoubleVersionMap = new Map();
  for (const [k, v] of src) m.set(k, new Map(v));
  return m;
}
