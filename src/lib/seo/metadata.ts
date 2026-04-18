import type { Metadata } from "next";
import type { Item, Serie, Bloc, BlogPost } from "@/types";

const BASE_URL = "https://app.pokeitem.fr";

// ---------------------------------------------------------------------------
// Item page metadata
// ---------------------------------------------------------------------------

export function generateItemMetadata(item: Item): Metadata {
  const title = `${item.name} — Prix et cote`;
  const description = item.description
    ? item.description.slice(0, 155)
    : `${item.name} Pok\u00e9mon TCG : prix Cardmarket actuel, historique de cote, description, images et d\u00e9tails du produit scell\u00e9 sur PokeItem.`;

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
  const title = `${serie.name} — ${bloc.name}`;
  const description = `Tous les produits scell\u00e9s Pok\u00e9mon TCG de l'extension ${serie.name} (${bloc.name}) : Booster Boxes, ETB, coffrets et displays avec prix Cardmarket actuels.`;

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
  const title = `${bloc.name} — Toutes les extensions`;
  const description = `Explorez toutes les extensions Pok\u00e9mon TCG du bloc ${bloc.name} (${bloc.nameEn}) : produits scell\u00e9s, Booster Boxes, ETB, prix Cardmarket et historique.`;

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
  const title = post.metaTitle ?? `${post.title} — Blog`;
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
