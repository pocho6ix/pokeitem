// ---------------------------------------------------------------------------
// Card version availability per serie / bloc
//
// Rules derived from Pokémon TCG print history (French market):
//
//  WOTC era
//  • Set de Base, Jungle, Fossile, Team Rocket
//      → Normale/Holo + Édition 1  (1ère édition = variante avec le stamp)
//  • Neo Genesis → Neo Destiny                 → Normale + Holo only
//  • Expédition, Aquapolis (e-Card)           → Normale + Reverse
//
//  EX → EB blocs                                 → Normale + Reverse
//
//  Écarlate & Violet (EV)
//  • EV01–EV10, EV4.5, EV6.5                    → Normale + Reverse
//  • Évolutions Prismatiques, Foudre Noire, Flamme Blanche → Normale + Reverse + Poké Ball + Master Ball
//
//  Méga-Évolution (ME) — new 2025 bloc
//  • ME01, ME02                                  → Normale + Reverse
//  • Héros Transcendants (ME2.5), Équilibre Parfait (ME03) → + Reverse Poké Ball
// ---------------------------------------------------------------------------

import type { CardRarity } from "@/types/card";

export enum CardVersion {
  NORMAL             = "NORMAL",
  REVERSE            = "REVERSE",
  REVERSE_POKEBALL   = "REVERSE_POKEBALL",
  REVERSE_MASTERBALL = "REVERSE_MASTERBALL",
  // WOTC 4 base sets only — physical 1st Edition stamp variant.
  FIRST_EDITION      = "FIRST_EDITION",
}

/**
 * Generic labels, used when the display context doesn't know the card rarity.
 * For the 4 WOTC base sets, `getVersionLabel(version, rarity)` below provides
 * a rarity-aware label ("Holo" instead of "Normale" on HOLO_RARE cards).
 */
export const CARD_VERSION_LABELS: Record<CardVersion, string> = {
  [CardVersion.NORMAL]:             "Normale",
  [CardVersion.REVERSE]:            "Reverse",
  [CardVersion.REVERSE_POKEBALL]:   "Reverse (Pokéball)",
  [CardVersion.REVERSE_MASTERBALL]: "Reverse (Masterball)",
  [CardVersion.FIRST_EDITION]:      "Édition 1",
};

export const VERSION_SORT_ORDER: Record<CardVersion, number> = {
  [CardVersion.NORMAL]:             0,
  [CardVersion.FIRST_EDITION]:      1,  // ED1 sits right next to its Normale/Holo counterpart
  [CardVersion.REVERSE]:            2,
  [CardVersion.REVERSE_POKEBALL]:   3,
  [CardVersion.REVERSE_MASTERBALL]: 4,
};

// ── Rarity-aware label helper ────────────────────────────────────────────────

/**
 * Rarity-aware label used in UI pickers and displays.
 * For the 4 WOTC base sets:
 *   - NORMAL on a HOLO_RARE card → "Holo"  (the card itself is holographic)
 *   - NORMAL on any other rarity → "Normale"
 *   - FIRST_EDITION               → "Édition 1"
 * All other versions fall back to CARD_VERSION_LABELS.
 */
export function getVersionLabel(version: CardVersion, rarity?: CardRarity | string | null): string {
  if (version === CardVersion.NORMAL && rarity === "HOLO_RARE") return "Holo";
  return CARD_VERSION_LABELS[version];
}

// ── Shorthand version sets ───────────────────────────────────────────────────

const V_NORMAL     = [CardVersion.NORMAL] as const;
const V_REVERSE    = [CardVersion.NORMAL, CardVersion.REVERSE] as const;
const V_POKEBALL   = [CardVersion.NORMAL, CardVersion.REVERSE, CardVersion.REVERSE_POKEBALL] as const;
const V_MASTERBALL = [CardVersion.NORMAL, CardVersion.REVERSE, CardVersion.REVERSE_POKEBALL, CardVersion.REVERSE_MASTERBALL] as const;
// WOTC base sets — Normale/Holo + Édition 1 (physical stamp variant).
const V_WOTC_BASE  = [CardVersion.NORMAL, CardVersion.FIRST_EDITION] as const;

// ── Per-serie overrides (most specific, checked first) ───────────────────────

const SERIE_VERSION_MAP: Record<string, readonly CardVersion[]> = {
  // ── WOTC — pre-Reverse era (Set de Base → Neo Destiny) ──────────────────
  // These sets predate the Reverse mechanic.
  // Expédition, Aquapolis (e-Card) DO have Reverse → wotc bloc default applies.
  "set-de-base":      V_WOTC_BASE,
  "jungle":           V_WOTC_BASE,
  "fossile":          V_WOTC_BASE,
  "team-rocket":      V_WOTC_BASE,
  "neo-genesis":      V_NORMAL,
  "neo-discovery":    V_NORMAL,
  "neo-revelation":   V_NORMAL,
  "neo-destiny":      V_NORMAL,

  // ── Épée & Bouclier — special sets with Reverse ─────────────────────────
  "celebrations":        V_NORMAL,  // Célébrations — set anniversaire, pas de Reverse holo
  "destinees-radieuses": V_REVERSE, // Destinées Radieuses
  "stars-etincelantes":  V_REVERSE, // Stars Étincelantes (EB09)
  "la-voie-du-maitre":   V_REVERSE, // La Voie du Maître

  // ── Écarlate & Violet — only 3 sets carry the Master Ball stamp ─────────
  "evolutions-prismatiques": V_MASTERBALL, // EV8.5
  "foudre-noire":            V_MASTERBALL, // EV10.5b
  "flamme-blanche":          V_MASTERBALL, // EV10.5w

  // ── Méga-Évolution — Héros Transcendants ajoute la Poké Ball (pas ME03)
  "heros-transcendants": V_POKEBALL, // ME2.5 — Reverse (type symbol) + Poké Ball

  // ── XY — sets spéciaux sans Reverse holo ────────────────────────────────
  "double-danger": V_NORMAL, // Double Crisis — mini-set 34 cartes, pas de Reverse

  // ── Promos & séries spéciales — une seule version (pas de Reverse) ────────
  "energies-mega-evolution":     V_NORMAL,
  "promos-mega-evolution":       V_NORMAL,
  "promos-ecarlate-et-violet":   V_NORMAL,
  "energies-ecarlate-et-violet": V_NORMAL,
  "promos-epee-et-bouclier":     V_NORMAL,
  "promos-soleil-et-lune":       V_NORMAL,
  "promos-xy":                   V_NORMAL,
  "bienvenue-a-kalos":           V_NORMAL,
  "promos-noir-et-blanc":        V_NORMAL,
  "coffre-des-dragons":          V_NORMAL,
  "promos-heartgold-soulsilver": V_NORMAL,
  "promos-diamant-et-perle":     V_NORMAL,
  "promos-wizards":              V_NORMAL,
};

// ── Bloc-level defaults (fallback when serie not in map above) ───────────────

const BLOC_DEFAULT_VERSIONS: Record<string, readonly CardVersion[]> = {
  "mega-evolution":           V_REVERSE, // ME01, ME02: Normale + Reverse (no stamp)
  "ecarlate-violet":          V_REVERSE, // EV01–EV10: Normale + Reverse (most sets)
  "epee-bouclier":            V_REVERSE,
  "soleil-lune":              V_REVERSE,
  "xy":                       V_REVERSE,
  "noir-blanc":               V_REVERSE,
  "heartgold-soulsilver":     V_REVERSE,
  "platine":                  V_REVERSE,
  "diamant-perle":            V_REVERSE,
  "ex":                       V_REVERSE,
  "wotc":                     V_REVERSE, // Expédition, Aquapolis have Reverse
  // ── Promos hors-série — pas de Reverse ─────────────────────────────────
  "collection-mcdo":          V_NORMAL,  // McDonald's promos — version unique
  "pokemon-organized-play":   V_NORMAL,  // POP sets — version unique
};

// ── Public helper ────────────────────────────────────────────────────────────

/**
 * Returns the list of available versions for a given serie.
 * Checks per-serie override first, then bloc default, then falls back to NORMAL+REVERSE.
 */
export function getSerieVersions(serieSlug: string, blocSlug?: string): CardVersion[] {
  const override = SERIE_VERSION_MAP[serieSlug];
  if (override) return [...override];

  if (blocSlug) {
    const blocDefault = BLOC_DEFAULT_VERSIONS[blocSlug];
    if (blocDefault) return [...blocDefault];
  }

  return [...V_REVERSE]; // safe universal fallback
}
