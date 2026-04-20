"use client";

import { useEffect, useState } from "react";
import { TabNav } from "@/components/ui/TabNav";
import { HeroSearchBar } from "@/components/ui/HeroSearchBar";
import { BlocSerieCardList } from "@/components/cards/BlocSerieCardList";
import { fetchApi } from "@/lib/api";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import type { BlocCardProgress } from "@/types/card";

type CardsByRarityResponse = Array<{
  rarityKey: string;
  cardCount: number;
  totalValue: number;
  cards: Array<{
    id: string;
    name: string;
    imageUrl: string | null;
    price: number;
    serieName: string;
  }>;
}>;

type SeriesResponse = {
  series: Array<{
    slug: string;
    name: string;
    cardCount: number | null;
  }>;
};

/**
 * Mobile-only catalog listing. The web build runs this page as a RSC
 * and queries Prisma directly. Here we fan out to:
 *   - GET /api/series                → total `cardCount` per serie
 *   - GET /api/cards/cards-by-rarity → owned cards (grouped by
 *                                      `serieName`) + market value
 * then stitch the two together for the BlocSerieCardList.
 */
export function CollectionCartesClient() {
  const [blocs, setBlocs] = useState<BlocCardProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // ── Owned aggregation (by serie name, as returned by the backend) ──
      const ownedBySerieName = new Map<
        string,
        { ownedCards: Set<string>; marketValue: number }
      >();
      // ── Total card count per serie slug ───────────────────────────────
      const totalBySlug = new Map<string, number>();

      try {
        const [rarityRes, seriesRes] = await Promise.all([
          fetchApi("/api/cards/cards-by-rarity"),
          fetchApi("/api/series"),
        ]);

        if (rarityRes.ok) {
          const sections: CardsByRarityResponse = await rarityRes.json();
          for (const section of sections) {
            for (const card of section.cards ?? []) {
              const key = card.serieName;
              if (!ownedBySerieName.has(key)) {
                ownedBySerieName.set(key, { ownedCards: new Set(), marketValue: 0 });
              }
              const agg = ownedBySerieName.get(key)!;
              agg.ownedCards.add(card.id);
              agg.marketValue += card.price ?? 0;
            }
          }
        }

        if (seriesRes.ok) {
          const data: SeriesResponse = await seriesRes.json();
          for (const s of data.series ?? []) {
            if (s.cardCount != null) totalBySlug.set(s.slug, s.cardCount);
          }
        }
      } catch {
        /* swallow — render catalog with "?" on error */
      }

      if (cancelled) return;

      const releaseDateBySlug = new Map(
        SERIES.map((s) => [
          s.slug,
          s.releaseDate ? new Date(s.releaseDate).getTime() : 0,
        ]),
      );
      const orderBySlug = new Map(SERIES.map((s) => [s.slug, s.order ?? 999]));
      const imageUrlBySlug = new Map(SERIES.map((s) => [s.slug, s.imageUrl]));

      const result: BlocCardProgress[] = BLOCS.map((bloc) => {
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
          series: sorted.map((serie) => {
            const owned = ownedBySerieName.get(serie.name);
            const totalCards = totalBySlug.get(serie.slug) ?? 0;
            const ownedCards = owned?.ownedCards.size ?? 0;
            return {
              serieSlug: serie.slug,
              serieName: serie.name,
              serieAbbreviation: serie.abbreviation ?? null,
              serieImageUrl: imageUrlBySlug.get(serie.slug) ?? null,
              totalCards,
              ownedCards,
              marketValue: owned ? Math.round(owned.marketValue * 100) / 100 : 0,
              isComplete: totalCards > 0 && ownedCards >= totalCards,
            };
          }),
        };
      });

      setBlocs(result);
      setLoading(false);
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
