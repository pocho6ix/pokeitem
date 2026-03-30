import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TabNav } from "@/components/ui/TabNav";
import { BlocSerieCardList } from "@/components/cards/BlocSerieCardList";
import { BLOCS } from "@/data/blocs";
import { prisma } from "@/lib/prisma";
import type { BlocCardProgress } from "@/types/card";

export const metadata: Metadata = {
  title: "Collection Cartes Pokémon TCG | PokeItem",
  description: "Explorez toutes les cartes Pokémon TCG par série et extension.",
};

export const revalidate = 0; // dynamic — owned data is per-user

async function buildBlocProgress(userId: string | null): Promise<BlocCardProgress[]> {
  // ── Fetch all series with their card counts ───────────────────────────
  const seriesInDb = await prisma.serie.findMany({
    select: {
      id:          true,
      slug:        true,
      name:        true,
      abbreviation: true,
      imageUrl:    true,
      cardCount:   true,
      bloc: { select: { slug: true } },
    },
  });

  // ── Fetch owned card counts per serie for this user ───────────────────
  const ownedBySerieId = new Map<string, number>();

  if (userId) {
    // Count unique cards per serie (one card = one slot, regardless of versions owned)
    const owned = await prisma.userCard.findMany({
      where: { userId },
      select: { card: { select: { serieId: true } }, cardId: true },
      distinct: ["cardId"],
    });
    for (const uc of owned) {
      const sid = uc.card.serieId;
      ownedBySerieId.set(sid, (ownedBySerieId.get(sid) ?? 0) + 1);
    }
  }

  const countBySlug = new Map(seriesInDb.map((s) => [s.slug, s.cardCount ?? 0]));

  return BLOCS.map((bloc) => {
    const blocSeries = seriesInDb.filter((s) => s.bloc.slug === bloc.slug);

    const sorted = [...blocSeries].sort((a, b) => {
      const diff = (b.cardCount ?? 0) - (a.cardCount ?? 0);
      return diff !== 0 ? diff : a.name.localeCompare(b.name, "fr");
    });

    return {
      blocSlug:         bloc.slug,
      blocName:         bloc.name,
      blocAbbreviation: bloc.abbreviation ?? null,
      series: sorted.map((serie) => ({
        serieSlug:         serie.slug,
        serieName:         serie.name,
        serieAbbreviation: serie.abbreviation ?? null,
        serieImageUrl:     serie.imageUrl ?? null,
        totalCards:  countBySlug.get(serie.slug) ?? 0,
        ownedCards:  ownedBySerieId.get(serie.id) ?? 0,
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
