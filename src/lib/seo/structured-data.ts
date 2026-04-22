import type { Item, BlogPost } from "@/types";

const BASE_URL = "https://app.pokeitem.fr";

// ---------------------------------------------------------------------------
// Organization JSON-LD (global — injected in root layout)
// ---------------------------------------------------------------------------

export function generateOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PokeItem",
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description:
      "La plateforme de r\u00e9f\u00e9rence pour g\u00e9rer et valoriser votre portfolio d\u0027items scell\u00e9s Pok\u00e9mon TCG.",
    sameAs: [],
  };
}

// ---------------------------------------------------------------------------
// Product JSON-LD (Schema.org/Product with AggregateOffer)
// ---------------------------------------------------------------------------

export function generateProductJsonLd(item: Item) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.name,
    description: item.description ?? `Produit scell\u00e9 Pok\u00e9mon TCG : ${item.name}`,
    image: item.imageUrl ?? undefined,
    sku: item.ean ?? item.id,
    brand: {
      "@type": "Brand",
      name: "Pok\u00e9mon",
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      lowPrice: item.currentPrice ?? item.retailPrice ?? 0,
      highPrice: item.currentPrice ?? item.retailPrice ?? 0,
      offerCount: 1,
      availability: "https://schema.org/InStock",
      url: `${BASE_URL}/collection/${item.slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Card JSON-LD (Schema.org/Product, NO offers)
//
// Emitted from /carte/:cardId. app.pokeitem.fr is a collection-management
// app, not a store — we don't fulfil orders. Displayed prices are market
// indicators (Cardmarket) shown for reference, so we deliberately omit
// `offers` / `availability`. Keeping the @type as Product (rather than
// Thing) gives us Google's image-rich snippet in SERP without falsely
// advertising stock.
// ---------------------------------------------------------------------------

export interface CardJsonLdInput {
  id:        string;
  name:      string;
  number:    string;
  rarity?:   string | null; // human-readable label ("Rare Holographique"), not the enum
  imageUrl?: string | null;
}

export interface CardJsonLdSerie {
  name: string;
}

export interface CardJsonLdBloc {
  name: string;
}

export function generateCardJsonLd(
  card: CardJsonLdInput,
  serie: CardJsonLdSerie,
  bloc: CardJsonLdBloc,
) {
  return {
    "@context":   "https://schema.org",
    "@type":      "Product",
    name:         `${card.name}${card.number ? ` n°${card.number}` : ""}`.trim(),
    description:  `Carte Pokémon ${card.name} de l'extension ${serie.name}${card.rarity ? ` — ${card.rarity}` : ""}.`,
    image:        card.imageUrl ?? undefined,
    sku:          card.id,
    brand:        { "@type": "Brand", name: "Pokémon TCG" },
    category:     `Carte Pokémon TCG / ${bloc.name} / ${serie.name}`,
    url:          `${BASE_URL}/carte/${card.id}`,
    // No `offers` / `availability` by design — see module-level note.
  };
}

// ---------------------------------------------------------------------------
// Article JSON-LD (Schema.org/Article)
// ---------------------------------------------------------------------------

export function generateArticleJsonLd(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage ?? undefined,
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.publishedAt ?? undefined,
    author: {
      "@type": "Organization",
      name: post.author,
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "PokeItem",
      url: BASE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/blog/${post.slug}`,
    },
    wordCount: post.readingTime * 200,
  };
}

// ---------------------------------------------------------------------------
// BreadcrumbList JSON-LD
// ---------------------------------------------------------------------------

export function generateBreadcrumbJsonLd(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${BASE_URL}${item.url}`,
    })),
  };
}

// ---------------------------------------------------------------------------
// WebSite JSON-LD
// ---------------------------------------------------------------------------

export function generateWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "PokeItem",
    url: BASE_URL,
    description:
      "PokeItem — La r\u00e9f\u00e9rence fran\u00e7aise pour suivre les prix et g\u00e9rer sa collection de produits scell\u00e9s Pok\u00e9mon TCG.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/collection?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ---------------------------------------------------------------------------
// ItemList JSON-LD (for listing pages — series, blocs)
// ---------------------------------------------------------------------------

export function generateItemListJsonLd(
  name: string,
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url.startsWith("http") ? item.url : `${BASE_URL}${item.url}`,
    })),
  };
}

// ---------------------------------------------------------------------------
// FAQPage JSON-LD
// ---------------------------------------------------------------------------

export function generateFAQJsonLd(
  questions: { question: string; answer: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  };
}
