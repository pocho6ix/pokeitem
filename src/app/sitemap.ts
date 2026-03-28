import type { MetadataRoute } from "next";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";

const BASE_URL = "https://www.pokeitem.fr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/collection`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/market`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  // Bloc pages
  const blocPages: MetadataRoute.Sitemap = BLOCS.map((bloc) => ({
    url: `${BASE_URL}/collection/${bloc.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Serie pages
  const seriePages: MetadataRoute.Sitemap = SERIES.map((serie) => ({
    url: `${BASE_URL}/collection/${serie.blocSlug}/${serie.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...blocPages, ...seriePages];
}
