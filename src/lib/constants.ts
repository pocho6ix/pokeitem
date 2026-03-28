export const ITEM_TYPE_LABELS: Record<string, string> = {
  BOOSTER: "Booster",
  DISPLAY: "Display",
  ETB: "Coffret Dresseur d'Élite",
  COFFRET: "Coffret Collection",
  COFFRET_PREMIUM: "Coffret Ultra Premium",
  MINI_TIN: "Mini Tin",
  POKEBOX: "Pokébox",
  TRIPACK: "Tripack",
  DUOPACK: "Duopack",
  DECK: "Deck de Combat",
  BUNDLE: "Bundle",
  VALISETTE: "Valisette",
  KIT_AVANT_PREMIERE: "Kit d'Avant-Première",
  COLLECTION_FIGURINE: "Coffret Figurine",
  POKEBALL_TIN: "Boîte Pokéball",
  OTHER: "Autre",
};

export const ITEM_TYPE_COLORS: Record<string, string> = {
  BOOSTER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  DISPLAY: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  ETB: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  COFFRET: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  COFFRET_PREMIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  MINI_TIN: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  POKEBOX: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  TRIPACK: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  DUOPACK: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  DECK: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  BUNDLE: "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200",
  VALISETTE: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  KIT_AVANT_PREMIERE: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  COLLECTION_FIGURINE: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200",
  POKEBALL_TIN: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export const ITEM_TYPE_MSRP: Record<string, number> = {
  BOOSTER: 4.5,
  DISPLAY: 160,
  ETB: 52,
  COFFRET: 35,
  COFFRET_PREMIUM: 135,
  MINI_TIN: 9,
  POKEBOX: 27,
  TRIPACK: 16,
  DUOPACK: 11,
  DECK: 20,
  BUNDLE: 30,
  VALISETTE: 32,
  KIT_AVANT_PREMIERE: 37,
  COLLECTION_FIGURINE: 40,
  POKEBALL_TIN: 15,
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
  { id: "ebay", name: "eBay", color: "#E53238" },
  { id: "leboncoin", name: "LeBonCoin", color: "#FF6E14" },
  { id: "vinted", name: "Vinted", color: "#09B1BA" },
  { id: "amazon", name: "Amazon", color: "#FF9900" },
];
