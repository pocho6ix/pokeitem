import type { Metadata } from "next";
import type { Item, Serie, Bloc, BlogPost } from "@/types";

const BASE_URL = "https://www.pokeitem.fr";

// ---------------------------------------------------------------------------
// Item page metadata
// ---------------------------------------------------------------------------

export function generateItemMetadata(item: Item): Metadata {
  const title = `${item.name} — Prix et infos | PokeItem`;
  const description = item.description
    ? item.description.slice(0, 155)
    : `D\u00e9couvrez ${item.name} : prix actuel, historique et infos d\u00e9taill\u00e9es sur PokeItem.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${BASE_URL}/collection/${item.slug}`,
      images: item.imageUrl ? [{ url: item.imageUrl, alt: item.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: item.imageUrl ? [item.imageUrl] : [],
    },
    alternates: {
      canonical: `${BASE_URL}/collection/${item.slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Serie page metadata
// ---------------------------------------------------------------------------

export function generateSerieMetadata(serie: Serie, bloc: Bloc): Metadata {
  const title = `${serie.name} — ${bloc.name} | PokeItem`;
  const description = `Tous les produits scell\u00e9s de la s\u00e9rie ${serie.name} (${bloc.name}) : prix, disponibilit\u00e9 et d\u00e9tails sur PokeItem.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${BASE_URL}/collection/${bloc.slug}/${serie.slug}`,
      images: serie.imageUrl ? [{ url: serie.imageUrl, alt: serie.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: serie.imageUrl ? [serie.imageUrl] : [],
    },
    alternates: {
      canonical: `${BASE_URL}/collection/${bloc.slug}/${serie.slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Bloc page metadata
// ---------------------------------------------------------------------------

export function generateBlocMetadata(bloc: Bloc): Metadata {
  const title = `${bloc.name} — Toutes les s\u00e9ries | PokeItem`;
  const description = `Explorez toutes les s\u00e9ries du bloc ${bloc.name} (${bloc.nameEn}) sur PokeItem : produits scell\u00e9s, prix et historique.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${BASE_URL}/collection/${bloc.slug}`,
      images: bloc.imageUrl ? [{ url: bloc.imageUrl, alt: bloc.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: bloc.imageUrl ? [bloc.imageUrl] : [],
    },
    alternates: {
      canonical: `${BASE_URL}/collection/${bloc.slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Blog post metadata
// ---------------------------------------------------------------------------

export function generateBlogMetadata(post: BlogPost): Metadata {
  const title = post.metaTitle ?? `${post.title} — Blog PokeItem`;
  const description =
    post.metaDescription ?? post.excerpt.slice(0, 155);

  return {
    title,
    description,
    keywords: post.keywords.length > 0 ? post.keywords : undefined,
    openGraph: {
      title,
      description,
      type: "article",
      url: `${BASE_URL}/blog/${post.slug}`,
      images: post.coverImage ? [{ url: post.coverImage, alt: post.title }] : [],
      publishedTime: post.publishedAt ?? undefined,
      authors: [post.author],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.coverImage ? [post.coverImage] : [],
    },
    alternates: {
      canonical: `${BASE_URL}/blog/${post.slug}`,
    },
  };
}
