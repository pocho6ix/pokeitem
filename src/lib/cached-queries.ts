/**
 * Shared cached Prisma queries — Next.js Data Cache (Vercel CDN-level).
 * These datasets are user-independent and change only when the scraper runs
 * (every 6h), so we cache for 1 hour (revalidate: 3600).
 */

import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"

/** All series with their card count and bloc slug — used by buildBlocProgress */
export const getCachedSeriesList = unstable_cache(
  async () =>
    prisma.serie.findMany({
      select: {
        id:           true,
        slug:         true,
        name:         true,
        abbreviation: true,
        imageUrl:     true,
        cardCount:    true,
        bloc: { select: { slug: true } },
      },
    }),
  ["db-series-list"],
  { revalidate: 300 }
)

/**
 * Card counts per serie: total + isSpecial breakdown.
 * Used to compute completion (serie is complete when user owns every
 * applicable (cardId, version) slot). `special` counts cards that only
 * exist as NORMAL (full art / special cards).
 */
export const getCachedSerieCardCounts = unstable_cache(
  async (): Promise<Record<string, { total: number; special: number }>> => {
    const rows = await prisma.card.groupBy({
      by: ["serieId", "isSpecial"],
      _count: { id: true },
    });
    const map: Record<string, { total: number; special: number }> = {};
    for (const r of rows) {
      if (!map[r.serieId]) map[r.serieId] = { total: 0, special: 0 };
      map[r.serieId].total += r._count.id;
      if (r.isSpecial) map[r.serieId].special += r._count.id;
    }
    return map;
  },
  ["db-serie-card-counts"],
  { revalidate: 300 }
);

/** Cards for a single serie — heavy query, cached 1h per serieSlug */
export const getCachedSerieCards = unstable_cache(
  async (serieSlug: string) =>
    prisma.serie.findUnique({
      where: { slug: serieSlug },
      select: {
        id: true,
        cards: {
          select: {
            id:           true,
            number:       true,
            name:         true,
            rarity:       true,
            imageUrl:     true,
            price:        true,
            priceFr:      true,
            priceReverse: true,
            isSpecial:    true,
            types:        true,
            category:     true,
            trainerType:  true,
            energyType:   true,
          },
          orderBy: { number: "asc" },
        },
      },
    }),
  ["serie-cards"],
  { revalidate: 3600, tags: ["serie-cards"] }
)
