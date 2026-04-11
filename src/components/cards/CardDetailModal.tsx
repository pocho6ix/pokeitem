"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ExternalLink } from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { CARD_RARITY_LABELS, CARD_RARITY_IMAGE } from "@/types/card";
import { isSpecialCard } from "@/lib/pokemon/card-variants";
import type { CardRarity } from "@/types/card";

// Recharts lazy-loaded — not needed until modal opens
const PriceHistoryChart = dynamic(
  () => import("./PriceHistoryChart").then((m) => m.PriceHistoryChart),
  {
    loading: () => <div className="h-40 animate-pulse rounded-xl bg-[var(--bg-secondary)]" />,
    ssr: false,
  }
);

// Énergie series (MEE, SVE) are excluded — they use NO_RARITY explicitly
const PROMO_SERIE_SLUGS = new Set([
  "promos-mega-evolution",
  "promos-ecarlate-et-violet",
  "promos-epee-et-bouclier", "promos-soleil-et-lune",
  "promos-xy", "bienvenue-a-kalos", "promos-noir-et-blanc",
  "coffre-des-dragons", "promos-heartgold-soulsilver",
  "promos-diamant-et-perle", "promos-nintendo",
]);

// ─── Types ───────────────────────────────────────────────────────────────────

type Period = "1w" | "1m" | "3m" | "6m" | "1y" | "max";

interface PricePoint {
  date: string;
  price: number;
  priceFr?: number | null;
  priceReverse?: number | null;
}

type ChartMode = "normal" | "reverse";

interface CardDetail {
  id: string;
  name: string;
  number: string;
  rarity: string;
  imageUrl: string | null;
  price: number | null;
  priceFr: number | null;
  priceReverse: number | null;
  isSpecial: boolean;
  priceUpdatedAt: string | null;
  cardmarketId: string | null;
}

interface SerieDetail {
  name: string;
  slug: string;
  releaseDate: string | null;
  imageUrl: string | null;
}

interface Props {
  cardId: string;
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatEur(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildCardmarketUrl(cardName: string, serieName: string): string {
  const q = encodeURIComponent(`${cardName} ${serieName}`);
  return `https://www.cardmarket.com/fr/Pokemon/Products/Singles?searchString=${q}&language=5`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CardDetailModal({ cardId, onClose }: Props) {
  const [card, setCard] = useState<CardDetail | null>(null);
  const [serie, setSerie] = useState<SerieDetail | null>(null);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [period, setPeriod] = useState<Period>("3m");
  const [chartMode, setChartMode] = useState<ChartMode>("normal");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Cards with special rarities (EX, IR, SAR, HR, MUR, MAR, ACE, Promo)
  // don't have a reverse variant — hide the toggle entirely.
  const canHaveReverse =
    card != null &&
    !card.isSpecial &&
    !isSpecialCard(card.rarity as CardRarity);

  const fetchData = useCallback(
    async (p: Period) => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/cards/${cardId}/price-history?period=${p}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setCard(data.card);
        setSerie(data.serie);
        setHistory(data.history);
      } catch (err) {
        console.error("[CardDetailModal] fetch failed:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [cardId]
  );

  useEffect(() => {
    fetchData(period);
  }, [fetchData, period]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function handlePeriodChange(p: Period) {
    setPeriod(p);
  }

  const isPromoSerie = serie ? PROMO_SERIE_SLUGS.has(serie.slug) : false;
  const rarity = card?.rarity as keyof typeof CARD_RARITY_LABELS | undefined;
  const rarityLabel = rarity ? CARD_RARITY_LABELS[rarity] : null;
  const rarityImage = rarity ? CARD_RARITY_IMAGE[rarity] : null;

  // Error state — show a clean message instead of broken UI
  if (error) {
    return (
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="relative z-10 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-default)] shadow-2xl p-8 text-center">
          <button onClick={onClose} className="absolute top-3 right-3 rounded-full p-1.5 bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
            <X className="w-5 h-5" />
          </button>
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Impossible de charger la fiche</p>
          <p className="text-xs text-[var(--text-tertiary)] mb-4">Vérifiez votre connexion et réessayez.</p>
          <button
            onClick={() => fetchData(period)}
            className="rounded-lg bg-[#10B981]/15 px-4 py-2 text-sm font-semibold text-[#10B981] hover:bg-[#10B981]/25 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal / Bottom sheet */}
      <div className="relative z-10 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-default)] shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300">
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-[var(--text-tertiary)]/30" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 rounded-full p-1.5 bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 space-y-5">
          {/* ── Card header ──────────────────────────────────────────── */}
          <div className="flex gap-4">
            {/* Card image */}
            <div className="relative w-28 aspect-[2.5/3.5] shrink-0 rounded-lg overflow-hidden bg-[var(--bg-secondary)]">
              {card?.imageUrl ? (
                <Image
                  src={card.imageUrl}
                  alt={card.name}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[var(--text-tertiary)]">
                  {card?.number ?? "…"}
                </div>
              )}
            </div>

            {/* Card info */}
            <div className="flex-1 min-w-0 py-1">
              <h2 className="text-lg font-bold text-[var(--text-primary)] leading-tight">
                {card?.name ?? "Chargement…"}
              </h2>
              {serie && (
                <p className="mt-1 text-sm text-[var(--text-secondary)] truncate">
                  {serie.name} · {card?.number}
                </p>
              )}
              {isPromoSerie ? (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-default)] px-2 py-0.5 text-xs font-medium text-[var(--text-primary)]">
                  <Image src="/rarities/promo.png" alt="Promo" width={16} height={16} className="w-4 h-4 object-contain" />
                  Promo
                </span>
              ) : rarityImage && (
                <span
                  className="mt-2 inline-flex items-center justify-center rounded-full bg-[var(--bg-secondary)] border border-[var(--border-default)] p-1"
                  title={rarityLabel ?? undefined}
                >
                  <Image src={rarityImage} alt={rarityLabel ?? ""} width={16} height={16} className="w-4 h-4 object-contain"
                    style={(rarity === "COMMON" || rarity === "UNCOMMON" || rarity === "RARE" || rarity === "NO_RARITY")
                      ? { filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.9)) drop-shadow(0 0 0.5px rgba(255,255,255,0.9))' }
                      : undefined}
                  />
                </span>
              )}

              {/* Price display */}
              <div className="mt-3">
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {chartMode === "reverse"
                    ? formatEur(card?.priceReverse)
                    : formatEur(card?.priceFr ?? card?.price)}
                </p>
                {chartMode === "reverse" ? (
                  <p className="text-xs text-[var(--text-tertiary)]">
                    🌍 Reverse · marché global
                  </p>
                ) : card?.priceFr != null && card.price != null ? (
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Prix global : {formatEur(card.price)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* ── Price history chart ───────────────────────────────────── */}
          <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Historique du prix
              </h3>
              {canHaveReverse && (
                <div className="inline-flex rounded-lg bg-[var(--bg-secondary)] p-0.5">
                  <button
                    onClick={() => setChartMode("normal")}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                      chartMode === "normal"
                        ? "bg-[#E7BA76]/15 text-[#E7BA76]"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => setChartMode("reverse")}
                    disabled={card?.priceReverse == null}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      chartMode === "reverse"
                        ? "bg-[#E7BA76]/15 text-[#E7BA76]"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    Reverse
                  </button>
                </div>
              )}
            </div>
            <PriceHistoryChart
              data={history}
              currentPrice={card?.price ?? null}
              currentPriceFr={card?.priceFr}
              currentPriceReverse={card?.priceReverse}
              mode={chartMode}
              period={period}
              onPeriodChange={handlePeriodChange}
              loading={loading}
            />
            {chartMode === "reverse" && (
              <p className="mt-2 text-[10px] text-[var(--text-tertiary)] italic leading-snug">
                Le prix reverse provient du marché Cardmarket global (pas de prix FR
                spécifique disponible). À titre indicatif.
              </p>
            )}
          </div>

          {/* ── Market prices table ───────────────────────────────────── */}
          <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Prix du marché
              </h3>
              {card && serie && (
                <a
                  href={buildCardmarketUrl(card.name, serie.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 px-2.5 py-1 text-xs font-semibold text-white transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Cardmarket FR
                </a>
              )}
            </div>
            <div className="space-y-2">
              <PriceRow label="🇫🇷 Prix FR (Near Mint)" value={card?.priceFr} highlight />
              <PriceRow label="Prix tendance" value={card?.price} />
              {card?.priceReverse != null && (
                <PriceRow label="Prix Reverse" value={card.priceReverse} />
              )}
              {card?.priceUpdatedAt && (
                <p className="text-[10px] text-[var(--text-tertiary)] pt-1">
                  Dernière mise à jour : {new Date(card.priceUpdatedAt).toLocaleDateString("fr-FR")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PriceRow({ label, value, highlight }: { label: string; value: number | null | undefined; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${highlight ? "text-[#E7BA76] font-medium" : "text-[var(--text-secondary)]"}`}>
        {label}
      </span>
      <span className={`text-sm font-semibold ${highlight ? "text-[#E7BA76]" : "text-[var(--text-primary)]"}`}>
        {formatEur(value)}
      </span>
    </div>
  );
}
