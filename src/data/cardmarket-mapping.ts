// ---------------------------------------------------------------------------
// Cardmarket items mapping — Phase 1 static data.
// ---------------------------------------------------------------------------
// Primary matching strategy (see docs/cardmarket-audit.md, Option A):
//
//   Pokeitem Serie.nameEn  ─▶  CM episode.name   (exact / token-sorted fuzzy)
//                           ─▶  CM episode.slug  (what /pokemon/products uses)
//
// The overrides below capture cases where Serie.nameEn drifted from Cardmarket's
// canonical name. Only slug-to-slug overrides live here — runtime code does the
// rest via `normalizeName`/`simpleKey` (see scripts/audit-cardmarket-coverage.ts).
//
// Keep this file short: every entry is a deviation from the auto-match.
// Regenerate the gap report with: npx tsx scripts/audit-cardmarket-coverage.ts
// ---------------------------------------------------------------------------

import { ItemType } from "@prisma/client"

/** DB Serie.slug (FR) → CM episode.slug (EN). Overrides only. */
export const SERIE_SLUG_FR_TO_CM_EPISODE_SLUG: Record<string, string> = {
  "aventures-ensemble": "journey-together",
  "dragon-ex": "ex-dragon",
  "equilibre-parfait": "perfect-order",
  "flamme-blanche": "white-flare",
  "flammes-fantasmagoriques": "phantasmal-flames",
  "foudre-noire": "black-bolt",
  "heros-transcendants": "ascended-heroes",
  "pokemon-151": "151",
  "set-de-base": "base",
  "triomphe": "hs-triumphant",
}

/**
 * ItemType → regex rules used to score a CM product name against a Pokeitem
 * item. Positive: at least one must match. Negative: any match disqualifies.
 */
export interface TypeRule {
  positive: RegExp[]
  negative: RegExp[]
}

export const PRODUCT_TYPE_RULES: Record<ItemType, TypeRule> = {
  BOOSTER_BOX: {
    positive: [/\bbooster box\b/i, /enhanced booster display/i],
    negative: [/\bcase\b/i, /pokémon center/i, /\bpc\b\s+booster/i, /build\s*[&]\s*battle/i, /\(18 boosters\)/i, /mini tin display/i, /bundle display/i, /sleeved/i],
  },
  ETB: {
    positive: [/\belite trainer box\b/i],
    negative: [/\bcase\b/i, /pokémon center/i, /\bpc elite/i],
  },
  BUNDLE: {
    positive: [/\bbooster bundle\b/i],
    negative: [/\bcase\b/i, /bundle display$/i, /\bversion\s?[12]\b/i, /pokémon center version/i],
  },
  UPC: {
    positive: [/ultra.?premium collection/i, /\bupc\b/i],
    negative: [/playmat/i],
  },
  TRIPACK: {
    positive: [/3.?pack blister/i, /three.?pack blister/i, /\btrio\b/i],
    negative: [/premium checklane/i],
  },
  DUOPACK: {
    positive: [/2.?pack blister/i, /two.?pack blister/i, /\bduo\b.*blister/i],
    negative: [],
  },
  BOOSTER: {
    positive: [/\bbooster$/i, /\bbooster pack\b/i, /\bsingle booster\b/i],
    negative: [/\bbox\b/i, /\bbundle\b/i, /\bsleeved\b/i, /\bcase\b/i, /blister/i, /build/i, /collection/i, /\btin\b/i, /\(\d+\s+cards?\)/i, /version/i, /pokémon center/i],
  },
  MINI_TIN: {
    positive: [/mini.?tin/i],
    negative: [/mini tin display/i, /\bcase\b/i, /bundle/i],
  },
  POKEBALL_TIN: {
    positive: [/poké.?ball tin/i, /pokeball tin/i],
    negative: [],
  },
  TIN: {
    positive: [/\btin\b/i],
    negative: [/mini.?tin/i, /poké.?ball tin/i, /pokeball tin/i, /\bcase\b/i, /us version/i],
  },
  BOX_SET: {
    positive: [/\bpremium collection\b/i, /\bcollection box\b/i, /\bspecial collection\b/i, /\bfigure collection\b/i, /\bbinder collection\b/i, /tech sticker collection/i, /premium figure collection/i, /\bpokébox\b/i],
    negative: [/ultra.?premium/i, /playmat/i, /collection display/i],
  },
  BLISTER: {
    positive: [/premium checklane blister/i, /\bchecklane blister\b/i, /1.?pack blister/i, /\bblister\b/i],
    negative: [/3.?pack/i, /2.?pack/i, /checklane$/i],
  },
  THEME_DECK: {
    positive: [/theme deck/i, /battle deck/i, /starter deck/i],
    negative: [],
  },
  TRAINER_KIT: {
    positive: [/trainer kit/i, /build\s*&\s*battle kit/i, /build\s*&\s*battle box/i, /prerelease/i],
    negative: [/\bcase\b/i, /display/i, /stadium/i],
  },
  OTHER: {
    positive: [],
    negative: [],
  },
}

export function scoreProductForType(productName: string, type: ItemType): number {
  const rule = PRODUCT_TYPE_RULES[type]
  if (!rule || rule.positive.length === 0) return 0
  for (const neg of rule.negative) if (neg.test(productName)) return 0
  for (const pos of rule.positive) if (pos.test(productName)) return 1
  return 0
}
