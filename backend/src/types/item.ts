// ---------------------------------------------------------------------------
// Item-related types — mirrors Prisma schema enums and models.
// Copied from the PWA (src/types/item.ts) so backend/src/data/* compiles
// without any path-alias gymnastics.
// ---------------------------------------------------------------------------

export enum ItemType {
  BOOSTER = "BOOSTER",
  DUOPACK = "DUOPACK",
  TRIPACK = "TRIPACK",
  BOOSTER_BOX = "BOOSTER_BOX",
  ETB = "ETB",
  BOX_SET = "BOX_SET",
  UPC = "UPC",
  TIN = "TIN",
  MINI_TIN = "MINI_TIN",
  POKEBALL_TIN = "POKEBALL_TIN",
  BLISTER = "BLISTER",
  THEME_DECK = "THEME_DECK",
  BUNDLE = "BUNDLE",
  TRAINER_KIT = "TRAINER_KIT",
  OTHER = "OTHER",
}

export enum Language {
  FR = "FR",
  EN = "EN",
  JP = "JP",
  DE = "DE",
  ES = "ES",
  IT = "IT",
  PT = "PT",
  KO = "KO",
  ZH = "ZH",
}

export enum ItemCondition {
  SEALED = "SEALED",
  OPENED = "OPENED",
  DAMAGED = "DAMAGED",
  GRADED = "GRADED",
}

export interface Bloc {
  id: string;
  name: string;
  nameEn: string;
  slug: string;
  abbreviation: string;
  logoUrl: string | null;
  imageUrl: string | null;
  startDate: string;
  endDate: string | null;
  order: number;
  series?: Serie[];
}

export interface Serie {
  id: string;
  blocId: string;
  name: string;
  nameEn: string;
  slug: string;
  abbreviation: string;
  imageUrl: string | null;
  bannerUrl: string | null;
  releaseDate: string;
  cardCount: number;
  order: number;
  bloc?: Bloc;
  items?: Item[];
}

export interface Item {
  id: string;
  serieId: string;
  name: string;
  slug: string;
  type: ItemType;
  description: string | null;
  imageUrl: string | null;
  images: string[];
  ean: string | null;
  releaseDate: string;
  retailPrice: number | null;
  currentPrice: number | null;
  priceUpdatedAt: string | null;
  boosterCount: number | null;
  promoCards: string[];
  contents: string | null;
  isExclusive: boolean;
  exclusiveStore: string | null;
  language: Language;
  order: number;
  cardmarketUrl?: string | null;
  cardmarketId?: string | null;
  priceFrom?: number | null;
  priceTrend?: number | null;
  availableSellers?: number | null;
  lastScrapedAt?: string | null;
  serie?: Serie;
  prices?: PriceHistory[];
  portfolioItems?: unknown[];
}

export interface PriceHistory {
  id: string;
  itemId: string;
  price: number;
  source: string;
  currency: string;
  date: string;
}
