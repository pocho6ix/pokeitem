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
      } catch (err) {
        console.error("portfolio/cartes load failed:", err);
      }

      if (cancelled) return;

      const imageUrlBySlug = new Map(SERIES.map((s) => [s.slug, s.imageUrl]));

      // On the classeur page we only keep series the user actually owns
      // at least one card from — mirrors the web RSC behaviour.
      const progress: BlocCardProgress[] = BLOCS.map((bloc) => ({
        blocSlug: bloc.slug,
        blocName: bloc.name,
        blocAbbreviation: bloc.abbreviation ?? null,
        series: SERIES.filter((s) => s.blocSlug === bloc.slug)
          .map((s) => {
            const owned = ownedBySerieName.get(s.name);
            return {
              serieSlug: s.slug,
              serieName: s.name,
              serieAbbreviation: s.abbreviation ?? null,
              serieImageUrl: imageUrlBySlug.get(s.slug) ?? null,
              totalCards: 0,
              ownedCards: owned?.ownedCards.size ?? 0,
              marketValue: owned ? Math.round(owned.marketValue * 100) / 100 : 0,
              isComplete: false,
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
