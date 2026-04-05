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
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center rounded-full bg-green-400 px-2 py-0.5 text-[10px] font-bold text-black shadow">
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
