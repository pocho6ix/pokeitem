import type { Metadata } from "next";
import { TabNav } from "@/components/ui/TabNav";
import { BlocSerieCardList } from "@/components/cards/BlocSerieCardList";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import type { BlocCardProgress } from "@/types/card";

export const metadata: Metadata = {
  title: "Collection Cartes Pokémon TCG | PokeItem",
  description:
    "Explorez toutes les cartes Pokémon TCG par série et extension.",
};

function buildBlocProgress(): BlocCardProgress[] {
  return BLOCS.map((bloc) => {
    const blocSeries = SERIES.filter((s) => s.blocSlug === bloc.slug);

    return {
      blocSlug: bloc.slug,
      blocName: bloc.name,
      blocAbbreviation: bloc.abbreviation ?? null,
      series: blocSeries.map((serie) => ({
        serieSlug: serie.slug,
        serieName: serie.name,
        serieAbbreviation: serie.abbreviation ?? null,
        serieImageUrl: serie.imageUrl ?? null,
        totalCards: 0, // will be populated from DB once cards are seeded
        ownedCards: 0,
      })),
    };
  });
}

export default function CollectionCartesPage() {
  const blocs = buildBlocProgress();

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
