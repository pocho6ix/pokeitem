"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { CARD_RARITY_LABELS, CARD_RARITY_SYMBOL, CardRarity } from "@/types/card";
import { CARD_VERSION_LABELS, CardVersion } from "@/data/card-versions";
import { BackButton } from "@/components/ui/BackButton";
import { RemoveCardButton } from "@/components/cards/RemoveCardButton";
import { getCardImageAlt } from "@/lib/seo/card-image";
import { fetchApi } from "@/lib/api";

type CardDTO = {
  id: string;
  name: string;
  number: string;
  rarity: string;
  imageUrl: string | null;
  price: number | null;
  priceFr: number | null;
  priceReverse: number | null;
  tcgdexId: string | null;
  serie: {
    id: string;
    name: string;
    slug: string;
    cardCount: number | null;
    bloc: { slug: string; name: string };
  };
};

type TcgdexPricing = {
  cardmarket?: {
    url?: string;
    prices?: {
      lowPrice?: number;
      trendPrice?: number;
      avg7?: number;
      avg30?: number;
    };
  };
  tcgplayer?: { url?: string };
};

function formatEur(value: number) {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function CardDetailClient() {
  const params = useParams<{ cardId: string }>();
  const cardId = params?.cardId;
  const [card, setCard] = useState<CardDTO | null>(null);
  const [ownedVersions, setOwnedVersions] = useState<CardVersion[]>([]);
  const [tcgdex, setTcgdex] = useState<{
    types: string[];
    pricing: TcgdexPricing | null;
  }>({ types: [], pricing: null });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!cardId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchApi(`/api/cards/${cardId}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        const cardData: CardDTO = data.card ?? data;
        setCard(cardData);

        // Owned versions (if authed)
        const ownedRes = await fetchApi(`/api/cards/${cardId}/owned`);
        if (ownedRes.ok) {
          const ownedData = await ownedRes.json();
          if (!cancelled)
            setOwnedVersions((ownedData.versions ?? []) as CardVersion[]);
        }

        // Optional TCGdex enrichment
        if (cardData.tcgdexId) {
          try {
            const tcgRes = await fetch(
              `https://api.tcgdex.net/v2/fr/cards/${cardData.tcgdexId}`,
            );
            if (tcgRes.ok) {
              const tcg = await tcgRes.json();
              if (!cancelled)
                setTcgdex({ types: tcg.types ?? [], pricing: tcg.pricing ?? null });
            }
          } catch {
            /* ignore — enrichment is best-effort */
          }
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[var(--text-secondary)]">
        Chargement…
      </div>
    );
  }

  if (notFound || !card) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[var(--text-secondary)]">
        Carte introuvable.
      </div>
    );
  }

  const cmPrices = tcgdex.pricing?.cardmarket?.prices;
  const frPrice = card.priceFr ?? null;
  const trendPrice = cmPrices?.trendPrice ?? card.price ?? null;
  const lowPrice = cmPrices?.lowPrice ?? null;
  const avg7 = cmPrices?.avg7 ?? null;
  const avg30 = cmPrices?.avg30 ?? null;

  const encodedCard = encodeURIComponent(card.name);
  const cardmarketUrl =
    tcgdex.pricing?.cardmarket?.url ??
    `https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=${encodedCard}`;

  const rarity = card.rarity as CardRarity;
  const types = tcgdex.types;
  const totalCards = card.serie.cardCount;

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:px-6">
      <div className="mb-5">
        <BackButton label="Retour" />
      </div>

      {card.imageUrl && (
        <div className="mb-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.imageUrl}
            alt={getCardImageAlt(card, card.serie)}
            className="w-64 sm:w-72 rounded-xl shadow-2xl"
          />
        </div>
      )}

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] divide-y divide-[var(--border-default)]">
        <div className="px-5 py-4">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{card.name}</h1>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            <Link
              href={`/collection/cartes/${card.serie.bloc.slug}/${card.serie.slug}`}
              className="hover:underline hover:text-[var(--text-primary)]"
            >
              {card.serie.name}
            </Link>
          </p>
        </div>

        <dl className="px-5 py-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide mb-0.5">
              Numéro
            </dt>
            <dd className="font-medium text-[var(--text-primary)]">
              {card.number}
              {totalCards ? `/${totalCards}` : ""}
            </dd>
          </div>

          <div>
            <dt className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide mb-0.5">
              Rareté
            </dt>
            <dd className="font-medium text-[var(--text-primary)]">
              {CARD_RARITY_SYMBOL[rarity]} {CARD_RARITY_LABELS[rarity]}
            </dd>
          </div>

          {types.length > 0 && (
            <div>
              <dt className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide mb-0.5">
                Type
              </dt>
              <dd className="font-medium text-[var(--text-primary)]">
                {types.join(", ")}
              </dd>
            </div>
          )}

          {ownedVersions.length > 0 && (
            <div>
              <dt className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide mb-0.5">
                Possédée
              </dt>
              <dd className="font-medium text-[var(--text-primary)]">
                {ownedVersions.map((v) => CARD_VERSION_LABELS[v]).join(", ")}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {(frPrice !== null || trendPrice !== null || card.priceReverse !== null) && (
        <div className="mt-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] divide-y divide-[var(--border-default)]">
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              💰 Prix Cardmarket
            </h2>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {frPrice !== null && (
                <div>
                  <p className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide mb-0.5">
                    🇫🇷 Carte française (NM)
                  </p>
                  <p className="text-lg font-bold text-emerald-400">{formatEur(frPrice)}</p>
                </div>
              )}
              {trendPrice !== null && (
                <div>
                  <p className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide mb-0.5">
                    {frPrice !== null ? "Tendance globale" : "Tendance"}
                  </p>
                  <p
                    className={`text-lg font-bold ${frPrice !== null ? "text-[var(--text-primary)]" : "text-emerald-400"}`}
                  >
                    {formatEur(trendPrice)}
                  </p>
                </div>
              )}
              {lowPrice !== null && (
                <div>
                  <p className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide mb-0.5">
                    À partir de
                  </p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {formatEur(lowPrice)}
                  </p>
                </div>
              )}
              {card.priceReverse !== null && card.priceReverse !== undefined && (
                <div>
                  <p className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide mb-0.5">
                    Reverse
                  </p>
                  <p className="text-lg font-bold text-emerald-400">
                    {formatEur(card.priceReverse)}
                  </p>
                </div>
              )}
            </div>

            {(avg7 !== null || avg30 !== null) && (
              <div className="mt-3 flex gap-4 text-xs text-[var(--text-secondary)]">
                {avg7 !== null && <span>Moy. 7j : {formatEur(avg7)}</span>}
                {avg30 !== null && <span>Moy. 30j : {formatEur(avg30)}</span>}
              </div>
            )}
          </div>

          <div className="px-5 py-4 flex flex-col gap-2">
            <a
              href={cardmarketUrl}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="btn-gold flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-black"
            >
              Acheter sur Cardmarket
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      {ownedVersions.length > 0 && (
        <RemoveCardButton cardId={card.id} versions={ownedVersions} />
      )}
    </div>
  );
}
