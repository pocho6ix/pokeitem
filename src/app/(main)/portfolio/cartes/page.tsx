import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BinderCartesWrapper } from "@/components/cards/BinderCartesWrapper";
import { HeroSearchBar } from "@/components/ui/HeroSearchBar";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { prisma } from "@/lib/prisma";
import { getCachedSeriesList } from "@/lib/cached-queries";
import { getPriceForVersion } from "@/lib/display-price";
import type { BlocCardProgress } from "@/types/card";

export const metadata: Metadata = {
  title: "Cartes — Mon Classeur | PokeItem",
  description: "Consultez et gérez votre collection de cartes Pokémon TCG par série.",
};

export const revalidate = 0; // dynamic — owned data is per-user

async function buildBlocProgress(userId: string | null, rarityFilter?: string | null): Promise<BlocCardProgress[]> {
  // CDN-cached 1h — user-independent dataset
  const seriesInDb = await getCachedSeriesList();

  // Owned card counts + market values per serie
  const ownedBySerieId = new Map<string, number>();
  const valueBySerieId = new Map<string, number>();
  // Total cards per serie for the active rarity (used when filter is active)
  const totalByRaritySerieId = new Map<string, number>();

  if (userId) {
    const rarityWhere = rarityFilter ? { card: { rarity: rarityFilter as never } } : {};

    // All independent queries run in parallel
    const [ownedDistinct, ownedWithPrices, totalByRarity] = await Promise.all([
      // Unique-card count (distinct cardId for completion %)
      // Note: distinct + relation select can produce invalid SQL in some Prisma versions;
      // groupBy on cardId is more reliable and equally expressive.
      prisma.userCard.groupBy({
        by: ["cardId"],
        where: { userId, ...rarityWhere },
      }).then(async (rows) => {
        const cardIds = rows.map((r) => r.cardId);
        const cards = await prisma.card.findMany({
          where: { id: { in: cardIds } },
          select: { id: true, serieId: true },
        });
        return cards.map((c) => ({ cardId: c.id, card: { serieId: c.serieId } }));
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

    for (const uc of ownedDistinct) {
      const sid = uc.card.serieId;
      ownedBySerieId.set(sid, (ownedBySerieId.get(sid) ?? 0) + 1);
    }
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
      .map((serie) => ({
        serieSlug:         serie.slug,
        serieName:         serie.name,
        serieAbbreviation: serie.abbreviation ?? null,
        serieImageUrl:     imageUrlBySlug.get(serie.slug) ?? serie.imageUrl ?? null,
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
    <>
      <Link href="/portfolio" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Classeur
      </Link>
      <div className="mb-4 max-w-xl">
        <HeroSearchBar ownedOnly />
      </div>
      <BinderCartesWrapper blocs={blocs} baseUrl="/portfolio/cartes" />
    </>
  );
}
