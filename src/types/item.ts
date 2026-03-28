// ---------------------------------------------------------------------------
// Item-related types – mirrors Prisma schema enums and models
// ---------------------------------------------------------------------------

export enum ItemType {
  BOOSTER = 'BOOSTER',
  DISPLAY = 'DISPLAY',
  ETB = 'ETB',
  COFFRET = 'COFFRET',
  COFFRET_PREMIUM = 'COFFRET_PREMIUM',
  MINI_TIN = 'MINI_TIN',
  POKEBOX = 'POKEBOX',
  TRIPACK = 'TRIPACK',
  DUOPACK = 'DUOPACK',
  DECK = 'DECK',
  BUNDLE = 'BUNDLE',
  VALISETTE = 'VALISETTE',
  KIT_AVANT_PREMIERE = 'KIT_AVANT_PREMIERE',
  COLLECTION_FIGURINE = 'COLLECTION_FIGURINE',
  POKEBALL_TIN = 'POKEBALL_TIN',
  OTHER = 'OTHER',
}

export enum Language {
  FR = 'FR',
  EN = 'EN',
  JP = 'JP',
  DE = 'DE',
  ES = 'ES',
  IT = 'IT',
  PT = 'PT',
  KO = 'KO',
  ZH = 'ZH',
}

export enum ItemCondition {
  SEALED = 'SEALED',
  OPENED = 'OPENED',
  DAMAGED = 'DAMAGED',
  GRADED = 'GRADED',
}

// ---------------------------------------------------------------------------
// Domain models
// ---------------------------------------------------------------------------

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
  serie?: Serie;
  prices?: PriceHistory[];
  userItems?: unknown[];
}

export interface PriceHistory {
  id: string;
  itemId: string;
  price: number;
  source: string;
  currency: string;
  date: string;
}
