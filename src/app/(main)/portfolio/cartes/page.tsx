import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BinderCartesWrapper } from "@/components/cards/BinderCartesWrapper";
import { HeroSearchBar } from "@/components/ui/HeroSearchBar";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { prisma } from "@/lib/prisma";
import { getCachedSeriesList, getCachedSerieCardCounts } from "@/lib/cached-queries";
import { getPriceForVersion } from "@/lib/display-price";
import { getSerieVersions } from "@/data/card-versions";
import type { BlocCardProgress } from "@/types/card";

export const metadata: Metadata = {
  title: "Cartes — Mon Classeur | PokeItem",
  description: "Consultez et gérez votre collection de cartes Pokémon TCG par série.",
};

export const revalidate = 0; // dynamic — owned data is per-user

async function buildBlocProgress(userId: string | null, rarityFilter?: string | null): Promise<BlocCardProgress[]> {
  // CDN-cached — user-independent datasets
  const [seriesInDb, cardCounts] = await Promise.all([
    getCachedSeriesList(),
    getCachedSerieCardCounts(),
  ]);

  // Owned card counts + market values per serie
  const ownedBySerieId = new Map<string, number>();        // unique cardIds
  const ownedSlotsBySerieId = new Map<string, number>();   // unique (cardId, version) pairs
  const valueBySerieId = new Map<string, number>();
  // Total cards per serie for the active rarity (used when filter is active)
  const totalByRaritySerieId = new Map<string, number>();

  if (userId) {
    const rarityWhere = rarityFilter ? { card: { rarity: rarityFilter as never } } : {};

    // All independent queries run in parallel
    const [ownedRaw, ownedWithPrices, totalByRarity] = await Promise.all([
      // All (cardId, version) pairs owned — aggregated client-side so we get
      // both unique-card count (progress %) and unique-slot count (completion)
      prisma.userCard.findMany({
        where: { userId, ...rarityWhere },
        select: { cardId: true, version: true, card: { select: { serieId: true } } },
      }),
      // Market value = price × quantity; prefer FR price when available
      prisma.userCard.findMany({
        where: { userId, ...rarityWhere },
        select: {
          quantity: true,
          version:  true,
          card: { select: { serieId: true, price: true, priceFr: true, priceReverse: true } },
        },
      }),
      // Total cards of that rarity per serie (only when filter is active)
      rarityFilter
        ? prisma.card.groupBy({
            by: ["serieId"],
            where: { rarity: rarityFilter as never },
            _count: { id: true },
          })
        : Promise.resolve([]),
    ]);

    const cardsBySerie = new Map<string, Set<string>>();
    const slotsBySerie = new Map<string, Set<string>>();
    for (const uc of ownedRaw) {
      const sid = uc.card.serieId;
      if (!cardsBySerie.has(sid)) cardsBySerie.set(sid, new Set());
      if (!slotsBySerie.has(sid)) slotsBySerie.set(sid, new Set());
      cardsBySerie.get(sid)!.add(uc.cardId);
      slotsBySerie.get(sid)!.add(`${uc.cardId}:${uc.version}`);
    }
    for (const [sid, set] of cardsBySerie) ownedBySerieId.set(sid, set.size);
    for (const [sid, set] of slotsBySerie) ownedSlotsBySerieId.set(sid, set.size);

    for (const uc of ownedWithPrices) {
      const sid   = uc.card.serieId;
      const price = getPriceForVersion(uc.card, uc.version);
      valueBySerieId.set(sid, (valueBySerieId.get(sid) ?? 0) + price * uc.quantity);
    }
    for (const r of totalByRarity) {
      totalByRaritySerieId.set(r.serieId, r._count.id);
    }
  }

  const countBySlug = new Map(seriesInDb.map((s) => [s.slug, s.cardCount ?? 0]));

  const releaseDateBySlug = new Map(
    SERIES.map((s) => [s.slug, s.releaseDate ? new Date(s.releaseDate).getTime() : 0])
  );
  const orderBySlug    = new Map(SERIES.map((s) => [s.slug, s.order ?? 999]));
  const imageUrlBySlug = new Map(SERIES.map((s) => [s.slug, s.imageUrl]));

  return BLOCS.map((bloc) => {
    const blocSeries = seriesInDb.filter((s) => s.bloc.slug === bloc.slug);
    const sorted = [...blocSeries].sort((a, b) => {
      const da = releaseDateBySlug.get(a.slug) ?? 0;
      const db = releaseDateBySlug.get(b.slug) ?? 0;
      if (db !== da) return db - da;
      return (orderBySlug.get(a.slug) ?? 999) - (orderBySlug.get(b.slug) ?? 999);
    });

    // Only keep series where the user owns at least one card
    const seriesWithCards = sorted
      .map((serie) => {
        // Completion ignored when a rarity filter is active (totals are partial)
        let isComplete = false;
        if (!rarityFilter) {
          const versions = getSerieVersions(serie.slug, bloc.slug);
          const counts = cardCounts[serie.id] ?? { total: 0, special: 0 };
          const normalCards = counts.total - counts.special;
          const totalSlots  = normalCards * versions.length + counts.special;
          const ownedSlots  = ownedSlotsBySerieId.get(serie.id) ?? 0;
          isComplete = totalSlots > 0 && ownedSlots >= totalSlots;
        }

        return {
          serieSlug:         serie.slug,
          serieName:         serie.name,
          serieAbbreviation: serie.abbreviation ?? null,
          serieImageUrl:     imageUrlBySlug.get(serie.slug) ?? serie.imageUrl ?? null,
          totalCards:   rarityFilter
            ? (totalByRaritySerieId.get(serie.id) ?? 0)
            : (countBySlug.get(serie.slug) ?? 0),
          ownedCards:   ownedBySerieId.get(serie.id) ?? 0,
          marketValue:  Math.round((valueBySerieId.get(serie.id) ?? 0) * 100) / 100,
          isComplete,
        };
      })
      .filter((s) => s.ownedCards > 0);

    return {
      blocSlug:         bloc.slug,
      blocName:         bloc.name,
      blocAbbreviation: bloc.abbreviation ?? null,
      series: seriesWithCards,
    };
  // Drop blocs with no owned series
  }).filter((bloc) => bloc.series.length > 0);
}

export default async function PortfolioCartesPage({
  searchParams,
}: {
  searchParams: Promise<{ rarity?: string }>
}) {
  const session = await getServerSession(authOptions);
  const userId  = (session?.user as { id?: string } | undefined)?.id ?? null;
  const { rarity } = await searchParams;

  const blocs = await buildBlocProgress(userId, rarity ?? null);

  // The layout (layout.tsx) renders the title, stats and TabNav.
  // This page only renders the card list itself.
  // baseUrl points to /portfolio/cartes so navigation stays in classeur context.
  return (
    <>
      <div className="mb-4 max-w-xl">
        <HeroSearchBar ownedOnly />
      </div>
      <BinderCartesWrapper blocs={blocs} baseUrl="/portfolio/cartes" />
    </>
  );
}
