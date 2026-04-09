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
  { revalidate: 3600 }
)

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
  { revalidate: 3600 }
)
