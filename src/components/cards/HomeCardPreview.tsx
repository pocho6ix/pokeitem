"use client";

import { lazy, Suspense, useState } from "react";

const CardDetailModal = lazy(() =>
  import("./CardDetailModal").then((m) => ({ default: m.CardDetailModal }))
);

interface CardPreview {
  cardId: string;
  name: string;
  imageUrl: string;
  price: number;
}

interface Props {
  cards: CardPreview[];
}

export function HomeCardPreview({ cards }: Props) {
  const [detailCardId, setDetailCardId] = useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => (
          <button
            key={card.cardId}
            onClick={() => setDetailCardId(card.cardId)}
            className="group text-left"
          >
            <div className="relative rounded-xl overflow-hidden border border-[var(--border-default)] bg-[var(--bg-card)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.imageUrl}
                alt={card.name}
                className="w-full h-auto block group-hover:scale-105 transition-transform duration-200"
              />
              {/* Price badge */}
              <div suppressHydrationWarning className="absolute bottom-1.5 right-1.5">
                <span suppressHydrationWarning className="inline-flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white shadow backdrop-blur-sm">
                  🇫🇷
                  {card.price.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {detailCardId && (
        <Suspense fallback={null}>
          <CardDetailModal
            cardId={detailCardId}
            onClose={() => setDetailCardId(null)}
          />
        </Suspense>
      )}
    </>
  );
}
