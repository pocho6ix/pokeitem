"use client";

import Image from "next/image";
import { getCardRarityImage, CardRarity } from "@/types/card";

interface CardItem {
  id: string;
  number: string;
  name: string;
  rarity: string;
  imageUrl: string | null;
  price?: number | null;
  priceFr?: number | null;
  priceReverse?: number | null;
  types?: string[];
  serie: {
    slug: string;
    name: string;
    abbreviation?: string | null;
    bloc: { slug: string };
  };
}

interface Props {
  cards: CardItem[];
  visitorWishlistIds?: Set<string>;
  gridSize?: "small" | "medium" | "large";
}

const GRID_CLASS = {
  small:  "grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8",
  medium: "grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8",
  large:  "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
};

export function ReadOnlyCardGrid({ cards, visitorWishlistIds, gridSize = "medium" }: Props) {
  if (cards.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-[var(--text-secondary)]">
        Aucune carte à afficher
      </div>
    );
  }

  return (
    <div className={GRID_CLASS[gridSize]}>
      {cards.map((card) => {
        const blocSlug = card.serie.bloc.slug;
        const inVisitorWishlist = visitorWishlistIds?.has(card.id) ?? false;
        const displayPrice = card.priceFr ?? card.price ?? null;

        return (
          <div key={card.id} className="group relative flex flex-col">
            <div className="relative aspect-[2.5/3.5] overflow-hidden rounded-lg bg-[var(--bg-secondary)] shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
              {card.imageUrl ? (
                <Image
                  src={card.imageUrl}
                  alt={`${card.name} — ${card.number}`}
                  fill
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
                  className="object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
                  <span className="text-xs font-bold text-[var(--text-secondary)]">{card.number}</span>
                  <span className="text-[10px] leading-tight text-[var(--text-tertiary)]">{card.name}</span>
                </div>
              )}

              {/* Visitor wishlist overlay — top left */}
              {inVisitorWishlist && (
                <div className="absolute top-1 left-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#A855F7" stroke="#A855F7" strokeWidth="1">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
              )}

              {/* Number + rarity badge — bottom left */}
              <div className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                <span>{card.number}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getCardRarityImage(card.rarity as CardRarity, blocSlug)}
                  alt=""
                  className="h-3.5 w-auto object-contain"
                  style={{ filter: "drop-shadow(0 0 2px rgba(255,255,255,1)) drop-shadow(0 0 1px rgba(255,255,255,0.9)) brightness(1.15)" }}
                />
              </div>

              {/* Price — bottom right */}
              {displayPrice != null && displayPrice > 0 && (
                <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
                  {displayPrice.toFixed(2)} €
                </div>
              )}
            </div>

            <p className="mt-1 truncate text-center text-[10px] text-[var(--text-secondary)]">{card.name}</p>
          </div>
        );
      })}
    </div>
  );
}
