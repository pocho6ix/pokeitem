import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TabNav } from "@/components/ui/TabNav";
import { HeroSearchBar } from "@/components/ui/HeroSearchBar";
import { BlocSerieCardList } from "@/components/cards/BlocSerieCardList";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { prisma } from "@/lib/prisma";
import { getCachedSeriesList, getCachedSerieCardCounts } from "@/lib/cached-queries";
import { getPriceForVersion } from "@/lib/display-price";
import { getSerieVersions } from "@/data/card-versions";
import type { BlocCardProgress } from "@/types/card";

export const metadata: Metadata = {
  title: "Collection Cartes Pokémon TCG | PokeItem",
  description: "Explorez toutes les cartes Pokémon TCG par série et extension.",
};

export const revalidate = 0; // dynamic — owned data is per-user

async function buildBlocProgress(userId: string | null): Promise<BlocCardProgress[]> {
  // ── Fetch all series + card counts (total / special) ──────────────────
  const [seriesInDb, cardCounts] = await Promise.all([
    getCachedSeriesList(),
    getCachedSerieCardCounts(),
  ]);

  // ── Fetch owned card / slot counts per serie for this user ────────────
  const ownedBySerieId = new Map<string, number>();          // unique cardIds
  const ownedSlotsBySerieId = new Map<string, number>();     // unique (cardId, version) pairs
  const valueBySerieId = new Map<string, number>();

  if (userId) {
    // Both queries are independent — run in parallel
    const [owned, ownedWithPrices] = await Promise.all([
      // All (cardId, version) slots owned by this user — no `distinct`,
      // we aggregate client-side so we get both:
      //  • ownedCards   = unique cardIds per serie  (progress %)
      //  • ownedSlots   = unique (cardId, version) per serie (completion check)
      prisma.userCard.findMany({
        where: { userId },
        select: { cardId: true, version: true, card: { select: { serieId: true } } },
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

    const cardsBySerie = new Map<string, Set<string>>();
    const slotsBySerie = new Map<string, Set<string>>();
    for (const uc of owned) {
      const sid = uc.card.serieId;
      if (!cardsBySerie.has(sid)) cardsBySerie.set(sid, new Set());
      if (!slotsBySerie.has(sid)) slotsBySerie.set(sid, new Set());
      cardsBySerie.get(sid)!.add(uc.cardId);
      slotsBySerie.get(sid)!.add(`${uc.cardId}:${uc.version}`);
    }
    for (const [sid, set] of cardsBySerie) ownedBySerieId.set(sid, set.size);
    for (const [sid, set] of slotsBySerie) ownedSlotsBySerieId.set(sid, set.size);

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
      series: sorted.map((serie) => {
        // Completion = user owns every applicable (cardId, version) slot.
        // Slots = (normalCards × versions.length) + specialCards (NORMAL only).
        const versions = getSerieVersions(serie.slug, bloc.slug);
        const counts = cardCounts[serie.id] ?? { total: 0, special: 0 };
        const normalCards = counts.total - counts.special;
        const totalSlots  = normalCards * versions.length + counts.special;
        const ownedSlots  = ownedSlotsBySerieId.get(serie.id) ?? 0;
        const isComplete  = totalSlots > 0 && ownedSlots >= totalSlots;

        return {
          serieSlug:         serie.slug,
          serieName:         serie.name,
          serieAbbreviation: serie.abbreviation ?? null,
          serieImageUrl:     imageUrlBySlug.get(serie.slug) ?? serie.imageUrl ?? null,
          totalCards:  countBySlug.get(serie.slug) ?? 0,
          ownedCards:  ownedBySerieId.get(serie.id) ?? 0,
          marketValue: Math.round((valueBySerieId.get(serie.id) ?? 0) * 100) / 100,
          isComplete,
        };
      }),
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

      <div className="my-4 max-w-xl">
        <HeroSearchBar ownedOnly />
      </div>

      <BlocSerieCardList blocs={blocs} baseUrl="/collection/cartes" />
    </div>
  );
}
