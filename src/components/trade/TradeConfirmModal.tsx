"use client";

import { createPortal } from "react-dom";
import Image from "next/image";
import { useEffect } from "react";
import { X, ArrowLeftRight, Send } from "lucide-react";
import { formatEur, type CardPayload } from "./TradeCalculator";

/**
 * Final-step modal shown after the user taps "Envoyer la demande" on the
 * Trade tab. Displays exactly what the backend will snapshot: selected
 * cards on both sides, their totals, the compensation direction/amount.
 * Once confirmed, the parent fires POST /api/trade-requests.
 */
export function TradeConfirmModal({
  displayName,
  iGive, iReceive,
  giveCents, receiveCents, deltaCents, direction,
  sending,
  onCancel, onConfirm,
}: {
  displayName:  string;
  iGive:        CardPayload[];
  iReceive:     CardPayload[];
  giveCents:    number;
  receiveCents: number;
  deltaCents:   number;
  direction:    "me_to_them" | "them_to_me" | "none";
  sending:      boolean;
  onCancel:     () => void;
  onConfirm:    () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !sending) onCancel(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onCancel, sending]);

  const complementAbs = Math.abs(deltaCents);
  const complementLine =
    direction === "none"
      ? "Échange équilibré, sans complément."
      : direction === "them_to_me"
        ? `${displayName} te verse ${formatEur(complementAbs)}`
        : `Tu verses ${formatEur(complementAbs)} à ${displayName}`;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trade-confirm-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border-t border-[var(--border-default)] bg-[var(--bg-card)] shadow-2xl shadow-black/60 sm:rounded-2xl sm:border"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
          <h2 id="trade-confirm-title" className="text-base font-bold text-[var(--text-primary)]">
            Confirmer la demande d&apos;échange
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={sending}
            className="rounded-lg p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <MiniSection label="Tu donnes" cards={iGive} totalCents={giveCents} />

          <div className="flex items-center justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-secondary)]">
              <ArrowLeftRight className="h-4 w-4 text-[#E7BA76]" />
            </div>
          </div>

          <MiniSection label="Tu reçois" cards={iReceive} totalCents={receiveCents} />

          <div className={`rounded-lg border px-3 py-2.5 text-sm ${direction === "none" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-[#E7BA76]/30 bg-[#E7BA76]/10 text-[#E7BA76]"}`}>
            {complementLine}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex gap-2 border-t border-[var(--border-default)] px-4 py-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={sending}
            className="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={sending}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#F2D58A] via-[#E7BA76] to-[#C99A4F] px-4 py-2.5 text-sm font-semibold text-[#2A1A06] shadow-md shadow-[#E7BA76]/30 transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {sending ? "Envoi…" : "Confirmer et envoyer"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function MiniSection({
  label, cards, totalCents,
}: {
  label: string;
  cards: CardPayload[];
  totalCents: number;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          {label} · {cards.length} carte{cards.length > 1 ? "s" : ""}
        </h3>
        <span className="font-data text-xs font-semibold text-[#E7BA76]">
          {formatEur(totalCents)}
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {cards.map((c) => (
          <div
            key={c.cardId}
            className="relative h-20 w-14 shrink-0 overflow-hidden rounded bg-[var(--bg-secondary)]"
            title={`${c.name} — ${c.number}`}
          >
            {c.imageUrl ? (
              <Image
                src={c.imageUrl}
                alt={c.name}
                fill
                sizes="56px"
                className="object-cover"
                loading="lazy"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[9px] text-[var(--text-tertiary)]">
                {c.number}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
