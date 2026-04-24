import type {
  CardCondition,
  CardVersion,
  ItemType,
  Language,
} from "@prisma/client";

// Enum → CSV label mappings for the portfolio export.
//
// Prisma stores every enum value in UPPER_SNAKE_CASE. The export templates
// expect French-friendly lowercase / short-code labels so the CSVs can be
// opened in Excel without the user seeing internal identifiers.

export const CARD_CONDITION_LABELS: Record<CardCondition, string> = {
  MINT: "Mint",
  NEAR_MINT: "NM",
  EXCELLENT: "EX",
  GOOD: "GD",
  LIGHT_PLAYED: "LP",
  PLAYED: "PL",
  POOR: "PO",
  GRADED: "Graded",
};

export const CARD_VERSION_LABELS: Record<CardVersion, string> = {
  NORMAL: "normal",
  REVERSE: "reverse",
  REVERSE_POKEBALL: "reverse_pokeball",
  REVERSE_MASTERBALL: "reverse_masterball",
  FIRST_EDITION: "first_edition",
};

// ISO 639-1 two-letter codes (lowercase). `JP` is the Prisma enum for
// Japanese — in ISO terms that's `ja`, but the existing app surfaces `jp`
// in the UI so we keep it consistent with what users already see.
export const LANGUAGE_LABELS: Record<Language, string> = {
  FR: "fr",
  EN: "en",
  JP: "jp",
  DE: "de",
  ES: "es",
  IT: "it",
  PT: "pt",
  KO: "ko",
  ZH: "zh",
};

// Sealed-item types — labelled with the French names PokeItem uses
// throughout the UI (`display` for booster boxes, `coffret` for box sets,
// `deck` for theme decks). Keeps the export readable without a legend.
export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  BOOSTER: "booster",
  DUOPACK: "duopack",
  TRIPACK: "tripack",
  BOOSTER_BOX: "display",
  ETB: "etb",
  BOX_SET: "coffret",
  UPC: "upc",
  TIN: "tin",
  MINI_TIN: "mini_tin",
  POKEBALL_TIN: "pokeball_tin",
  BLISTER: "blister",
  THEME_DECK: "deck",
  BUNDLE: "bundle",
  TRAINER_KIT: "trainer_kit",
  OTHER: "autre",
};
