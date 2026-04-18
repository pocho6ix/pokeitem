/**
 * Shared Prisma query helpers.
 *
 * Intentionally plain async functions — no unstable_cache, no React cache().
 * Both of those wrappers cause Turbopack (Next.js 16 dev mode) to serialize
 * the Prisma closure, which produces a PrismaClientValidationError at runtime.
 *
 * Cross-request caching is handled entirely by Next.js route-segment
 * `revalidate` config at the page level.
 */

import { prisma } from "@/lib/prisma"

/** All series with their card count and bloc slug — used by buildBlocProgress */
export async function getCachedSeriesList() {
  return prisma.serie.findMany({
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
}

/**
 * Card counts per serie: total + isSpecial breakdown.
 * Used to compute completion (serie is complete when user owns every
 * applicable (cardId, version) slot). `special` counts cards that only
 * exist as NORMAL (full art / special cards).
 */
export async function getCachedSerieCardCounts(): Promise<Record<string, { total: number; special: number }>> {
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

/** Cards for a single serie */
export async function getCachedSerieCards(serieSlug: string) {
  return prisma.serie.findUnique({
    where: { slug: serieSlug },
    select: {
      id: true,
      cards: {
        select: {
          id:                true,
          number:             true,
          name:               true,
          rarity:             true,
          imageUrl:           true,
          price:              true,
          priceFr:            true,
          priceReverse:       true,
          priceFirstEdition:  true,
          isSpecial:          true,
          types:              true,
          category:           true,
          trainerType:        true,
          energyType:         true,
        },
        orderBy: { number: "asc" },
      },
    },
  })
}
