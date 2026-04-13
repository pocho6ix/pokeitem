// ---------------------------------------------------------------------------
// Card-related types — mirrors Prisma schema
// ---------------------------------------------------------------------------

// Re-export CardVersion from the canonical data file so everything stays in sync
export { CardVersion, CARD_VERSION_LABELS, getSerieVersions } from "@/data/card-versions";

export enum CardRarity {
  NO_RARITY = 'NO_RARITY',
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  HOLO_RARE = 'HOLO_RARE',
  DOUBLE_RARE = 'DOUBLE_RARE',
  NOIR_BLANC_RARE = 'NOIR_BLANC_RARE',
  ULTRA_RARE = 'ULTRA_RARE',
  ILLUSTRATION_RARE = 'ILLUSTRATION_RARE',
  SPECIAL_ILLUSTRATION_RARE = 'SPECIAL_ILLUSTRATION_RARE',
  HYPER_RARE = 'HYPER_RARE',
  MEGA_HYPER_RARE = 'MEGA_HYPER_RARE',
  MEGA_ATTAQUE_RARE = 'MEGA_ATTAQUE_RARE',
  SECRET_RARE = 'SECRET_RARE',
  ACE_SPEC_RARE = 'ACE_SPEC_RARE',
  PROMO = 'PROMO',
}

export enum CardCondition {
  MINT = 'MINT',
  NEAR_MINT = 'NEAR_MINT',
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  LIGHT_PLAYED = 'LIGHT_PLAYED',
  PLAYED = 'PLAYED',
  POOR = 'POOR',
  GRADED = 'GRADED',
}

export enum DoubleAvailability {
  TRADE = 'TRADE',
  SELL  = 'SELL',
  BOTH  = 'BOTH',
}

export interface Card {
  id: string;
  serieId: string;
  number: string;
  name: string;
  rarity: CardRarity;
  imageUrl: string | null;
  tcgdexId: string | null;
}

export interface UserCard {
  id: string;
  userId: string;
  cardId: string;
  quantity: number;
  foil: boolean;
  condition: CardCondition;
  language: string;
  version: string;
  card?: Card;
}

export interface UserCardDouble {
  id: string;
  userId: string;
  cardId: string;
  quantity: number;
  condition: CardCondition;
  language: string;
  version: string;
  availability: DoubleAvailability;
  price: number | null;
  card?: Card;
}

// Progress summary per series
export interface SerieCardProgress {
  serieSlug: string;
  serieName: string;
  serieAbbreviation: string | null;
  serieImageUrl: string | null;
  totalCards: number;
  ownedCards: number;
  /** Sum of card market prices × quantity for owned cards in this series */
  marketValue: number;
}

// Progress summary per bloc
export interface BlocCardProgress {
  blocSlug: string;
  blocName: string;
  blocAbbreviation: string | null;
  series: SerieCardProgress[];
}

export const CARD_RARITY_LABELS: Record<CardRarity, string> = {
  [CardRarity.NO_RARITY]: 'Sans rareté',
  [CardRarity.COMMON]: 'Commune',
  [CardRarity.UNCOMMON]: 'Peu Commune',
  [CardRarity.RARE]: 'Rare',
  [CardRarity.HOLO_RARE]: 'Rare Holographique',
  [CardRarity.DOUBLE_RARE]: 'Double Rare',
  [CardRarity.NOIR_BLANC_RARE]: 'Noir Blanc Rare',
  [CardRarity.ULTRA_RARE]: 'Ultra Rare',
  [CardRarity.ILLUSTRATION_RARE]: 'Rare Illustration',
  [CardRarity.SPECIAL_ILLUSTRATION_RARE]: 'Rare Illustration Spéciale',
  [CardRarity.HYPER_RARE]: 'Hyper Rare',
  [CardRarity.MEGA_HYPER_RARE]: 'Méga Hyper Rare',
  [CardRarity.MEGA_ATTAQUE_RARE]: 'Méga Attaque Rare',
  [CardRarity.SECRET_RARE]: 'Secrète',
  [CardRarity.ACE_SPEC_RARE]: 'Rare As Spécial',
  [CardRarity.PROMO]: 'Promo',
};

export const CARD_RARITY_SYMBOL: Record<CardRarity, string> = {
  [CardRarity.NO_RARITY]: '○',
  [CardRarity.COMMON]: '●',
  [CardRarity.UNCOMMON]: '◆',
  [CardRarity.RARE]: '★',
  [CardRarity.HOLO_RARE]: '☆',
  [CardRarity.DOUBLE_RARE]: '★★',
  [CardRarity.NOIR_BLANC_RARE]: '★☆',
  [CardRarity.ULTRA_RARE]: '☆☆',
  [CardRarity.ILLUSTRATION_RARE]: '✦',
  [CardRarity.SPECIAL_ILLUSTRATION_RARE]: '✦★',
  [CardRarity.HYPER_RARE]: '✦✦',
  [CardRarity.MEGA_HYPER_RARE]: '✨',
  [CardRarity.MEGA_ATTAQUE_RARE]: '⚔',
  [CardRarity.SECRET_RARE]: '✦',
  [CardRarity.ACE_SPEC_RARE]: '◈',
  [CardRarity.PROMO]: 'P',
};

export const CARD_RARITY_IMAGE: Record<CardRarity, string> = {
  [CardRarity.NO_RARITY]: '/rarities/no-rarity.png',
  [CardRarity.COMMON]: '/rarities/common.png',
  [CardRarity.UNCOMMON]: '/rarities/uncommon.png',
  [CardRarity.RARE]: '/rarities/rare.png',
  [CardRarity.HOLO_RARE]: '/rarities/holo-rare.png',
  [CardRarity.DOUBLE_RARE]: '/rarities/double-rare.png',
  [CardRarity.NOIR_BLANC_RARE]: '/rarities/noir-blanc-rare.png',
  [CardRarity.ULTRA_RARE]: '/rarities/ultra-rare.png',
  [CardRarity.ILLUSTRATION_RARE]: '/rarities/illustration-rare.png',
  [CardRarity.SPECIAL_ILLUSTRATION_RARE]: '/rarities/special-illustration-rare.png',
  [CardRarity.HYPER_RARE]: '/rarities/hyper-rare.png',
  [CardRarity.MEGA_HYPER_RARE]: '/rarities/mega-hyper-rare.png',
  [CardRarity.MEGA_ATTAQUE_RARE]: '/rarities/mega-attaque-rare.png',
  [CardRarity.SECRET_RARE]: '/rarities/secret-rare.png',
  [CardRarity.ACE_SPEC_RARE]: '/rarities/ace-spec-rare.png',
  [CardRarity.PROMO]: '/rarities/promo.png',
};

export const CARD_RARITY_ORDER: Record<CardRarity, number> = {
  [CardRarity.NO_RARITY]: 0,
  [CardRarity.COMMON]: 1,
  [CardRarity.UNCOMMON]: 2,
  [CardRarity.RARE]: 3,
  [CardRarity.HOLO_RARE]: 4,
  [CardRarity.DOUBLE_RARE]: 5,
  [CardRarity.ULTRA_RARE]: 6,
  [CardRarity.ILLUSTRATION_RARE]: 7,
  [CardRarity.SPECIAL_ILLUSTRATION_RARE]: 8,
  [CardRarity.NOIR_BLANC_RARE]: 9,
  [CardRarity.SECRET_RARE]: 10,
  [CardRarity.HYPER_RARE]: 11,
  [CardRarity.MEGA_HYPER_RARE]: 12,
  [CardRarity.MEGA_ATTAQUE_RARE]: 13,
  [CardRarity.ACE_SPEC_RARE]: 14,
  [CardRarity.PROMO]: 15,
};

export const CARD_CONDITION_LABELS: Record<CardCondition, string> = {
  [CardCondition.MINT]: 'Mint',
  [CardCondition.NEAR_MINT]: 'Near Mint',
  [CardCondition.EXCELLENT]: 'Excellent',
  [CardCondition.GOOD]: 'Good',
  [CardCondition.LIGHT_PLAYED]: 'Light Played',
  [CardCondition.PLAYED]: 'Played',
  [CardCondition.POOR]: 'Poor',
  [CardCondition.GRADED]: 'Gradée',
};

export const DOUBLE_AVAILABILITY_LABELS: Record<DoubleAvailability, string> = {
  [DoubleAvailability.TRADE]: 'Échange',
  [DoubleAvailability.SELL]: 'Vente',
  [DoubleAvailability.BOTH]: 'Échange & Vente',
};

export const CARD_LANGUAGES = [
  { value: 'FR', label: 'Français' },
  { value: 'EN', label: 'Anglais' },
  { value: 'JP', label: 'Japonais' },
  { value: 'DE', label: 'Allemand' },
  { value: 'ES', label: 'Espagnol' },
  { value: 'IT', label: 'Italien' },
  { value: 'PT', label: 'Portugais' },
  { value: 'KO', label: 'Coréen' },
  { value: 'ZH', label: 'Chinois' },
];
