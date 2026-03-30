export const ITEM_TYPE_LABELS: Record<string, string> = {
  BOOSTER: "Booster",
  DUOPACK: "Duopack",
  TRIPACK: "Tripack",
  BOOSTER_BOX: "Display",
  ETB: "ETB",
  BOX_SET: "Coffret Collection",
  UPC: "UPC",
  TIN: "Tin",
  MINI_TIN: "Mini Tin",
  POKEBALL_TIN: "Tin Pokéball",
  BLISTER: "Blister",
  THEME_DECK: "Theme Deck",
  BUNDLE: "Bundle",
  TRAINER_KIT: "Trainer Kit",
  OTHER: "Autre",
};

const TAG_STYLE = "bg-[#FF0000] text-white dark:bg-white dark:text-[#FF0000]";

export const ITEM_TYPE_COLORS: Record<string, string> = {
  BOOSTER: TAG_STYLE,
  DUOPACK: TAG_STYLE,
  TRIPACK: TAG_STYLE,
  BOOSTER_BOX: TAG_STYLE,
  ETB: TAG_STYLE,
  BOX_SET: TAG_STYLE,
  UPC: TAG_STYLE,
  TIN: TAG_STYLE,
  MINI_TIN: TAG_STYLE,
  POKEBALL_TIN: TAG_STYLE,
  BLISTER: TAG_STYLE,
  THEME_DECK: TAG_STYLE,
  BUNDLE: TAG_STYLE,
  TRAINER_KIT: TAG_STYLE,
  OTHER: TAG_STYLE,
};

export const ITEM_TYPE_MSRP: Record<string, number> = {
  BOOSTER: 4.99,
  DUOPACK: 12.99,
  TRIPACK: 15.99,
  BOOSTER_BOX: 159.99,
  ETB: 109.99,
  BOX_SET: 25.99,
  UPC: 159.99,
  TIN: 16.99,
  MINI_TIN: 11.99,
  POKEBALL_TIN: 16.99,
  BLISTER: 6.99,
  THEME_DECK: 14.99,
  BUNDLE: 34.99,
  TRAINER_KIT: 34.99,
  OTHER: 0,
};

export const CHART_COLORS = [
  "#3B82F6", // blue
  "#22C55E", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
];

export const CONDITION_LABELS: Record<string, string> = {
  SEALED: "Scellé",
  OPENED: "Ouvert",
  DAMAGED: "Endommagé",
  GRADED: "Gradé",
};

export const MARKET_SOURCES = [
  { id: "cardmarket", name: "CardMarket", color: "#1B4B8E" },
];
