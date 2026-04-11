import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TabNav } from "@/components/ui/TabNav";
import { BlocSerieCardList } from "@/components/cards/BlocSerieCardList";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { prisma } from "@/lib/prisma";
import { getCachedSeriesList } from "@/lib/cached-queries";
import { getPriceForVersion } from "@/lib/display-price";
import type { BlocCardProgress } from "@/types/card";

export const metadata: Metadata = {
  title: "Collection Cartes Pokémon TCG | PokeItem",
  description: "Explorez toutes les cartes Pokémon TCG par série et extension.",
};

export const revalidate = 0; // dynamic — owned data is per-user

async function buildBlocProgress(userId: string | null): Promise<BlocCardProgress[]> {
  // ── Fetch all series with their card counts (CDN-cached 1h) ─────────────
  const seriesInDb = await getCachedSeriesList();

  // ── Fetch owned card counts per serie for this user ───────────────────
  const ownedBySerieId = new Map<string, number>();
  const valueBySerieId = new Map<string, number>();

  if (userId) {
    // Both queries are independent — run in parallel
    const [owned, ownedWithPrices] = await Promise.all([
      // Count unique cards per serie (one card = one slot, regardless of versions owned)
      prisma.userCard.findMany({
        where: { userId },
        select: { card: { select: { serieId: true } }, cardId: true },
        distinct: ["cardId"],
      }),
      // Market value = price × quantity; prefer FR price when available
      prisma.userCard.findMany({
        where: { userId },
        select: {
          quantity: true,
          version:  true,
          card: { select: { serieId: true, price: true, priceFr: true, priceReverse: true } },
        },
      }),
    ]);

    for (const uc of owned) {
      const sid = uc.card.serieId;
      ownedBySerieId.set(sid, (ownedBySerieId.get(sid) ?? 0) + 1);
    }
    for (const uc of ownedWithPrices) {
      const sid = uc.card.serieId;
      const price = getPriceForVersion(uc.card, uc.version);
      valueBySerieId.set(sid, (valueBySerieId.get(sid) ?? 0) + price * uc.quantity);
    }
  }

  const countBySlug = new Map(seriesInDb.map((s) => [s.slug, s.cardCount ?? 0]));

  // Build lookups from static data (source of truth for logos, dates, order)
  const releaseDateBySlug = new Map(
    SERIES.map((s) => [s.slug, s.releaseDate ? new Date(s.releaseDate).getTime() : 0])
  );
  const orderBySlug    = new Map(SERIES.map((s) => [s.slug, s.order ?? 999]));
  const imageUrlBySlug = new Map(SERIES.map((s) => [s.slug, s.imageUrl]));

  return BLOCS.map((bloc) => {
    const blocSeries = seriesInDb.filter((s) => s.bloc.slug === bloc.slug);

    // Sort most recent first by releaseDate; use `order` ascending as tiebreaker (for null-date series)
    const sorted = [...blocSeries].sort((a, b) => {
      const da = releaseDateBySlug.get(a.slug) ?? 0;
      const db = releaseDateBySlug.get(b.slug) ?? 0;
      if (db !== da) return db - da;
      return (orderBySlug.get(a.slug) ?? 999) - (orderBySlug.get(b.slug) ?? 999);
    });

    return {
      blocSlug:         bloc.slug,
      blocName:         bloc.name,
      blocAbbreviation: bloc.abbreviation ?? null,
      series: sorted.map((serie) => ({
        serieSlug:         serie.slug,
        serieName:         serie.name,
        serieAbbreviation: serie.abbreviation ?? null,
        serieImageUrl:     imageUrlBySlug.get(serie.slug) ?? serie.imageUrl ?? null,
        totalCards:  countBySlug.get(serie.slug) ?? 0,
        ownedCards:  ownedBySerieId.get(serie.id) ?? 0,
        marketValue: Math.round((valueBySerieId.get(serie.id) ?? 0) * 100) / 100,
      })),
    };
  });
}

export default async function CollectionCartesPage() {
  const session = await getServerSession(authOptions);
  const userId  = (session?.user as { id?: string } | undefined)?.id ?? null;

  const blocs = await buildBlocProgress(userId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Collection Pokémon TCG
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Explorez et gérez votre collection de cartes par extension
        </p>
      </div>

      <TabNav
        tabs={[
          { label: "Cartes", href: "/collection/cartes", active: true },
          { label: "Produits scellés", href: "/collection/produits", active: false },
        ]}
      />

      <BlocSerieCardList blocs={blocs} baseUrl="/collection/cartes" />
    </div>
  );
}
