"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BinderCartesWrapper } from "@/components/cards/BinderCartesWrapper";
import { HeroSearchBar } from "@/components/ui/HeroSearchBar";
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

export function PortfolioCartesClient() {
  return (
    <Suspense fallback={null}>
      <PortfolioCartesContent />
    </Suspense>
  );
}

function PortfolioCartesContent() {
  const searchParams = useSearchParams();
  const rarity = searchParams.get("rarity");
  const [blocs, setBlocs] = useState<BlocCardProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ownedBySerieName = new Map<
        string,
        { ownedCards: Set<string>; marketValue: number }
      >();
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
      } catch (err) {
        console.error("portfolio/cartes load failed:", err);
      }

      if (cancelled) return;

      const imageUrlBySlug = new Map(SERIES.map((s) => [s.slug, s.imageUrl]));

      // Classeur only keeps series the user actually owns at least one card
      // from — mirrors the web RSC behaviour.
      const progress: BlocCardProgress[] = BLOCS.map((bloc) => ({
        blocSlug: bloc.slug,
        blocName: bloc.name,
        blocAbbreviation: bloc.abbreviation ?? null,
        series: SERIES.filter((s) => s.blocSlug === bloc.slug)
          .map((s) => {
            const owned = ownedBySerieName.get(s.name);
            const totalCards = totalBySlug.get(s.slug) ?? 0;
            const ownedCards = owned?.ownedCards.size ?? 0;
            return {
              serieSlug: s.slug,
              serieName: s.name,
              serieAbbreviation: s.abbreviation ?? null,
              serieImageUrl: imageUrlBySlug.get(s.slug) ?? null,
              totalCards,
              ownedCards,
              marketValue: owned ? Math.round(owned.marketValue * 100) / 100 : 0,
              isComplete: totalCards > 0 && ownedCards >= totalCards,
            };
          })
          .filter((s) => s.ownedCards > 0),
      })).filter((bloc) => bloc.series.length > 0);

      setBlocs(progress);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [rarity]);

  return (
    <>
      <div className="mb-4 max-w-xl">
        <HeroSearchBar ownedOnly />
      </div>
      {loading ? (
        <div className="py-24 text-center text-sm text-[var(--text-secondary)]">
          Chargement…
        </div>
      ) : (
        <BinderCartesWrapper blocs={blocs} baseUrl="/portfolio/cartes" />
      )}
    </>
  );
}
