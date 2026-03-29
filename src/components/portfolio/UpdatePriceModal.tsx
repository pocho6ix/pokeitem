"use client";

import { useState } from "react";
import { X, RefreshCw, PenLine, ExternalLink } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface UpdatePriceModalProps {
  item: {
    id: string;
    name: string;
    currentPrice: number | null;
    priceTrend: number | null;
    priceFrom: number | null;
    priceUpdatedAt: string | null;
    lastScrapedAt: string | null;
    cardmarketUrl: string | null;
    retailPrice: number | null;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UpdatePriceModal({
  item,
  isOpen,
  onClose,
  onSuccess,
}: UpdatePriceModalProps) {
  const [mode, setMode] = useState<"choose" | "manual" | "scraping">("choose");
  const [manualPrice, setManualPrice] = useState(
    item.currentPrice ?? item.priceTrend ?? item.retailPrice ?? 0
  );
  const [manualDate, setManualDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [scrapedData, setScrapedData] = useState<{
    priceTrend: number | null;
    priceFrom: number | null;
    availableSellers: number | null;
    productUrl: string;
  } | null>(null);

  if (!isOpen) return null;

  const currentPrice = item.currentPrice ?? item.priceTrend ?? 0;
  const lastUpdated = item.priceUpdatedAt
    ? new Date(item.priceUpdatedAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  async function handleScrape() {
    setMode("scraping");
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/items/${item.id}/price`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur scraping");
      }

      if (!data.found) {
        setError(
          "Prix CardMarket non trouvé pour cet item. Essayez la saisie manuelle."
        );
        setMode("choose");
      } else {
        setScrapedData(data);
        setSuccess(
          `Prix mis à jour : ${formatPrice(data.priceTrend ?? data.priceFrom ?? 0)}`
        );
        setTimeout(() => {
          onSuccess();
          onClose();
          resetState();
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setMode("choose");
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/portfolio/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          price: manualPrice,
          date: manualDate,
          note: note || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      setSuccess(`Prix mis à jour : ${formatPrice(manualPrice)}`);
      setTimeout(() => {
        onSuccess();
        onClose();
        resetState();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  function resetState() {
    setMode("choose");
    setError("");
    setSuccess("");
    setScrapedData(null);
    setNote("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-default)] p-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Actualiser le prix
          </h2>
          <button
            onClick={() => {
              onClose();
              resetState();
            }}
            className="rounded-lg p-1.5 hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <X className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Item info */}
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">
              {item.name}
            </h3>
            <div className="mt-2 flex gap-3 text-sm">
              <div className="flex-1 rounded-lg bg-[var(--bg-secondary)] px-3 py-2">
                <span className="text-[var(--text-tertiary)]">Prix actuel</span>
                <p className="font-data font-semibold text-[var(--text-primary)]">
                  {currentPrice > 0 ? formatPrice(currentPrice) : "Non défini"}
                </p>
              </div>
              {lastUpdated && (
                <div className="flex-1 rounded-lg bg-[var(--bg-secondary)] px-3 py-2">
                  <span className="text-[var(--text-tertiary)]">
                    Mis à jour
                  </span>
                  <p className="text-xs font-medium text-[var(--text-primary)] mt-0.5">
                    {lastUpdated}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Success */}
          {success && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 px-3 py-2.5 text-sm text-green-600 dark:text-green-400 font-medium">
              {success}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-500">
              {error}
            </div>
          )}

          {/* Choose mode */}
          {mode === "choose" && !success && (
            <div className="space-y-3">
              {/* CardMarket button */}
              <button
                type="button"
                onClick={handleScrape}
                disabled={loading}
                className="w-full flex items-center gap-3 rounded-xl border border-[var(--border-default)] p-4 hover:bg-[var(--bg-secondary)] transition-colors text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--text-primary)]">
                    Prix CardMarket
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Récupérer automatiquement le prix du marché
                  </p>
                </div>
              </button>

              {/* Manual button */}
              <button
                type="button"
                onClick={() => setMode("manual")}
                className="w-full flex items-center gap-3 rounded-xl border border-[var(--border-default)] p-4 hover:bg-[var(--bg-secondary)] transition-colors text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <PenLine className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--text-primary)]">
                    Saisie manuelle
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Renseigner vous-même la valeur actuelle
                  </p>
                </div>
              </button>

              {/* CardMarket link */}
              {item.cardmarketUrl && (
                <a
                  href={item.cardmarketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-blue-600 hover:underline mt-2"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Voir sur CardMarket
                </a>
              )}
            </div>
          )}

          {/* Scraping in progress */}
          {mode === "scraping" && loading && (
            <div className="flex flex-col items-center py-8">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">
                Recherche du prix sur CardMarket...
              </p>
            </div>
          )}

          {/* Manual mode */}
          {mode === "manual" && !success && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              {/* Price input */}
              <div>
                <label className="text-sm font-medium text-[var(--text-primary)] block mb-2">
                  Valeur actuelle
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualPrice}
                    onChange={(e) =>
                      setManualPrice(parseFloat(e.target.value) || 0)
                    }
                    className="h-11 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 pr-10 font-data text-[var(--text-primary)]"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)]">
                    &euro;
                  </span>
                </div>
                {/* Quick fill */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.retailPrice && item.retailPrice > 0 && (
                    <button
                      type="button"
                      onClick={() => setManualPrice(item.retailPrice!)}
                      className="rounded-md bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                      Retail {formatPrice(item.retailPrice)}
                    </button>
                  )}
                  {item.priceTrend && item.priceTrend > 0 && (
                    <button
                      type="button"
                      onClick={() => setManualPrice(item.priceTrend!)}
                      className="rounded-md bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                      Tendance {formatPrice(item.priceTrend)}
                    </button>
                  )}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="text-sm font-medium text-[var(--text-primary)] block mb-2">
                  Date de valorisation
                </label>
                <input
                  type="date"
                  value={manualDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-[var(--text-primary)]"
                />
              </div>

              {/* Note */}
              <div>
                <label className="text-sm font-medium text-[var(--text-primary)] block mb-2">
                  Note{" "}
                  <span className="text-[var(--text-tertiary)] font-normal">
                    (optionnel)
                  </span>
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ex: vu sur LeBonCoin, eBay..."
                  className="h-11 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMode("choose");
                    setError("");
                  }}
                  className="flex-1 rounded-xl border border-[var(--border-default)] px-4 py-3 font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={loading || manualPrice <= 0}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
