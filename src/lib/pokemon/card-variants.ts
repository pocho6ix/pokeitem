import { CardRarity } from '@/types/card'

// Raretés sans version Reverse (cartes spéciales : EX, Full Art, IR, SAR, etc.)
export const SPECIAL_RARITIES = new Set<CardRarity>([
  CardRarity.DOUBLE_RARE,               // EX, V, VMAX, VSTAR
  CardRarity.ILLUSTRATION_RARE,         // IR (Full Art)
  CardRarity.SPECIAL_ILLUSTRATION_RARE, // SAR
  CardRarity.HYPER_RARE,                // HR
  CardRarity.ACE_SPEC_RARE,             // As Spécial
  CardRarity.PROMO,                     // Promo (pas de reverse)
])

export function isSpecialCard(rarity: CardRarity | null | undefined): boolean {
  if (!rarity) return false
  return SPECIAL_RARITIES.has(rarity)
}

// Labels courts pour les badges dans la grille
export const RARITY_BADGE_LABELS: Partial<Record<CardRarity, string>> = {
  [CardRarity.DOUBLE_RARE]:               'EX',
  [CardRarity.ILLUSTRATION_RARE]:         'IR',
  [CardRarity.SPECIAL_ILLUSTRATION_RARE]: 'SAR',
  [CardRarity.HYPER_RARE]:               'HR',
  [CardRarity.ACE_SPEC_RARE]:            'ACE',
  [CardRarity.PROMO]:                    'PROMO',
}

// Mapping TCGdex rarity string (FR) → CardRarity enum
export const TCGDEX_RARITY_MAP: Record<string, CardRarity> = {
  'Commune':                     CardRarity.COMMON,
  'Peu Commune':                 CardRarity.UNCOMMON,
  'Rare':                        CardRarity.RARE,
  'Rare Holographique':          CardRarity.RARE,
  'Double Rare':                 CardRarity.DOUBLE_RARE,
  'Rare Illustration':           CardRarity.ILLUSTRATION_RARE,
  'Rare Illustration Spéciale':  CardRarity.SPECIAL_ILLUSTRATION_RARE,
  'Hyper Rare':                  CardRarity.HYPER_RARE,
  "Rare As Spécial":             CardRarity.ACE_SPEC_RARE,
  'Promo':                       CardRarity.PROMO,
  // Anciens sets
  'Commune Inversée':            CardRarity.COMMON,
  'Peu Commune Inversée':        CardRarity.UNCOMMON,
}

export function mapTcgdexRarity(tcgdexRarity?: string | null): CardRarity {
  if (!tcgdexRarity) return CardRarity.COMMON
  return TCGDEX_RARITY_MAP[tcgdexRarity] ?? CardRarity.COMMON
}
