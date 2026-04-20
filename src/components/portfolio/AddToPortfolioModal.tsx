"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-context";
import { X, Minus, Plus } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { ITEM_TYPE_LABELS } from "@/lib/constants";
import { ItemImage } from "@/components/shared/ItemImage";
import { fetchApi } from "@/lib/api";

const TYPE_SLUG: Record<string, string> = {
  BOOSTER: "booster", DUOPACK: "duopack", BLISTER: "blister",
  MINI_TIN: "mini-tin", POKEBALL_TIN: "pokeball-tin", BUNDLE: "bundle",
  BOX_SET: "box-set", ETB: "etb", BOOSTER_BOX: "booster-box",
  UPC: "upc", TIN: "tin", THEME_DECK: "theme-deck", TRAINER_KIT: "trainer-kit",
};

interface AddToPortfolioModalProps {
  item: {
    id: string;
    name: string;
    type: string;
    imageUrl?: string | null;
    currentPrice?: number | null;
    priceTrend?: number | null;
    retailPrice?: number | null;
    serie?: { name: string; abbreviation?: string | null };
    serieSlug?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddToPortfolioModal({
  item,
  isOpen,
  onClose,
  onSuccess,
}: AddToPortfolioModalProps) {
  const { data: session } = useSession();
  const marketPrice = item.currentPrice ?? item.priceTrend ?? 0;
  const retailPrice = item.retailPrice ?? 0;

  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState(
    retailPrice || marketPrice || 0
  );
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const pricePerUnit = quantity > 0 ? purchasePrice / quantity : 0;

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetchApi("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id || undefined,
          quantity,
          purchasePrice,
          purchaseDate,
          notes: notes || undefined,
          // Fallback for items not yet in DB
          serieSlug: item.serieSlug,
          itemType: item.type,
          itemName: item.name,
          retailPrice: item.retailPrice,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'ajout");
      }

      setSuccess(true);
      onSuccess?.();
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setQuantity(1);
        setPurchasePrice(retailPrice || marketPrice || 0);
        setNotes("");
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  if (!session) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Ajouter au portfolio</h2>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-[var(--bg-tertiary)]">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-[var(--text-secondary)] mb-4">
            Connectez-vous pour ajouter des items à votre portfolio.
          </p>
          <a
            href="/connexion"
            className="block w-full rounded-xl btn-gold px-4 py-3 text-center font-medium text-black"
          >
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-default)] p-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Ajouter au portfolio
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <X className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Item info */}
          <div className="flex items-start gap-4">
            <ItemImage
              src={item.imageUrl}
              slug={item.serieSlug ? `${item.serieSlug}-${TYPE_SLUG[item.type] || item.type.toLowerCase()}` : undefined}
              alt={item.name}
              size="md"
              className="h-16 w-16 shrink-0 rounded-xl"
            />
            <div className="min-w-0">
              <h3 className="font-semibold text-[var(--text-primary)] leading-tight">
                {item.name}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                {ITEM_TYPE_LABELS[item.type] ?? item.type}
                {item.serie && ` — ${item.serie.name}`}
                {item.serie?.abbreviation && ` (${item.serie.abbreviation})`}
              </p>
            </div>
          </div>

          {/* Market info */}
          <div className="flex gap-3 text-sm">
            {marketPrice > 0 && (
              <div className="flex-1 rounded-lg bg-[var(--bg-secondary)] px-3 py-2">
                <span className="text-[var(--text-tertiary)]">Marché</span>
                <p className="font-data font-semibold text-[var(--text-primary)]">
                  {formatPrice(marketPrice)}
                </p>
              </div>
            )}
            {retailPrice > 0 && (
              <div className="flex-1 rounded-lg bg-[var(--bg-secondary)] px-3 py-2">
                <span className="text-[var(--text-tertiary)]">Retail</span>
                <p className="font-data font-semibold text-[var(--text-primary)]">
                  {formatPrice(retailPrice)}
                </p>
              </div>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)] block mb-2">
              Quantité
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-10 w-20 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-center font-data font-semibold text-[var(--text-primary)]"
              />
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Purchase price */}
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)] block mb-2">
              Prix d&apos;achat total
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                className="h-11 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 pr-10 font-data text-[var(--text-primary)]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)]">
                &euro;
              </span>
            </div>
            {/* Quick fill buttons */}
            <div className="mt-2 flex gap-2">
              {retailPrice > 0 && (
                <button
                  type="button"
                  onClick={() => setPurchasePrice(retailPrice * quantity)}
                  className="rounded-md bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Retail {formatPrice(retailPrice * quantity)}
                </button>
              )}
              {marketPrice > 0 && (
                <button
                  type="button"
                  onClick={() => setPurchasePrice(marketPrice * quantity)}
                  className="rounded-md bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Marché {formatPrice(marketPrice * quantity)}
                </button>
              )}
            </div>
            {quantity > 1 && (
              <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
                Prix unitaire : {formatPrice(pricePerUnit)}
              </p>
            )}
          </div>

          {/* Purchase date */}
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)] block mb-2">
              Date d&apos;achat
            </label>
            <input
              type="date"
              value={purchaseDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="h-11 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-[var(--text-primary)]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)] block mb-2">
              Notes <span className="text-[var(--text-tertiary)] font-normal">(optionnel)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Acheté chez Leclerc en promo..."
              rows={2}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || success}
            className={`w-full rounded-xl px-4 py-3 font-medium transition-colors disabled:opacity-50 ${
              success
                ? "bg-green-500 text-white"
                : "btn-gold text-black"
            }`}
          >
            {success
              ? "Ajouté au portfolio !"
              : loading
                ? "Ajout en cours..."
                : "Ajouter au portfolio"}
          </button>
        </form>
      </div>
    </div>
  );
}
