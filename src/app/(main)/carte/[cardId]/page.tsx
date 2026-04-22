import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CARD_RARITY_LABELS, CARD_RARITY_SYMBOL, CardRarity } from "@/types/card";
import { CARD_VERSION_LABELS, CardVersion } from "@/data/card-versions";
import { BackButton } from "@/components/ui/BackButton";
import { RemoveCardButton } from "@/components/cards/RemoveCardButton";
import { JsonLd } from "@/components/JsonLd";
import { getCardImageAlt } from "@/lib/seo/card-image";
import { generateBreadcrumbJsonLd, generateCardJsonLd } from "@/lib/seo/structured-data";
import { ExternalLink } from "lucide-react";

const SITE_URL = "https://app.pokeitem.fr";

interface PageProps {
  params: Promise<{ cardId: string }>;
}

// ── TCGdex pricing types ─────────────────────────────────────────────────────

interface TcgdexPricing {
  cardmarket?: {
    url?: string;
    prices?: {
      averageSellPrice?: number;
      lowPrice?: number;
      trendPrice?: number;
      avg1?: number;
      avg7?: number;
      avg30?: number;
    };
  };
  tcgplayer?: {
    url?: string;
  };
}

interface TcgdexCardResponse {
  types?: string[];
  pricing?: TcgdexPricing;
}

async function fetchTcgdexCard(tcgdexId: string): Promise<TcgdexCardResponse | null> {
  try {
    const res = await fetch(`https://api.tcgdex.net/v2/fr/cards/${tcgdexId}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as TcgdexCardResponse;
  } catch {
    return null;
  }
}

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { cardId } = await params;
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: {
      name:     true,
      number:   true,
      rarity:   true,
      imageUrl: true,
      priceFr:  true,
      price:    true,
      serie:    { select: { name: true } },
    },
  });
  if (!card) return { title: "Carte introuvable" };

  const title = `${card.name} ${card.number} — ${card.serie.name}`;

  // Format the market reference price in French (e.g. "12,50 €"). The price
  // is *indicative* — the app is a collection manager, not a marketplace.
  // Mentioning "cote marché" + "à titre indicatif" in the description keeps
  // SERP users from misinterpreting it as a buy-now offer, and earns us
  // longue-traîne queries like "carte X cote".
  const priceValue = card.priceFr ?? card.price ?? null;
  const priceStr =
    priceValue != null
      ? priceValue.toLocaleString("fr-FR", {
          style: "currency",
          currency: "EUR",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : null;
  const rarityLabel = card.rarity
    ? CARD_RARITY_LABELS[card.rarity as CardRarity]
    : null;
  const description = priceStr
    ? `Carte Pokémon ${card.name} (${card.serie.name}) — cote marché ${priceStr} à titre indicatif. Illustration, rareté, variantes et évolution de prix.`
    : `Carte Pokémon ${card.name} (${card.serie.name}) — ${rarityLabel ?? "variante"}. Illustration, prix marché et ajout à votre collection.`;

  const ogImages = card.imageUrl
    ? [
        {
          url:    card.imageUrl,
          alt:    getCardImageAlt(card, card.serie),
          width:  734,
          height: 1024,
        },
      ]
    : undefined;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/carte/${cardId}` },
    openGraph: {
      title,
      description,
      type:   "website",
      url:    `${SITE_URL}/carte/${cardId}`,
      images: ogImages,
    },
    twitter: {
      card:        "summary_large_image",
      title,
      description,
      images:      card.imageUrl ? [card.imageUrl] : undefined,
    },
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function CardDetailPage({ params }: PageProps) {
  const { cardId } = await params;

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      serie: {
        include: { bloc: true },
      },
    },
  });

  if (!card) notFound();

  // Fetch user's owned versions of this card
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  const ownedVersions: CardVersion[] = [];
  if (userId) {
    const userCards = await prisma.userCard.findMany({
      where: { userId, cardId: card.id },
      select: { version: true },
    });
    for (const uc of userCards) {
      ownedVersions.push(uc.version as CardVersion);
    }
  }

  // Try to fetch TCGdex data for types + pricing URLs
  const tcgdex = card.tcgdexId ? await fetchTcgdexCard(card.tcgdexId) : null;

  // Resolve prices — prefer the stored French NM price (priceFr), then
  // TCGdex cardmarket trend, then the international trend from DB.
  const cmPrices = tcgdex?.pricing?.cardmarket?.prices;
  const frPrice    = card.priceFr ?? null;
  const trendPrice = cmPrices?.trendPrice ?? card.price ?? null;
  const lowPrice   = cmPrices?.lowPrice    ?? null;
  const avg7       = cmPrices?.avg7        ?? null;
  const avg30      = cmPrices?.avg30       ?? null;

  // Marketplace links — use TCGdex URLs when available, fallback to search
  const encodedCard  = encodeURIComponent(card.name);
  const cardmarketUrl =
    tcgdex?.pricing?.cardmarket?.url ??
    `https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=${encodedCard}`;

  const rarity = card.rarity as CardRarity;
  const types: string[] = tcgdex?.types ?? [];

  function formatEur(value: number) {
    return value.toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const totalCards = card.serie.cardCount;

  const cardJsonLd = generateCardJsonLd(
    {
      id:       card.id,
      name:     card.name,
      number:   card.number,
      rarity:   CARD_RARITY_LABELS[rarity] ?? null,
      imageUrl: card.imageUrl,
    },
    { name: card.serie.name },
    { name: card.serie.bloc.name },
  );

  // Breadcrumb JSON-LD — 5 levels so Google can display the full taxonomy
  // in the SERP (app.pokeitem.fr › Collection › Bloc › Série › Carte) even
  // though the canonical URL is flat (/carte/[id]). Per Mueller URL depth
  // doesn't affect ranking, so we keep the flat URL and let the breadcrumb
  // carry the hierarchy.
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Accueil",            url: "/" },
    { name: "Collection",         url: "/collection/cartes" },
    { name: card.serie.bloc.name, url: `/collection/cartes/${card.serie.bloc.slug}` },
    { name: card.serie.name,      url: `/collection/cartes/${card.serie.bloc.slug}/${card.serie.slug}` },
    { name: `${card.name} n°${card.number}`, url: `/carte/${card.id}` },
  ]);

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:px-6">
      <JsonLd data={cardJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      {/* Back */}
      <div className="mb-5">
        <BackButton label="Retour" />
      </div>

      {/* Card image */}
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

      {/* Card info */}
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
            <dt className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide mb-0.5">Numéro</dt>
            <dd className="font-medium text-[var(--text-primary)]">
              {card.number}{totalCards ? `/${totalCards}` : ""}
            </dd>
          </div>

          <div>
            <dt className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide mb-0.5">Rareté</dt>
            <dd className="font-medium text-[var(--text-primary)]">
              {CARD_RARITY_SYMBOL[rarity]} {CARD_RARITY_LABELS[rarity]}
            </dd>
          </div>

          {types.length > 0 && (
            <div>
              <dt className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide mb-0.5">Type</dt>
              <dd className="font-medium text-[var(--text-primary)]">{types.join(", ")}</dd>
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

      {/* Pricing */}
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
                  <p className={`text-lg font-bold ${frPrice !== null ? "text-[var(--text-primary)]" : "text-emerald-400"}`}>
                    {formatEur(trendPrice)}
                  </p>
                </div>
              )}
              {lowPrice !== null && (
                <div>
                  <p className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide mb-0.5">
                    À partir de
                  </p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">{formatEur(lowPrice)}</p>
                </div>
              )}
              {card.priceReverse !== null && card.priceReverse !== undefined && (
                <div>
                  <p className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide mb-0.5">
                    Reverse
                  </p>
                  <p className="text-lg font-bold text-emerald-400">{formatEur(card.priceReverse)}</p>
                </div>
              )}
            </div>

            {(avg7 !== null || avg30 !== null) && (
              <div className="mt-3 flex gap-4 text-xs text-[var(--text-secondary)]">
                {avg7  !== null && <span>Moy. 7j : {formatEur(avg7)}</span>}
                {avg30 !== null && <span>Moy. 30j : {formatEur(avg30)}</span>}
              </div>
            )}
          </div>

          {/* Marketplace buttons */}
          <div className="px-5 py-4 flex flex-col gap-2">
            <a
              href={cardmarketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-black"
            >
              Acheter sur Cardmarket
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Remove from collection */}
      {ownedVersions.length > 0 && (
        <RemoveCardButton cardId={card.id} versions={ownedVersions} />
      )}
    </div>
  );
}
