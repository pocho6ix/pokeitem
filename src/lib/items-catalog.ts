// ---------------------------------------------------------------------------
// Sealed products catalog — flat list derived from static data
// ---------------------------------------------------------------------------
// The collection UI is "static-first, DB-enriched". This module builds the
// flat universe of SKUs from:
//   - SERIES (static list of 130+ series)
//   - ITEM_TYPES (static list of 14 product types)
//   - ITEM_IMAGES_BY_SERIE (generated map of which series has which image)
// Downstream components may overlay DB data (prices, slugs) when available.
//
// Categories are the coarser buckets shown as filter chips in the new UI.
// Several Prisma ItemType values may map to the same category (e.g.
// MINI_TIN + TIN + BOX_SET all map to "coffret").
// ---------------------------------------------------------------------------

import { SERIES } from "@/data/series";
import { BLOCS } from "@/data/blocs";
import { ITEM_TYPES } from "@/data/item-types";
import { ITEM_IMAGES_BY_SERIE } from "@/data/item-images-map.generated";
import { ItemType } from "@/types/item";

export type ItemCategory =
  | "booster"
  | "display"
  | "etb"
  | "bundle"
  | "upc"
  | "tripack"
  | "coffret";

export const ITEM_CATEGORIES: { id: ItemCategory; label: string }[] = [
  { id: "display", label: "Display" },
  { id: "etb", label: "ETB" },
  { id: "bundle", label: "Bundle" },
  { id: "upc", label: "UPC" },
  { id: "tripack", label: "Tripack" },
  { id: "booster", label: "Booster" },
  { id: "coffret", label: "Coffret" },
];

/**
 * Map a Prisma ItemType to the simplified category used by the filter chips.
 * BLISTER / OTHER fall into "coffret" as a catch-all.
 */
export function typeToCategory(type: ItemType | string): ItemCategory {
  switch (type) {
    case ItemType.BOOSTER_BOX:
      return "display";
    case ItemType.ETB:
      return "etb";
    case ItemType.BUNDLE:
      return "bundle";
    case ItemType.UPC:
      return "upc";
    case ItemType.TRIPACK:
    case ItemType.DUOPACK:
      return "tripack";
    case ItemType.BOOSTER:
      return "booster";
    case ItemType.BOX_SET:
    case ItemType.TIN:
    case ItemType.MINI_TIN:
    case ItemType.POKEBALL_TIN:
    case ItemType.TRAINER_KIT:
    case ItemType.THEME_DECK:
    case ItemType.BLISTER:
    case ItemType.OTHER:
    default:
      return "coffret";
  }
}

const TYPE_SLUG: Record<string, string> = {
  BOOSTER: "booster",
  DUOPACK: "duopack",
  TRIPACK: "tripack",
  MINI_TIN: "mini-tin",
  POKEBALL_TIN: "pokeball-tin",
  BUNDLE: "bundle",
  BOX_SET: "box-set",
  ETB: "etb",
  BOOSTER_BOX: "booster-box",
  UPC: "upc",
  TIN: "tin",
  BLISTER: "blister",
  THEME_DECK: "theme-deck",
  TRAINER_KIT: "trainer-kit",
};

export function typeToSlugPart(type: ItemType | string): string {
  return TYPE_SLUG[type] ?? String(type).toLowerCase();
}

/**
 * Compact label shown in the top-right badge of a product card. Needed
 * because some full labels ("Coffret Collection", "Tin Pokéball") are
 * too long for a pill on a narrow mobile card.
 */
const BADGE_LABEL: Record<string, string> = {
  [ItemType.BOX_SET]: "Coffret",
  [ItemType.POKEBALL_TIN]: "Pokéball",
  [ItemType.TRAINER_KIT]: "Trainer",
  [ItemType.THEME_DECK]: "Deck",
  [ItemType.BOOSTER_BOX]: "Display",
};

export function typeToBadgeLabel(
  type: ItemType | string,
  fallback: string,
): string {
  return BADGE_LABEL[type] ?? fallback;
}

export interface CatalogEntry {
  /** Stable key: `${serieSlug}-${typeSlugPart}` — also the filename stem */
  key: string;
  serieSlug: string;
  serieName: string;
  serieAbbreviation: string | null;
  blocSlug: string;
  blocName: string;
  type: string;
  typeLabel: string;
  /** Compact label for the product-card badge (e.g. "Coffret" vs "Coffret Collection") */
  typeBadgeLabel: string;
  category: ItemCategory;
  typicalMsrp: number;
  /** Release date of the *series* (ISO string). Used for sorting. */
  serieReleaseDate: string | null;
}

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  ITEM_TYPES.map((t) => [t.type, t.label]),
);
const TYPE_MSRP: Record<string, number> = Object.fromEntries(
  ITEM_TYPES.map((t) => [t.type, t.typicalMsrp]),
);
const BLOC_NAME: Record<string, string> = Object.fromEntries(
  BLOCS.map((b) => [b.slug, b.name]),
);

/**
 * Build the flat catalog of every (series, product type) combination that
 * has a known static artwork on disk. This is the universe shown in the
 * "Par type" flat view.
 */
export function buildStaticCatalog(): CatalogEntry[] {
  const entries: CatalogEntry[] = [];

  for (const serie of SERIES) {
    const imagedTypes = ITEM_IMAGES_BY_SERIE[serie.slug] ?? [];
    if (imagedTypes.length === 0) continue;

    for (const type of imagedTypes) {
      const typeLabel = TYPE_LABEL[type] ?? type;
      const msrp = TYPE_MSRP[type] ?? 0;
      entries.push({
        key: `${serie.slug}-${typeToSlugPart(type)}`,
        serieSlug: serie.slug,
        serieName: serie.name,
        serieAbbreviation: serie.abbreviation ?? null,
        blocSlug: serie.blocSlug,
        blocName: BLOC_NAME[serie.blocSlug] ?? serie.blocSlug,
        type,
        typeLabel,
        typeBadgeLabel: typeToBadgeLabel(type, typeLabel),
        category: typeToCategory(type),
        typicalMsrp: msrp,
        serieReleaseDate: serie.releaseDate ?? null,
      });
    }
  }

  // Default sort: most recent series first, then by type order (display first)
  const TYPE_ORDER: Record<string, number> = {
    BOOSTER_BOX: 0,
    ETB: 1,
    UPC: 2,
    BUNDLE: 3,
    TRIPACK: 4,
    DUOPACK: 5,
    BOX_SET: 6,
    MINI_TIN: 7,
    TIN: 8,
    POKEBALL_TIN: 9,
    TRAINER_KIT: 10,
    THEME_DECK: 11,
    BOOSTER: 12,
    BLISTER: 13,
    OTHER: 14,
  };

  entries.sort((a, b) => {
    const dateA = a.serieReleaseDate ?? "0000";
    const dateB = b.serieReleaseDate ?? "0000";
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99);
  });

  return entries;
}

/** Normalize a string for loose text matching (strip accents, lower-case). */
export function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
