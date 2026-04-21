"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { CardCollectionGrid } from "@/components/cards/CardCollectionGrid";
import { BackButton } from "@/components/ui/BackButton";
import type { CardRow, OwnedEntry } from "@/components/cards/CardCollectionGrid";
import { CardRarity } from "@/types/card";
import { SYMBOL_SLUGS } from "@/data/symbol-slugs";
import { FlagFR } from "@/components/shared/FlagFR";
import { formatDateFR } from "@/lib/format-date";
import { useAuth } from "@/lib/auth-context";
import { fetchApi } from "@/lib/api";

export function SerieCartesClient() {
  const params = useParams<{ blocSlug: string; serieSlug: string }>();
  const blocSlug = params?.blocSlug;
  const serieSlug = params?.serieSlug;

  const bloc = blocSlug ? BLOCS.find((b) => b.slug === blocSlug) : undefined;
  const serieStatic = serieSlug
    ? SERIES.find((s) => s.slug === serieSlug && s.blocSlug === blocSlug)
    : undefined;

  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [cards, setCards] = useState<CardRow[]>([]);
  const [initialOwned, setInitialOwned] = useState<OwnedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serieSlug) return;
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ serieSlug, limit: "500" });
        const res = await fetchApi(`/api/cards/search?${params}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (cancelled) return;

        type RawCard = {
          id: string;
          number: string;
          name: string;
          rarity: string;
          imageUrl: string | null;
          price?: number | null;
          priceFr?: number | null;
          priceReverse?: number | null;
          priceFirstEdition?: number | null;
          isSpecial?: boolean;
          types?: string[];
          category?: string | null;
          trainerType?: string | null;
          energyType?: string | null;
        };
        const rows: CardRow[] = (data.cards as RawCard[]).map((c) => ({
          id: c.id,
          number: c.number,
          name: c.name,
          rarity: c.rarity as CardRarity,
          imageUrl: c.imageUrl,
          price: c.price ?? null,
          priceFr: c.priceFr ?? null,
          priceReverse: c.priceReverse ?? null,
          priceFirstEdition: c.priceFirstEdition ?? null,
          isSpecial: c.isSpecial ?? false,
          types: c.types ?? [],
          category: c.category ?? null,
          trainerType: c.trainerType ?? null,
          energyType: c.energyType ?? null,
        }));
        setCards(rows);

        if (userId) {
          const ownedRes = await fetchApi("/api/cards/collection");
          if (ownedRes.ok) {
            const ownedData = await ownedRes.json();
            if (!cancelled) {
              const cardIds = new Set(rows.map((r) => r.id));
              const owned = (ownedData.cards ?? []).filter(
                (uc: { cardId: string }) => cardIds.has(uc.cardId),
              );
              setInitialOwned(owned as OwnedEntry[]);
            }
          }
        }
      } catch (err) {
        console.error("serie cards load failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serieSlug, userId]);

  if (!bloc || !serieStatic) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[var(--text-secondary)]">
        Série introuvable.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* iOS-only layout: the back button doubles as the current-section
          label (POP 4 / Équilibre Parfait / …), so we drop the breadcrumb
          row entirely. This file is imported only from the Capacitor
          overrides — the web page renders its own header in its server
          page.tsx. */}
      <div className="mb-6">
        <BackButton label={serieStatic.name} />
      </div>

      <div className="mb-8 flex items-center gap-4">
        {serieStatic.imageUrl && (
          <div className="relative h-14 w-24 shrink-0">
            <Image
              src={serieStatic.imageUrl}
              alt={serieStatic.name}
              fill
              sizes="96px"
              className="object-contain"
            />
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            {serieStatic.name}
          </h1>
          {formatDateFR(serieStatic.releaseDate) && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <FlagFR size={10} className="rounded-[1px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.2)]" />
              <span>{formatDateFR(serieStatic.releaseDate)}</span>
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[var(--text-secondary)]">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                Série {bloc.name} · {serieStatic.abbreviation}
                {cards.length > 0 && (
                  <span className="ml-2 font-medium text-[var(--text-primary)]">
                    · {cards.length} cartes
                  </span>
                )}
              </span>
              {SYMBOL_SLUGS.has(serieStatic.slug) && (
                <Image
                  src={`/images/symbols/${serieStatic.slug}.png`}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 shrink-0 object-contain opacity-80"
                />
              )}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-sm text-[var(--text-secondary)]">
          Chargement…
        </div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-default)] py-20 text-center">
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            Cartes à venir
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Les cartes de cette extension seront disponibles prochainement.
          </p>
        </div>
      ) : (
        <CardCollectionGrid
          cards={cards}
          serieSlug={serieSlug!}
          serieName={serieStatic.name}
          blocSlug={blocSlug!}
          initialOwned={initialOwned}
          isAuthenticated={!!userId}
        />
      )}
    </div>
  );
}
