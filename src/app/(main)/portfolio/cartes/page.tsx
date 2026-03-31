import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BlocSerieCardList } from "@/components/cards/BlocSerieCardList";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { prisma } from "@/lib/prisma";
import type { BlocCardProgress } from "@/types/card";

export const metadata: Metadata = {
  title: "Cartes — Mon Classeur | PokeItem",
  description: "Consultez et gérez votre collection de cartes Pokémon TCG par série.",
};

export const revalidate = 0; // dynamic — owned data is per-user

async function buildBlocProgress(userId: string | null): Promise<BlocCardProgress[]> {
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

  if (userId) {
    // Unique-card count (distinct cardId for completion %)
    const ownedDistinct = await prisma.userCard.findMany({
      where: { userId },
      select: { card: { select: { serieId: true } }, cardId: true },
      distinct: ["cardId"],
    });
    for (const uc of ownedDistinct) {
      const sid = uc.card.serieId;
      ownedBySerieId.set(sid, (ownedBySerieId.get(sid) ?? 0) + 1);
    }

    // Market value = price × quantity; REVERSE version uses priceReverse
    const ownedWithPrices = await prisma.userCard.findMany({
      where: { userId },
      select: {
        quantity: true,
        version:  true,
        card: { select: { serieId: true, price: true, priceReverse: true } },
      },
    });
    for (const uc of ownedWithPrices) {
      const sid   = uc.card.serieId;
      const price =
        uc.version === "REVERSE"
          ? (uc.card.priceReverse ?? uc.card.price ?? 0)
          : (uc.card.price ?? 0);
      valueBySerieId.set(sid, (valueBySerieId.get(sid) ?? 0) + price * uc.quantity);
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
        totalCards:   countBySlug.get(serie.slug) ?? 0,
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

export default async function PortfolioCartesPage() {
  const session = await getServerSession(authOptions);
  const userId  = (session?.user as { id?: string } | undefined)?.id ?? null;

  const blocs = await buildBlocProgress(userId);

  // The layout (layout.tsx) renders the title, stats and TabNav.
  // This page only renders the card list itself.
  // baseUrl points to /collection/cartes so clicking a serie opens the interactive card grid.
  return (
    <BlocSerieCardList
      blocs={blocs}
      baseUrl="/collection/cartes"
    />
  );
}
