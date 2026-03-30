// ---------------------------------------------------------------------------
// Card-related types — mirrors Prisma schema
// ---------------------------------------------------------------------------

export enum CardRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  DOUBLE_RARE = 'DOUBLE_RARE',
  ILLUSTRATION_RARE = 'ILLUSTRATION_RARE',
  SPECIAL_ILLUSTRATION_RARE = 'SPECIAL_ILLUSTRATION_RARE',
  HYPER_RARE = 'HYPER_RARE',
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
}

// Progress summary per bloc
export interface BlocCardProgress {
  blocSlug: string;
  blocName: string;
  blocAbbreviation: string | null;
  series: SerieCardProgress[];
}

export const CARD_RARITY_LABELS: Record<CardRarity, string> = {
  [CardRarity.COMMON]: 'Commune',
  [CardRarity.UNCOMMON]: 'Peu Commune',
  [CardRarity.RARE]: 'Rare',
  [CardRarity.DOUBLE_RARE]: 'Double Rare',
  [CardRarity.ILLUSTRATION_RARE]: 'Rare Illustration',
  [CardRarity.SPECIAL_ILLUSTRATION_RARE]: 'Rare Illustration Spéciale',
  [CardRarity.HYPER_RARE]: 'Hyper Rare',
  [CardRarity.ACE_SPEC_RARE]: 'Rare As Spécial',
  [CardRarity.PROMO]: 'Promo',
};

export const CARD_CONDITION_LABELS: Record<CardCondition, string> = {
  [CardCondition.MINT]: 'Mint',
  [CardCondition.NEAR_MINT]: 'Near Mint',
  [CardCondition.EXCELLENT]: 'Excellent',
  [CardCondition.GOOD]: 'Bon État',
  [CardCondition.LIGHT_PLAYED]: 'Légèrement Jouée',
  [CardCondition.PLAYED]: 'Jouée',
  [CardCondition.POOR]: 'Mauvais État',
};
