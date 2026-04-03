"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, X, CheckSquare } from "lucide-react";
import { CARD_RARITY_SYMBOL, CardRarity, CardCondition } from "@/types/card";
import { CardVersion, CARD_VERSION_LABELS } from "@/data/card-versions";

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

interface Props {
  cards: ClasseurCard[];
  blocSlug: string;
  serieSlug: string;
}

export function ClasseurCardGrid({ cards, blocSlug, serieSlug }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editMode, setEditMode]       = useState(false);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [confirming, setConfirming]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  function toggleEdit() {
    setEditMode((e) => !e);
    setSelected(new Set());
    setConfirming(false);
    setError(null);
  }

  function toggleCard(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(cards.map(cardKey)));
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

  // Unique key per UserCard entry (cardId + version)
  function cardKey(c: ClasseurCard) {
    return `${c.cardId}__${c.version}`;
  }

  async function handleRemove() {
    const toDelete = cards.filter((c) => selected.has(cardKey(c)));
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

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-default)] py-16 text-center">
        <p className="text-base font-semibold text-[var(--text-primary)]">Aucune carte possédée</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Ajoutez des cartes depuis la{" "}
          <Link
            href={`/collection/cartes/${blocSlug}/${serieSlug}`}
            className="text-blue-400 hover:underline"
          >
            Collection
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
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
            <button
              onClick={selectAll}
              className="text-xs text-blue-400 hover:underline"
            >
              Tout
            </button>
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
        /* Normal header — Gérer toggle */
        <div className="mb-4 flex justify-end">
          <button
            onClick={toggleEdit}
            className="text-xs font-medium text-[#E7BA76] hover:underline"
          >
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
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-lg border border-[var(--border-default)] py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleRemove}
              disabled={isPending}
              className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {isPending ? "Suppression…" : "Confirmer"}
            </button>
          </div>
        </div>
      )}

      {/* Card grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {cards.map((uc) => {
          const key       = cardKey(uc);
          const isSelected = selected.has(key);

          const cardContent = (
            <div
              className={`rounded-xl border bg-[var(--bg-card)] overflow-hidden transition-colors ${
                editMode
                  ? isSelected
                    ? "border-blue-500"
                    : "border-[var(--border-default)]"
                  : "border-[var(--border-default)] hover:border-[var(--border-focus)]"
              }`}
            >
              {/* Card image */}
              <div className="relative aspect-[2/3] bg-[var(--bg-subtle)]">
                {uc.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={uc.imageUrl}
                    alt={uc.name}
                    className={`absolute inset-0 h-full w-full object-cover transition-transform duration-200 ${
                      !editMode ? "group-hover:scale-105" : ""
                    }`}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[var(--text-tertiary)] text-xs">
                    {uc.number}
                  </div>
                )}

                {/* Version badge */}
                {uc.version !== CardVersion.NORMAL && (
                  <span className="absolute top-1.5 right-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    {uc.version === CardVersion.REVERSE
                      ? "R"
                      : uc.version === CardVersion.REVERSE_POKEBALL
                      ? "P"
                      : "M"}
                  </span>
                )}

                {/* Condition badge — GRADED in gold, others in grey (skip NEAR_MINT default) */}
                {uc.condition === CardCondition.GRADED ? (
                  <span className="absolute bottom-1.5 right-1.5 rounded bg-amber-400/90 px-1 py-px text-[9px] font-bold leading-none text-black shadow-sm">
                    ⭐{uc.gradeValue != null ? uc.gradeValue : ""}
                  </span>
                ) : uc.condition !== CardCondition.NEAR_MINT && CONDITION_SHORT[uc.condition] ? (
                  <span className="absolute bottom-1.5 right-1.5 rounded bg-black/50 px-1 py-px text-[9px] font-bold leading-none text-white/80 shadow-sm">
                    {CONDITION_SHORT[uc.condition]}
                  </span>
                ) : null}

                {/* Selection overlay */}
                {editMode && (
                  <div
                    className={`absolute inset-0 flex items-center justify-center transition-colors ${
                      isSelected ? "bg-blue-500/30" : "bg-black/0"
                    }`}
                  >
                    {isSelected && (
                      <CheckSquare className="h-8 w-8 text-white drop-shadow" />
                    )}
                  </div>
                )}
              </div>

              {/* Card info */}
              <div className="px-2.5 py-2">
                <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                  {uc.name}
                </p>
                <div className="mt-0.5 flex items-center justify-between gap-1">
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {CARD_RARITY_SYMBOL[uc.rarity]} {uc.number}
                  </span>
                  {uc.price !== null && uc.price !== undefined && uc.price > 0 && (
                    <span className="text-[10px] font-bold text-emerald-400">
                      {formatEur(uc.price)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );

          if (editMode) {
            return (
              <button
                key={key}
                onClick={() => toggleCard(key)}
                className="text-left"
              >
                {cardContent}
              </button>
            );
          }

          return (
            <Link key={key} href={`/carte/${uc.cardId}`} className="group">
              {cardContent}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
