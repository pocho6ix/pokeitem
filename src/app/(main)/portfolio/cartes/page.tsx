import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BinderCartesWrapper } from "@/components/cards/BinderCartesWrapper";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { prisma } from "@/lib/prisma";
import { getPriceForVersion } from "@/lib/display-price";
import type { BlocCardProgress } from "@/types/card";

export const metadata: Metadata = {
  title: "Cartes — Mon Classeur | PokeItem",
  description: "Consultez et gérez votre collection de cartes Pokémon TCG par série.",
};

export const revalidate = 0; // dynamic — owned data is per-user

async function buildBlocProgress(userId: string | null, rarityFilter?: string | null): Promise<BlocCardProgress[]> {
  const seriesInDb = await prisma.serie.findMany({
    select: {
      id:           true,
      slug:         true,
      name:         true,
      abbreviation: true,
      imageUrl:     true,
      cardCount:    true,
      bloc: { select: { slug: true } },
    },
  });

  // Owned card counts + market values per serie
  const ownedBySerieId = new Map<string, number>();
  const valueBySerieId = new Map<string, number>();
  // Total cards per serie for the active rarity (used when filter is active)
  const totalByRaritySerieId = new Map<string, number>();

  if (userId) {
    const rarityWhere = rarityFilter ? { card: { rarity: rarityFilter as never } } : {};

    // Unique-card count (distinct cardId for completion %)
    const ownedDistinct = await prisma.userCard.findMany({
      where: { userId, ...rarityWhere },
      select: { card: { select: { serieId: true } }, cardId: true },
      distinct: ["cardId"],
    });
    for (const uc of ownedDistinct) {
      const sid = uc.card.serieId;
      ownedBySerieId.set(sid, (ownedBySerieId.get(sid) ?? 0) + 1);
    }

    // Market value = price × quantity; prefer FR price when available
    const ownedWithPrices = await prisma.userCard.findMany({
      where: { userId, ...rarityWhere },
      select: {
        quantity: true,
        version:  true,
        card: { select: { serieId: true, price: true, priceFr: true, priceReverse: true } },
      },
    });
    for (const uc of ownedWithPrices) {
      const sid   = uc.card.serieId;
      const price = getPriceForVersion(uc.card, uc.version);
      valueBySerieId.set(sid, (valueBySerieId.get(sid) ?? 0) + price * uc.quantity);
    }

    // When rarity filter is active: compute total cards of that rarity per serie
    if (rarityFilter) {
      const totalByRarity = await prisma.card.groupBy({
        by: ["serieId"],
        where: { rarity: rarityFilter as never },
        _count: { id: true },
      });
      for (const r of totalByRarity) {
        totalByRaritySerieId.set(r.serieId, r._count.id);
      }
    }
  }

  const countBySlug = new Map(seriesInDb.map((s) => [s.slug, s.cardCount ?? 0]));

  const releaseDateBySlug = new Map(
    SERIES.map((s) => [s.slug, s.releaseDate ? new Date(s.releaseDate).getTime() : 0])
  );

  return BLOCS.map((bloc) => {
    const blocSeries = seriesInDb.filter((s) => s.bloc.slug === bloc.slug);
    const sorted = [...blocSeries].sort((a, b) => {
      const da = releaseDateBySlug.get(a.slug) ?? 0;
      const db = releaseDateBySlug.get(b.slug) ?? 0;
      return db - da;
    });

    // Only keep series where the user owns at least one card
    const seriesWithCards = sorted
      .map((serie) => ({
        serieSlug:         serie.slug,
        serieName:         serie.name,
        serieAbbreviation: serie.abbreviation ?? null,
        serieImageUrl:     serie.imageUrl ?? null,
        totalCards:   rarityFilter
          ? (totalByRaritySerieId.get(serie.id) ?? 0)
          : (countBySlug.get(serie.slug) ?? 0),
        ownedCards:   ownedBySerieId.get(serie.id) ?? 0,
        marketValue:  Math.round((valueBySerieId.get(serie.id) ?? 0) * 100) / 100,
      }))
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
    <BinderCartesWrapper
      blocs={blocs}
      baseUrl="/portfolio/cartes"
    />
  );
}
