"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BinderCartesWrapper } from "@/components/cards/BinderCartesWrapper";
import { HeroSearchBar } from "@/components/ui/HeroSearchBar";
import { fetchApi } from "@/lib/api";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import type { BlocCardProgress } from "@/types/card";

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
      try {
        // Aggregate client-side from the user's raw card collection.
        const res = await fetchApi("/api/cards/collection");
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (cancelled) return;

        const cards: Array<{
          cardId: string;
          version: string;
          quantity: number;
        }> = data.cards ?? [];

        // Build owned sets per serie — we don't have serieId on each row,
        // so we can only count raw totals for now. A dedicated endpoint
        // that returns joined card data will improve this.
        const ownedCountByCardId = new Map<string, number>();
        for (const uc of cards) {
          ownedCountByCardId.set(
            uc.cardId,
            (ownedCountByCardId.get(uc.cardId) ?? 0) + 1,
          );
        }

        const imageUrlBySlug = new Map(
          SERIES.map((s) => [s.slug, s.imageUrl]),
        );

        const progress: BlocCardProgress[] = BLOCS.map((bloc) => ({
          blocSlug: bloc.slug,
          blocName: bloc.name,
          blocAbbreviation: bloc.abbreviation ?? null,
          series: SERIES.filter((s) => s.blocSlug === bloc.slug).map((s) => ({
            serieSlug: s.slug,
            serieName: s.name,
            serieAbbreviation: s.abbreviation ?? null,
            serieImageUrl: imageUrlBySlug.get(s.slug) ?? null,
            totalCards: 0,
            ownedCards: 0,
            marketValue: 0,
            isComplete: false,
          })),
        }));

        setBlocs(progress);
      } catch (err) {
        console.error("portfolio/cartes load failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
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
