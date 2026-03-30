"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TabNav } from "@/components/ui/TabNav";
import { BlocSerieCardList } from "@/components/cards/BlocSerieCardList";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import type { BlocCardProgress } from "@/types/card";

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
        totalCards: 0, // will be fetched from API once DB is seeded
        ownedCards: 0,
      })),
    };
  });
}

export default function PortfolioCartesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading" || !session) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const blocs = buildBlocProgress();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Mon Portfolio
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Gérez votre collection de cartes Pokémon TCG
        </p>
      </div>

      <TabNav
        tabs={[
          { label: "Items", href: "/portfolio", active: false },
          { label: "Cartes", href: "/portfolio/cartes", active: true },
        ]}
      />

      <BlocSerieCardList blocs={blocs} baseUrl="/portfolio/cartes" />
    </div>
  );
}
