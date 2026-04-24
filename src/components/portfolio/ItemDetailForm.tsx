"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { ItemImage } from "@/components/shared/ItemImage";
import { Badge } from "@/components/ui/Badge";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ITEM_TYPE_LABELS, ITEM_TYPE_COLORS } from "@/lib/constants";
import { fetchApi } from "@/lib/api";

const MAX_PRICE  = 1_000_000;
const MAX_QTY    = 10_000;

/**
 * Parse a user-facing number string that may contain €, spaces, and a comma
 * decimal separator. Returns null on empty / invalid input (never throws).
 */
function parseEuro(raw: string): number | null {
  if (!raw.trim()) return null;
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatPrice(v: number | null): string {
  if (v == null) return "";
  return v.toFixed(2).replace(".", ",");
}

export interface ItemDetailFormProps {
  portfolioItem: {
    id:                    string;
    quantity:              number;
    purchasePrice:         number | null;
    currentPrice:          number | null;
    currentPriceUpdatedAt: string | null;
    item: {
      id:          string;
      name:        string;
      slug:        string;
      type:        string;
      imageUrl:    string | null;
      retailPrice: number | null;
      serieName:   string | null;
      blocName:    string | null;
    };
  };
}

export function ItemDetailForm({ portfolioItem }: ItemDetailFormProps) {
  const router = useRouter();
  const { item } = portfolioItem;

  // ── Local form state ────────────────────────────────────────────────
  const [quantity, setQuantity] = useState<number>(portfolioItem.quantity);
  // Strings so the user can type freely (empty, partial, comma etc.).
  const [purchasePriceStr, setPurchasePriceStr] = useState<string>(
    formatPrice(portfolioItem.purchasePrice),
  );
  // Pre-fill with the user's personal valuation if set, otherwise fall back to
  // the catalogue's retail price so the owner sees a reasonable starting point.
  const [currentPriceStr, setCurrentPriceStr]   = useState<string>(
    formatPrice(portfolioItem.currentPrice ?? portfolioItem.item.retailPrice),
  );

  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const purchaseScroll = useRef<HTMLDivElement>(null);

  // ── Derived values (live) ───────────────────────────────────────────
  const derived = useMemo(() => {
    const purchasePrice = parseEuro(purchasePriceStr);
    // Fallback chain mirrors `resolveItemPrice` on the server.
    const parsedCurrent  = parseEuro(currentPriceStr);
    const effectiveUnit  = parsedCurrent ?? item.retailPrice ?? 0;

    const invested  = (purchasePrice ?? 0) * quantity;
    const valuation = effectiveUnit * quantity;
    const pnl       = valuation - invested;
    const pnlPct    = invested > 0 ? (pnl / invested) * 100 : null;

    return {
      purchasePrice,
      parsedCurrent,
      effectiveUnit,
      invested,
      valuation,
      pnl,
      pnlPct,
    };
  }, [purchasePriceStr, currentPriceStr, quantity, item.retailPrice]);

  // ── Actions ─────────────────────────────────────────────────────────
  async function handleSave() {
    setError(null);

    // Client-side validation mirrors the API ceilings.
    const purchase = parseEuro(purchasePriceStr);
    const current  = parseEuro(currentPriceStr);
    if (purchase != null && (purchase < 0 || purchase > MAX_PRICE)) {
      setError("Prix d'achat invalide (0 – 1 000 000 €).");
      return;
    }
    if (current != null && (current < 0 || current > MAX_PRICE)) {
      setError("Prix actuel invalide (0 – 1 000 000 €).");
      return;
    }
    if (quantity < 1 || quantity > MAX_QTY) {
      setError("Quantité invalide.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetchApi(`/api/portfolio/${portfolioItem.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          quantity,
          purchasePrice: purchase, // null → keep existing if unchanged
          currentPrice:  current,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Erreur inconnue");
      }
      // Also log a history point for the per-user chart (only if currentPrice
      // was set to a meaningful number). Silently ignore failure — the primary
      // update already succeeded.
      if (current != null) {
        fetchApi("/api/portfolio/valuation", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ itemId: item.id, price: current }),
        }).catch(() => {});
      }
      router.push("/portfolio/items");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      const res = await fetchApi(`/api/portfolio/${portfolioItem.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Erreur inconnue");
      }
      router.push("/portfolio/items");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const plPositive = (derived.pnl ?? 0) >= 0;

  return (
    <div className="mx-auto max-w-xl px-4 pb-32 pt-4 sm:px-6 lg:px-8" ref={purchaseScroll}>
      {/* Back link */}
      <Link
        href="/portfolio/items"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Mes items
      </Link>

      {/* Header: image + name + meta */}
      <div className="flex gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)]">
        <ItemImage
          src={item.imageUrl}
          slug={item.slug}
          alt={item.name}
          size="md"
          bgClassName="bg-[var(--bg-secondary)]"
          className="h-24 w-24 shrink-0 rounded-lg border border-[var(--border-default)]"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold leading-tight text-[var(--text-primary)]">
            {item.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
            <Badge className={`${ITEM_TYPE_COLORS[item.type]} px-1.5 py-0 text-[10px]`}>
              {ITEM_TYPE_LABELS[item.type]}
            </Badge>
            {item.serieName && <span>{item.serieName}</span>}
            {item.blocName && <span className="text-[var(--text-tertiary)]">· {item.blocName}</span>}
          </div>
        </div>
      </div>

      {/* Investment block */}
      <section className="mt-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Mon investissement
        </h2>

        {/* Quantity stepper */}
        <div className="mb-4 flex items-center justify-between">
          <label className="text-sm text-[var(--text-secondary)]">Quantité</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40"
              aria-label="Diminuer la quantité"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="min-w-[3rem] text-center font-data text-base font-semibold tabular-nums text-[var(--text-primary)]">
              {quantity}
            </div>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(MAX_QTY, q + 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
              aria-label="Augmenter la quantité"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Purchase price */}
        <div className="mb-4">
          <label
            htmlFor="purchase-price"
            className="mb-1 block text-sm text-[var(--text-secondary)]"
          >
            Prix d&apos;achat unitaire
          </label>
          <div className="relative">
            <input
              id="purchase-price"
              type="text"
              inputMode="decimal"
              placeholder="—"
              value={purchasePriceStr}
              onChange={(e) => setPurchasePriceStr(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 pr-8 text-right font-data text-base text-[var(--text-primary)] transition-colors focus:border-[#E7BA76] focus:outline-none focus:ring-1 focus:ring-[#E7BA76]/40"
              aria-label="Prix d'achat unitaire en euros"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-secondary)]">
              €
            </span>
          </div>
        </div>

        {/* Current price */}
        <div>
          <label
            htmlFor="current-price"
            className="mb-1 block text-sm text-[var(--text-secondary)]"
          >
            Prix actuel unitaire
          </label>
          <div className="relative">
            <input
              id="current-price"
              type="text"
              inputMode="decimal"
              placeholder={item.retailPrice != null ? formatPrice(item.retailPrice) : "—"}
              value={currentPriceStr}
              onChange={(e) => setCurrentPriceStr(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 pr-8 text-right font-data text-base text-[var(--text-primary)] transition-colors focus:border-[#E7BA76] focus:outline-none focus:ring-1 focus:ring-[#E7BA76]/40"
              aria-label="Prix actuel unitaire en euros"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-secondary)]">
              €
            </span>
          </div>
          {derived.parsedCurrent == null && item.retailPrice != null && (
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
              Valeur par défaut : prix de vente conseillé ({formatPrice(item.retailPrice)}&nbsp;€)
            </p>
          )}
        </div>
      </section>

      {/* Live calculations */}
      <section className="mt-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Bilan
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-[var(--text-secondary)]">Total investi</dt>
            <dd className="font-data tabular-nums text-[var(--text-primary)]">
              {formatPrice(derived.invested)}&nbsp;€
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[var(--text-secondary)]">Valorisation actuelle</dt>
            <dd className="font-data tabular-nums text-[var(--text-primary)]">
              {formatPrice(derived.valuation)}&nbsp;€
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border-default)] pt-2">
            <dt className="font-medium text-[var(--text-primary)]">+/−</dt>
            <dd
              className={`font-data font-semibold tabular-nums ${
                plPositive ? "text-emerald-500 dark:text-emerald-400" : "text-red-500"
              }`}
            >
              {plPositive ? "+" : ""}
              {formatPrice(derived.pnl)}&nbsp;€
              <span className="ml-2 text-xs opacity-80">
                (
                {derived.pnlPct == null
                  ? "—"
                  : `${plPositive ? "+" : ""}${derived.pnlPct.toFixed(1)}\u00a0%`}
                )
              </span>
            </dd>
          </div>
        </dl>
      </section>

      {/* Error banner */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-gradient-to-r from-[#F2D58A] via-[#E7BA76] to-[#C99A4F] px-6 text-sm font-semibold text-[#2A1A06] shadow-md shadow-[#E7BA76]/30 transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-6 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/20"
        >
          <Trash2 className="h-4 w-4" />
          Retirer de ma collection
        </button>
      </div>

      {/* Confirm delete sheet */}
      <BottomSheet
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Confirmer la suppression"
      >
        <div className="px-3 py-2">
          <p className="text-sm text-[var(--text-primary)]">
            Supprimer <span className="font-semibold">{item.name}</span> de votre collection ?
          </p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            Cette action est irréversible.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-500 px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Suppression…" : "Supprimer"}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => setConfirmDelete(false)}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--border-default)] px-6 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
            >
              Annuler
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
