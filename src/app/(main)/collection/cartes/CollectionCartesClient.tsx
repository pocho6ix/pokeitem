"use client";

import { useEffect, useState } from "react";
import { TabNav } from "@/components/ui/TabNav";
import { HeroSearchBar } from "@/components/ui/HeroSearchBar";
import { BlocSerieCardList } from "@/components/cards/BlocSerieCardList";
import { fetchApi } from "@/lib/api";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import type { BlocCardProgress } from "@/types/card";

export function CollectionCartesClient() {
  const [blocs, setBlocs] = useState<BlocCardProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // TODO(backend): expose a GET /api/binder/blocs-progress endpoint
        // that returns the aggregated structure. For now, render the static
        // catalogue (all series, zero owned) so the page renders on mobile.
        if (cancelled) return;

        const releaseDateBySlug = new Map(
          SERIES.map((s) => [
            s.slug,
            s.releaseDate ? new Date(s.releaseDate).getTime() : 0,
          ]),
        );
        const orderBySlug = new Map(SERIES.map((s) => [s.slug, s.order ?? 999]));
        const imageUrlBySlug = new Map(SERIES.map((s) => [s.slug, s.imageUrl]));

        const staticBlocs: BlocCardProgress[] = BLOCS.map((bloc) => {
          const blocSeries = SERIES.filter((s) => s.blocSlug === bloc.slug);
          const sorted = [...blocSeries].sort((a, b) => {
            const da = releaseDateBySlug.get(a.slug) ?? 0;
            const db = releaseDateBySlug.get(b.slug) ?? 0;
            if (db !== da) return db - da;
            return (orderBySlug.get(a.slug) ?? 999) - (orderBySlug.get(b.slug) ?? 999);
          });
          return {
            blocSlug: bloc.slug,
            blocName: bloc.name,
            blocAbbreviation: bloc.abbreviation ?? null,
            series: sorted.map((serie) => ({
              serieSlug: serie.slug,
              serieName: serie.name,
              serieAbbreviation: serie.abbreviation ?? null,
              serieImageUrl: imageUrlBySlug.get(serie.slug) ?? null,
              totalCards: 0,
              ownedCards: 0,
              marketValue: 0,
              isComplete: false,
            })),
          };
        });

        setBlocs(staticBlocs);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <TabNav
        tabs={[
          { label: "Cartes", href: "/collection/cartes", active: true },
          { label: "Produits scellés", href: "/collection/produits", active: false },
        ]}
      />

      <div className="my-4 max-w-xl">
        <HeroSearchBar />
      </div>

      {loading ? (
        <div className="py-24 text-center text-sm text-[var(--text-secondary)]">
          Chargement…
        </div>
      ) : (
        <BlocSerieCardList
          blocs={blocs}
          baseUrl="/collection/cartes"
          showMarketValue={false}
        />
      )}
    </div>
  );
}
