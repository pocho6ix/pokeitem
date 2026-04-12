import type { MetadataRoute } from "next";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { BLOG_POSTS } from "@/data/blog-posts";

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
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date("2026-03-29"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  // Bloc pages
  const blocPages: MetadataRoute.Sitemap = BLOCS.map((bloc) => ({
    url: `${BASE_URL}/collection/${bloc.slug}`,
    lastModified: new Date("2026-03-29"),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Serie pages — use releaseDate as lastmod
  const seriePages: MetadataRoute.Sitemap = SERIES.map((serie) => ({
    url: `${BASE_URL}/collection/${serie.blocSlug}/${serie.slug}`,
    lastModified: serie.releaseDate ? new Date(serie.releaseDate) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Blog posts
  const blogPages: MetadataRoute.Sitemap = BLOG_POSTS
    .filter((post) => post.published)
    .map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  return [...staticPages, ...blocPages, ...seriePages, ...blogPages];
}
