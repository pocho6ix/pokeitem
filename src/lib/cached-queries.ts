/**
 * Shared cached Prisma queries.
 *
 * Uses React `cache()` for per-request deduplication (no duplicate DB hits
 * when the same query is called multiple times in one render pass).
 *
 * Cross-request caching relies on Next.js route-segment `revalidate` config
 * at the page level rather than `unstable_cache`, which has known issues with
 * Prisma client closures under Next.js 16 / Turbopack.
 */

import { cache } from "react"
import { prisma } from "@/lib/prisma"

/** All series with their card count and bloc slug — used by buildBlocProgress */
export const getCachedSeriesList = cache(
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
    })
)

/**
 * Card counts per serie: total + isSpecial breakdown.
 * Used to compute completion (serie is complete when user owns every
 * applicable (cardId, version) slot). `special` counts cards that only
 * exist as NORMAL (full art / special cards).
 */
export const getCachedSerieCardCounts = cache(
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
  }
);

/** Cards for a single serie — deduplicated per request via React cache() */
export const getCachedSerieCards = cache(
  async (serieSlug: string) =>
    prisma.serie.findUnique({
      where: { slug: serieSlug },
      select: {
        id: true,
        cards: {
          select: {
            id:             true,
            number:         true,
            name:           true,
            rarity:         true,
            imageUrl:       true,
            price:          true,
            priceFr:        true,
            priceReverse:   true,
            isSpecial:      true,
            isFirstEdition: true,
            types:          true,
            category:       true,
            trainerType:    true,
            energyType:     true,
          },
          orderBy: { number: "asc" },
        },
      },
    })
)
