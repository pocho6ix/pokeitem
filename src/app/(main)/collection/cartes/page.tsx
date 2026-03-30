import type { Metadata } from "next";
import { TabNav } from "@/components/ui/TabNav";
import { BlocSerieCardList } from "@/components/cards/BlocSerieCardList";
import { BLOCS } from "@/data/blocs";
import { prisma } from "@/lib/prisma";
import type { BlocCardProgress } from "@/types/card";

export const metadata: Metadata = {
  title: "Collection Cartes Pokémon TCG | PokeItem",
  description: "Explorez toutes les cartes Pokémon TCG par série et extension.",
};

export const revalidate = 3600; // re-fetch at most every hour

async function buildBlocProgress(): Promise<BlocCardProgress[]> {
  // Fetch all series with their card counts from DB
  const seriesInDb = await prisma.serie.findMany({
    select: {
      slug: true,
      name: true,
      abbreviation: true,
      imageUrl: true,
      cardCount: true,
      bloc: { select: { slug: true } },
    },
  });

  const countBySlug = new Map(
    seriesInDb.map((s) => [s.slug, s.cardCount ?? 0])
  );

  return BLOCS.map((bloc) => {
    const blocSeries = seriesInDb.filter((s) => s.bloc.slug === bloc.slug);

    // Sort: series with cards first, then by name
    const sorted = [...blocSeries].sort((a, b) => {
      const diff = (b.cardCount ?? 0) - (a.cardCount ?? 0);
      return diff !== 0 ? diff : a.name.localeCompare(b.name, "fr");
    });

    return {
      blocSlug: bloc.slug,
      blocName: bloc.name,
      blocAbbreviation: bloc.abbreviation ?? null,
      series: sorted.map((serie) => ({
        serieSlug: serie.slug,
        serieName: serie.name,
        serieAbbreviation: serie.abbreviation ?? null,
        serieImageUrl: serie.imageUrl ?? null,
        totalCards: countBySlug.get(serie.slug) ?? 0,
        ownedCards: 0, // will come from user session once auth is wired
      })),
    };
  });
}

export default async function CollectionCartesPage() {
  const blocs = await buildBlocProgress();

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
          { label: "Produits scellés", href: "/collection", active: false },
          { label: "Cartes", href: "/collection/cartes", active: true },
        ]}
      />

      <BlocSerieCardList blocs={blocs} baseUrl="/collection/cartes" />
    </div>
  );
}
