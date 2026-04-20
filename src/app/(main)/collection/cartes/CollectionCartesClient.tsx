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

/**
 * Mobile-only catalog listing. On the web build, `page.tsx` runs as an
 * RSC and queries Prisma directly. Here we aggregate from the existing
 * `/api/cards/cards-by-rarity` response (which includes `serieName` per
 * owned card) so we can fill in `ownedCards` per serie. `totalCards` is
 * only available server-side for now — displayed as "?" which the list
 * component renders gracefully.
 */
export function CollectionCartesClient() {
  const [blocs, setBlocs] = useState<BlocCardProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // ── Owned aggregation ────────────────────────────────────────
      // Map<serieName, { ownedCards, marketValue }>. Using name (not slug)
      // because cards-by-rarity only returns `serieName`.
      const ownedBySerieName = new Map<
        string,
        { ownedCards: Set<string>; marketValue: number }
      >();
      try {
        const res = await fetchApi("/api/cards/cards-by-rarity");
        if (res.ok) {
          const sections: CardsByRarityResponse = await res.json();
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
      } catch {
        /* swallow — render static catalog on error */
      }

      if (cancelled) return;

      // ── Build static catalog from BLOCS × SERIES, enriched with owned ──
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
            return {
              serieSlug: serie.slug,
              serieName: serie.name,
              serieAbbreviation: serie.abbreviation ?? null,
              serieImageUrl: imageUrlBySlug.get(serie.slug) ?? null,
              totalCards: 0, // unknown client-side → rendered as "?"
              ownedCards: owned?.ownedCards.size ?? 0,
              marketValue: owned ? Math.round(owned.marketValue * 100) / 100 : 0,
              isComplete: false,
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
