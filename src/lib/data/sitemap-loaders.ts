// ---------------------------------------------------------------------------
// Lean Prisma loaders used exclusively by `src/app/sitemap.ts`.
//
// Each function selects only what the sitemap needs (identifier + updatedAt).
// No nested relations, no prices, no images — we stay well under the 50 MB
// body limit that `sitemap.xml` enforces even at 18 k+ rows.
//
// Profiles (`ClasseurShare`) are intentionally NOT emitted to the sitemap at
// this stage — see the note in `src/app/sitemap.ts`.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/prisma";

export interface SitemapCardRow {
  id: string;
  updatedAt: Date;
}

export interface SitemapSealedRow {
  slug: string;
  updatedAt: Date;
  serieSlug: string;
  blocSlug: string;
}

export async function getCardsForSitemap(): Promise<SitemapCardRow[]> {
  return prisma.card.findMany({
    select: { id: true, updatedAt: true },
  });
}

export async function getSealedProductsForSitemap(): Promise<SitemapSealedRow[]> {
  const rows = await prisma.item.findMany({
    select: {
      slug: true,
      updatedAt: true,
      serie: {
        select: {
          slug: true,
          bloc: { select: { slug: true } },
        },
      },
    },
  });

  // Flatten the nested relation shape the sitemap consumer expects.
  return rows.map((r) => ({
    slug:      r.slug,
    updatedAt: r.updatedAt,
    serieSlug: r.serie.slug,
    blocSlug:  r.serie.bloc.slug,
  }));
}
