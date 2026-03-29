export const ITEM_TYPE_LABELS: Record<string, string> = {
  BOOSTER: "Booster",
  BOOSTER_BOX: "Booster Box",
  ETB: "Elite Trainer Box",
  BOX_SET: "Box Set",
  UPC: "Ultra Premium Collection",
  TIN: "Tin",
  BLISTER: "Blister",
  THEME_DECK: "Theme Deck",
  BUNDLE: "Bundle",
  TRAINER_KIT: "Trainer Kit",
  OTHER: "Autre",
};

export const ITEM_TYPE_COLORS: Record<string, string> = {
  BOOSTER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  BOOSTER_BOX: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  ETB: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  BOX_SET: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  UPC: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  TIN: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  BLISTER: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  THEME_DECK: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  BUNDLE: "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200",
  TRAINER_KIT: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export const ITEM_TYPE_MSRP: Record<string, number> = {
  BOOSTER: 4.5,
  BOOSTER_BOX: 160,
  ETB: 52,
  BOX_SET: 35,
  UPC: 135,
  TIN: 15,
  BLISTER: 14,
  THEME_DECK: 20,
  BUNDLE: 30,
  TRAINER_KIT: 37,
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
