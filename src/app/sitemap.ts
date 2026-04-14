import type { MetadataRoute } from "next";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";

const BASE_URL = "https://app.pokeitem.fr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  return [...staticPages, ...blocPages, ...seriePages];
}
