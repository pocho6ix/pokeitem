"use client";

import { useState, useEffect, useCallback, useTransition, useRef } from "react";
import { X, Plus } from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { CARD_RARITY_LABELS, CARD_RARITY_IMAGE, CardCondition, CARD_LANGUAGES, getCardRarityImage } from "@/types/card";
import { isSpecialCard } from "@/lib/pokemon/card-variants";
import { CardVersion, getSerieVersions } from "@/data/card-versions";
import { SERIES } from "@/data/series";
import type { CardRarity } from "@/types/card";
import { useWishlistStore, useIsInWishlist } from "@/stores/wishlistStore";

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── Add-to-collection constants ─────────────────────────────────────────────

const CONDITION_BADGES: { value: CardCondition; label: string; badge: string }[] = [
  { value: CardCondition.POOR,         label: "Poor",         badge: "badge_poor.png"         },
  { value: CardCondition.PLAYED,       label: "Played",       badge: "badge_played.png"       },
  { value: CardCondition.LIGHT_PLAYED, label: "Light Played", badge: "badge_light_played.png" },
  { value: CardCondition.GOOD,         label: "Good",         badge: "badge_good.png"         },
  { value: CardCondition.EXCELLENT,    label: "Excellent",    badge: "badge_excellent.png"    },
  { value: CardCondition.NEAR_MINT,    label: "Near Mint",    badge: "badge_near_mint.png"    },
  { value: CardCondition.MINT,         label: "Mint",         badge: "badge_mint.png"         },
  { value: CardCondition.GRADED,       label: "Gradée",       badge: "badge_graded.png"       },
];
const GRADE_VALUES = [5, 6, 7, 8, 9, 9.5, 10];
const VERSION_LABELS: Record<CardVersion, string> = {
  [CardVersion.NORMAL]:             "Normale",
  [CardVersion.REVERSE]:            "Reverse",
  [CardVersion.REVERSE_POKEBALL]:   "Pokéball",
  [CardVersion.REVERSE_MASTERBALL]: "Masterball",
};
type PriceMode = "packed" | "current" | "manual";

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
  // Promos Black Star & séries spéciales
  "energies-mega-evolution",   "promos-mega-evolution",
  "promos-ecarlate-et-violet", "energies-ecarlate-et-violet",
  "promos-epee-et-bouclier",   "promos-soleil-et-lune",
  "promos-xy",                 "bienvenue-a-kalos",
  "promos-noir-et-blanc",      "coffre-des-dragons",
  "promos-heartgold-soulsilver", "promos-diamant-et-perle",
  "promos-wizards",
  // Collection McDonald's
  "promo-mcdo-2024", "promo-mcdo-2023", "promo-mcdo-2022", "promo-mcdo-2021",
  "promo-mcdo-2019", "promo-mcdo-2018", "promo-mcdo-2017", "promo-mcdo-2016",
  "promo-mcdo-2015", "promo-mcdo-2014", "promo-mcdo-2013", "promo-mcdo-2012",
  "promo-mcdo-2011",
  // Pokémon Organized Play
  "pop-1", "pop-2", "pop-3", "pop-4", "pop-9",
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
  cardmarketUrl: string | null;  // e.g. "Mega-Evolution/Bulbasaur-V2-MEG133"
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
  /** "modal" (default) = fixed overlay; "inline" = embedded in parent layout */
  variant?: "modal" | "inline";
  /** Shown at the bottom in inline variant — "Ce n'est pas la bonne carte ?" */
  onWrongCard?: () => void;
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

// ─── Component ───────────────────────────────────────────────────────────────

export function CardDetailModal({ cardId, onClose, variant = "modal", onWrongCard }: Props) {
  const isInline = variant === "inline";
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [card, setCard] = useState<CardDetail | null>(null);
  const [serie, setSerie] = useState<SerieDetail | null>(null);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [period, setPeriod] = useState<Period>("3m");
  const [chartMode, setChartMode] = useState<ChartMode>("normal");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Add-to-collection sheet state
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addQty, setAddQty] = useState(1);
  const [addCondition, setAddCondition] = useState<CardCondition>(CardCondition.NEAR_MINT);
  const [addVersion, setAddVersion] = useState<CardVersion>(CardVersion.NORMAL);
  const [addLanguage, setAddLanguage] = useState("FR");
  const [addPriceMode, setAddPriceMode] = useState<PriceMode>("current");
  const [addManualPrice, setAddManualPrice] = useState("");
  const [addGradeValue, setAddGradeValue] = useState<number | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Ownership state
  const [isOwned, setIsOwned] = useState(false);
  const [removeSuccess, setRemoveSuccess] = useState(false);

  // Wishlist state — read from the global store so changes elsewhere stay in sync
  const isInWishlist = useIsInWishlist(cardId);
  const wishlistRemove = useWishlistStore((s) => s.remove);
  const [wishlistRemoveSuccess, setWishlistRemoveSuccess] = useState(false);

  // Hide reverse toggle when the card can't have a reverse variant
  // OR when there's simply no reverse price data available.
  const canHaveReverse =
    card != null &&
    !card.isSpecial &&
    !isSpecialCard(card.rarity as CardRarity) &&
    card.priceReverse != null;

  const fetchData = useCallback(
    async (p: Period) => {
      setLoading(true);
      setError(false);
      try {
        const [priceRes, ownedRes] = await Promise.all([
          fetch(`/api/cards/${cardId}/price-history?period=${p}`),
          fetch(`/api/cards/${cardId}/owned`),
        ]);
        if (!priceRes.ok) throw new Error(`HTTP ${priceRes.status}`);
        const data = await priceRes.json();
        setCard(data.card);
        setSerie(data.serie);
        setHistory(data.history);
        if (ownedRes.ok) {
          const ownedData = await ownedRes.json();
          setIsOwned(ownedData.owned);
        }
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

  // Close on Escape (modal only)
  useEffect(() => {
    if (isInline) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // isInline is stable (derived from variant prop); onCloseRef avoids stale closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInline]);

  // Prevent body scroll (modal only)
  useEffect(() => {
    if (isInline) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInline]);

  function handlePeriodChange(p: Period) {
    setPeriod(p);
  }

  const isPromoSerie = serie ? PROMO_SERIE_SLUGS.has(serie.slug) : false;
  const rarity = card?.rarity as keyof typeof CARD_RARITY_LABELS | undefined;
  const rarityLabel = rarity ? CARD_RARITY_LABELS[rarity] : null;
  const blocSlug = serie ? SERIES.find(s => s.slug === serie.slug)?.blocSlug : undefined;
  const rarityImage = rarity ? getCardRarityImage(rarity, blocSlug) : null;

  // Available versions for the add sheet
  const availableVersions: CardVersion[] = (card && serie && !card.isSpecial && !isSpecialCard(card.rarity as CardRarity))
    ? getSerieVersions(serie.slug)
    : [CardVersion.NORMAL];

  const currentPrice = card?.priceFr ?? card?.price ?? null;

  async function handleAddToCollection() {
    if (!card) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/cards/collection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cards: [{
              cardId: card.id,
              quantity: addQty,
              condition: addCondition,
              language: addLanguage,
              version: addVersion,
              foil: false,
              priceMode: addPriceMode,
              manualPrice: addPriceMode === "manual" && addManualPrice ? parseFloat(addManualPrice) : undefined,
              gradeValue: addCondition === CardCondition.GRADED ? addGradeValue : undefined,
            }],
          }),
        });
        if (!res.ok) throw new Error();
        setAddSuccess(true);
        setIsOwned(true);
        // Auto-remove from wishlist on "Je l'ai" — owning it means you no
        // longer need to want it. Silent best-effort; store is single source
        // of truth so the UI updates immediately.
        if (useWishlistStore.getState().ids.has(card.id)) {
          wishlistRemove(card.id);
          fetch(`/api/wishlist/cards/${card.id}`, { method: "DELETE" }).catch(() => {});
        }
        setTimeout(() => { setShowAddSheet(false); setAddSuccess(false); }, 1200);
      } catch {
        // silent — user can retry
      }
    });
  }

  async function handleRemoveFromWishlist() {
    if (!card) return;
    // Optimistic: flip the store + UI flag immediately, roll back on failure.
    wishlistRemove(card.id);
    setWishlistRemoveSuccess(true);
    try {
      const res = await fetch(`/api/wishlist/cards/${card.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTimeout(() => setWishlistRemoveSuccess(false), 1500);
    } catch {
      // rollback
      useWishlistStore.getState().add(card.id);
      setWishlistRemoveSuccess(false);
    }
  }

  async function handleRemoveFromCollection() {
    if (!card) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/cards/collection", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries: [{ cardId: card.id }] }),
        });
        if (!res.ok) throw new Error();
        setRemoveSuccess(true);
        setIsOwned(false);
        setTimeout(() => setRemoveSuccess(false), 1500);
      } catch {
        // silent
      }
    });
  }

  // Error state — show a clean message instead of broken UI
  if (error) {
    const errorContent = (
      <div className={isInline ? "p-8 text-center" : "relative z-10 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-default)] shadow-2xl p-8 text-center"}>
        {!isInline && (
          <button onClick={onClose} className="absolute top-3 right-3 rounded-full p-1.5 bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
            <X className="w-5 h-5" />
          </button>
        )}
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Impossible de charger la fiche</p>
        <p className="text-xs text-[var(--text-tertiary)] mb-4">Vérifiez votre connexion et réessayez.</p>
        <button
          onClick={() => fetchData(period)}
          className="rounded-lg bg-[#10B981]/15 px-4 py-2 text-sm font-semibold text-[#10B981] hover:bg-[#10B981]/25 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
    if (isInline) return errorContent;
    return (
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        {errorContent}
      </div>
    );
  }

  // ── Shared content (used in both modal and inline) ─────────────────────

  const detailContent = (
    <>
    <div className={isInline ? "space-y-5" : "p-5 space-y-5"}>
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
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-default)] px-2 py-0.5 text-xs font-medium text-[var(--text-primary)]"
            >
              <Image src={rarityImage} alt={rarityLabel ?? ""} width={16} height={16} className="w-4 h-4 object-contain"
                style={(rarity === "COMMON" || rarity === "UNCOMMON" || rarity === "RARE" || rarity === "HOLO_RARE" || rarity === "NO_RARITY")
                  ? { filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.9)) drop-shadow(0 0 0.5px rgba(255,255,255,0.9))' }
                  : undefined}
              />
              {rarityLabel}
            </span>
          )}

          {/* Price display */}
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold text-[var(--text-primary)]">
                {chartMode === "reverse"
                  ? formatEur(card?.priceReverse)
                  : formatEur(card?.priceFr ?? card?.price)}
              </p>

              {/* Cardmarket link */}
              {(card?.cardmarketUrl || card?.cardmarketId) && (
                <a
                  href={
                    card.cardmarketUrl
                      ? `https://www.cardmarket.com/fr/Pokemon/Products/Singles/${card.cardmarketUrl}`
                      : `https://www.cardmarket.com/fr/Pokemon/Products/Singles?idProduct=${card.cardmarketId}&language=5`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg overflow-hidden border border-white/15 hover:border-white/30 transition-colors"
                  title="Voir sur Cardmarket"
                >
                  <span className="bg-white px-2.5 py-1.5 flex items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/cardmarket.png" alt="Cardmarket" className="h-5 w-auto object-contain" />
                  </span>
                </a>
              )}

              {/* Reverse toggle badge */}
              {canHaveReverse && (
                <button
                  onClick={() => setChartMode(m => m === "reverse" ? "normal" : "reverse")}
                  title={chartMode === "reverse" ? "Afficher prix normal" : "Afficher prix Reverse"}
                  style={{ width: 28, height: 28 }}
                  className={`relative shrink-0 rounded-full overflow-hidden transition-all ${
                    chartMode === "reverse"
                      ? "ring-2 ring-[#E7BA76] ring-offset-1 ring-offset-[var(--bg-primary)]"
                      : "opacity-50 hover:opacity-80"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/reverse-badge.png"
                    alt="Reverse"
                    style={{ width: 28, height: 28 }}
                    className="object-cover"
                  />
                </button>
              )}
            </div>

            {chartMode === "reverse" ? (
              <p className="text-xs text-[var(--text-tertiary)] flex items-center gap-1 mt-0.5">
                Reverse · marché global
              </p>
            ) : card?.priceFr != null && card.price != null ? (
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                Prix global : {formatEur(card.price)}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Add / Remove CTA ─────────────────────────────────────────── */}
      {card && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setShowAddSheet(true)}
            className="btn-gold w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-black active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            Ajouter à ma collection
          </button>
          {isOwned && (
            <button
              onClick={handleRemoveFromCollection}
              disabled={isPending || removeSuccess}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-60 active:scale-[0.98] transition-all"
            >
              {removeSuccess ? "✓ Retiré" : "Retirer de ma collection"}
            </button>
          )}
          {isInWishlist && (
            <button
              onClick={handleRemoveFromWishlist}
              disabled={wishlistRemoveSuccess}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-purple-500/30 bg-purple-500/10 py-2.5 text-sm font-semibold text-purple-400 hover:bg-purple-500/20 disabled:opacity-60 active:scale-[0.98] transition-all"
            >
              {wishlistRemoveSuccess ? "✓ Retiré" : "Retirer de ma liste de souhaits"}
            </button>
          )}
        </div>
      )}

      {/* ── Price history chart ───────────────────────────────────── */}
      <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {chartMode === "reverse" ? "Prix Reverse" : "Historique du prix"}
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
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
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

        {chartMode === "reverse" ? (
          /* ── Reverse: no chart yet, minimal price display ── */
          <div className="flex flex-col items-center gap-1 py-6">
            <p className="text-3xl font-bold text-[var(--text-primary)]">
              {formatEur(card?.priceReverse)}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
              <img src="/reverse-badge.png" alt="Reverse" className="w-4 h-4 object-contain" /> Marché global · Cardmarket
            </p>
            {card?.priceUpdatedAt && (
              <p className="mt-3 text-[10px] text-[var(--text-tertiary)]/60">
                Mis à jour le {new Date(card.priceUpdatedAt).toLocaleDateString("fr-FR")}
              </p>
            )}
            <p className="mt-4 text-[10px] text-[var(--text-tertiary)]/50 italic text-center max-w-[260px] leading-relaxed">
              L&apos;historique Reverse sera disponible au fil du temps.
            </p>
          </div>
        ) : (
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
        )}
      </div>

      {/* ── Market prices table ───────────────────────────────────── */}
      <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Prix du marché
          </h3>
          {(card?.cardmarketUrl || card?.cardmarketId) && (
            <a
              href={
                card.cardmarketUrl
                  ? `https://www.cardmarket.com/fr/Pokemon/Products/Singles/${card.cardmarketUrl}`
                  : `https://www.cardmarket.com/fr/Pokemon/Products/Singles?idProduct=${card.cardmarketId}&language=5`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg overflow-hidden border border-white/15 hover:border-white/30 transition-colors"
              title="Voir sur Cardmarket"
            >
              <span className="bg-white px-2 py-1 flex items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/cardmarket.png" alt="Cardmarket" className="h-4 w-auto object-contain" />
              </span>
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

      {/* ── "Ce n'est pas la bonne carte ?" (inline scanner variant) ── */}
      {onWrongCard && (
        <div className="pt-2 pb-6 text-center">
          <button
            onClick={onWrongCard}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            Ce n&apos;est pas la bonne carte ?
          </button>
        </div>
      )}
    </div>
    </>
  );

  return (
    <>
    {/* ── Add-to-collection sheet ─────────────────────────────────────────── */}
    {showAddSheet && (
      <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60" onClick={() => setShowAddSheet(false)}>
        <div
          className="w-full max-w-lg rounded-t-3xl bg-[var(--bg-card)] shadow-2xl flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-[var(--border-default)]" />
          </div>

          <div className="overflow-y-auto px-5 pt-2 pb-10">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Ajouter à ma collection</h2>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{card?.name}</p>
              </div>
              <button
                onClick={() => setShowAddSheet(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Version */}
            {availableVersions.length > 1 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Version</p>
                <div className={cn("grid gap-1.5", availableVersions.length <= 2 ? "grid-cols-2" : "grid-cols-4")}>
                  {availableVersions.map((v) => (
                    <button
                      key={v}
                      onClick={() => setAddVersion(v)}
                      className={cn(
                        "flex flex-col items-center rounded-xl border px-1 py-2 text-xs font-medium transition-all",
                        addVersion === v
                          ? "btn-gold border-transparent text-black shadow-sm"
                          : "border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[#E7BA76]/70"
                      )}
                    >
                      {VERSION_LABELS[v]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Quantité</p>
              <div className="flex items-center justify-between rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2">
                <button onClick={() => setAddQty(Math.max(1, addQty - 1))} className="flex h-10 w-10 items-center justify-center rounded-xl text-xl font-bold text-[var(--text-secondary)]">−</button>
                <span className="text-lg font-bold text-[var(--text-primary)]">{addQty}</span>
                <button onClick={() => setAddQty(Math.min(99, addQty + 1))} className="flex h-10 w-10 items-center justify-center rounded-xl text-xl font-bold text-[var(--text-secondary)]">+</button>
              </div>
            </div>

            {/* Condition */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">État de la carte</p>
              <div className="flex justify-between items-center">
                {CONDITION_BADGES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => { setAddCondition(c.value); setAddGradeValue(null); }}
                    className="rounded-full transition-all focus:outline-none"
                    style={{
                      opacity: addCondition === c.value ? 1 : 0.45,
                      outline: addCondition === c.value ? '2px solid #E7BA76' : 'none',
                      outlineOffset: 2,
                    }}
                    aria-label={c.label}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/images/badges/${c.badge}`} alt={c.label} className="h-7 w-7 rounded-full object-cover" />
                  </button>
                ))}
              </div>
              {addCondition === CardCondition.GRADED && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {GRADE_VALUES.map((g) => (
                    <button
                      key={g}
                      onClick={() => setAddGradeValue(addGradeValue === g ? null : g)}
                      className={cn(
                        "rounded-xl border px-3 py-1.5 text-xs font-bold transition-all",
                        addGradeValue === g
                          ? "btn-gold border-transparent text-black shadow-sm"
                          : "border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Language */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Langue</p>
              <select
                value={addLanguage}
                onChange={(e) => setAddLanguage(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#E7BA76]"
              >
                {CARD_LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>

            {/* Price mode */}
            <div className="mb-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Prix d&apos;achat</p>
              <div className="grid grid-cols-3 gap-2">
                {(["packed", "current", "manual"] as PriceMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setAddPriceMode(m)}
                    className={cn(
                      "rounded-2xl border py-2.5 text-sm font-medium transition-all",
                      addPriceMode === m
                        ? "btn-gold border-transparent text-black shadow-sm"
                        : "border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[#E7BA76]/70"
                    )}
                  >
                    {m === "packed" ? "Packée" : m === "current" ? "Cote actuelle" : "Manuel"}
                    <span className={cn("block text-[10px] font-normal mt-0.5", addPriceMode === m ? "text-black/60" : "text-[var(--text-tertiary)]")}>
                      {m === "packed" ? "0,70\u00a0€" : m === "current" ? (currentPrice != null ? `${currentPrice.toFixed(2)}\u00a0€` : "—") : "Saisir"}
                    </span>
                  </button>
                ))}
              </div>
              {addPriceMode === "manual" && (
                <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2.5">
                  <input
                    type="number" min="0" step="0.01" placeholder="0,00"
                    value={addManualPrice}
                    onChange={(e) => setAddManualPrice(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">€</span>
                </div>
              )}
            </div>

            {/* CTA */}
            <button
              onClick={handleAddToCollection}
              disabled={isPending || addSuccess}
              className="btn-gold w-full rounded-2xl py-4 text-base font-bold text-black disabled:opacity-60 active:scale-[0.98]"
            >
              {addSuccess ? "✓ Ajouté !" : isPending ? "Enregistrement…" : "Ajouter à ma collection"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Inline variant: just render content directly ── */}
    {isInline ? detailContent : (
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

          <div className="p-5">
            {detailContent}
          </div>
        </div>
      </div>
    )}
    </>
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
