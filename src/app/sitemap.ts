import type { MetadataRoute } from "next";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import {
  getCardsForSitemap,
  getSealedProductsForSitemap,
} from "@/lib/data/sitemap-loaders";

const BASE_URL = "https://app.pokeitem.fr";

// ISR: regenerate the sitemap at most once per day. With ~19k URLs the full
// build walks the `cards` + `items` tables, which isn't something we want to
// re-run on every crawler hit.
export const revalidate = 86400;

// Note — `/u/:slug` (public profiles) is intentionally NOT emitted. Product
// decision: indexation value is low at this stage and the privacy × SEO
// trade-off isn't favourable until we ship a proper user opt-in. Revisit
// in 6 months once opt-in UX exists. Those pages also carry `robots: noindex`
// so crawlers that discover them via backlinks won't index them either.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cards, sealedProducts] = await Promise.all([
    getCardsForSitemap(),
    getSealedProductsForSitemap(),
  ]);

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date("2026-03-29"),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/collection`,
      lastModified: new Date("2026-03-29"),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date("2026-03-29"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // Bloc pages — canonical /collection/cartes/<bloc>
  const blocPages: MetadataRoute.Sitemap = BLOCS.map((bloc) => ({
    url: `${BASE_URL}/collection/cartes/${bloc.slug}`,
    lastModified: new Date("2026-03-29"),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Serie pages — canonical /collection/cartes/<bloc>/<serie>, releaseDate as lastmod
  const seriePages: MetadataRoute.Sitemap = SERIES.map((serie) => ({
    url: `${BASE_URL}/collection/cartes/${serie.blocSlug}/${serie.slug}`,
    lastModified: serie.releaseDate ? new Date(serie.releaseDate) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Card pages — canonical /carte/<cardId>
  const cardPages: MetadataRoute.Sitemap = cards.map((card) => ({
    url: `${BASE_URL}/carte/${card.id}`,
    lastModified: card.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  // Sealed product pages — canonical /collection/produits/<bloc>/<serie>/<item>
  const sealedPages: MetadataRoute.Sitemap = sealedProducts.map((item) => ({
    url: `${BASE_URL}/collection/produits/${item.blocSlug}/${item.serieSlug}/${item.slug}`,
    lastModified: item.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...blocPages,
    ...seriePages,
    ...cardPages,
    ...sealedPages,
  ];
}
