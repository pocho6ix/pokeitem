import { CardRarity } from '@/types/card'

// Raretés sans version Reverse (cartes spéciales : EX, Full Art, IR, SAR, etc.)
export const SPECIAL_RARITIES = new Set<CardRarity>([
  CardRarity.DOUBLE_RARE,               // EX, V, VMAX, VSTAR
  CardRarity.NOIR_BLANC_RARE,           // Noir Blanc Rare (ME era chase cards)
  CardRarity.ULTRA_RARE,                // Full Art EX, Full Art Supporter
  CardRarity.ILLUSTRATION_RARE,         // IR (Full Art)
  CardRarity.SPECIAL_ILLUSTRATION_RARE, // SAR
  CardRarity.HYPER_RARE,                // HR
  CardRarity.MEGA_HYPER_RARE,           // MUR (Gold Méga-Évolution)
  CardRarity.MEGA_ATTAQUE_RARE,         // MAR (Méga Attaque Rare)
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
  [CardRarity.NOIR_BLANC_RARE]:          'NBR',
  [CardRarity.ULTRA_RARE]:               'UR',
  [CardRarity.ILLUSTRATION_RARE]:         'IR',
  [CardRarity.SPECIAL_ILLUSTRATION_RARE]: 'SAR',
  [CardRarity.HYPER_RARE]:               'HR',
  [CardRarity.MEGA_HYPER_RARE]:          'MUR',
  [CardRarity.MEGA_ATTAQUE_RARE]:        'MAR',
  [CardRarity.ACE_SPEC_RARE]:            'ACE',
  [CardRarity.PROMO]:                    'PROMO',
}

// Mapping TCGdex rarity string (FR) → CardRarity enum
// Includes both "old-style" capitalization and actual API strings observed in production
export const TCGDEX_RARITY_MAP: Record<string, CardRarity> = {
  // ── Communes / peu communes / rares ─────────────────────────────────────
  'Commune':                       CardRarity.COMMON,
  'Peu Commune':                   CardRarity.UNCOMMON,
  'Rare':                          CardRarity.RARE,
  'Rare Holographique':            CardRarity.RARE,
  'Holo Rare':                     CardRarity.RARE,         // SWSH holo rares (swsh10, swsh11…)
  // ── Double Rare (EX, V, VMAX, VSTAR…) ───────────────────────────────────
  'Double Rare':                   CardRarity.DOUBLE_RARE,  // EN-style key (kept for compat)
  'Double rare':                   CardRarity.DOUBLE_RARE,  // actual FR API string
  'Ultra Rare':                    CardRarity.ULTRA_RARE,   // Full-Art EX, Full-Art Supporter
  'Rare Noir Blanc':               CardRarity.NOIR_BLANC_RARE,  // Foudre Noire / Flamme Blanche chase cards
  // ── Magnifique rare (VSTAR special art, Amazing Rare, Rainbow Rare) ──────
  'Magnifique rare':               CardRarity.HYPER_RARE,   // SWSH VSTAR special art, SM Rainbow Rare
  // ── Illustration Rare (AR) ───────────────────────────────────────────────
  'Rare Illustration':             CardRarity.ILLUSTRATION_RARE,   // old-style key
  'Illustration rare':             CardRarity.ILLUSTRATION_RARE,   // actual FR API string
  // ── Special Illustration Rare (SAR) ─────────────────────────────────────
  'Rare Illustration Spéciale':    CardRarity.SPECIAL_ILLUSTRATION_RARE,  // old-style key
  'Illustration spéciale rare':    CardRarity.SPECIAL_ILLUSTRATION_RARE,  // actual FR API string
  // ── Hyper Rare (HR) ─────────────────────────────────────────────────────
  'Hyper Rare':                    CardRarity.HYPER_RARE,
  'Hyper rare':                    CardRarity.HYPER_RARE,  // lowercase variant
  // ── Méga-Évolution (MUR / MAR) ──────────────────────────────────────
  'Mega Hyper Rare':               CardRarity.MEGA_HYPER_RARE,
  'Méga Hyper Rare':               CardRarity.MEGA_HYPER_RARE,
  'Méga hyper rare':               CardRarity.MEGA_HYPER_RARE,
  'Mega Attaque Rare':             CardRarity.MEGA_ATTAQUE_RARE,
  'Méga Attaque Rare':             CardRarity.MEGA_ATTAQUE_RARE,
  'Méga attaque rare':             CardRarity.MEGA_ATTAQUE_RARE,
  // ── ACE SPEC / Promo ────────────────────────────────────────────────────
  "Rare As Spécial":               CardRarity.ACE_SPEC_RARE,
  'Promo':                         CardRarity.PROMO,
  // ── Anciens sets ────────────────────────────────────────────────────────
  'Commune Inversée':              CardRarity.COMMON,
  'Peu Commune Inversée':          CardRarity.UNCOMMON,
}

export function mapTcgdexRarity(tcgdexRarity?: string | null): CardRarity {
  if (!tcgdexRarity) return CardRarity.COMMON
  return TCGDEX_RARITY_MAP[tcgdexRarity] ?? CardRarity.COMMON
}
