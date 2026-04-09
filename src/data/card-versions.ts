// ---------------------------------------------------------------------------
// Card version availability per serie / bloc
//
// Rules derived from Pokémon TCG print history (French market):
//
//  WOTC era
//  • Set de Base → Neo Destiny  (pre-Reverse)   → Normale + Holo only
//  • Expédition, Aquapolis, Skyridge (e-Card)    → Normale + Reverse (first sets with Reverse)
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

export enum CardVersion {
  NORMAL            = "NORMAL",
  REVERSE           = "REVERSE",
  REVERSE_POKEBALL  = "REVERSE_POKEBALL",
  REVERSE_MASTERBALL = "REVERSE_MASTERBALL",
}

export const CARD_VERSION_LABELS: Record<CardVersion, string> = {
  [CardVersion.NORMAL]:             "Normale",
  [CardVersion.REVERSE]:            "Reverse",
  [CardVersion.REVERSE_POKEBALL]:   "Reverse (Pokéball)",
  [CardVersion.REVERSE_MASTERBALL]: "Reverse (Masterball)",
};

export const VERSION_SORT_ORDER: Record<CardVersion, number> = {
  [CardVersion.NORMAL]:             0,
  [CardVersion.REVERSE]:            1,
  [CardVersion.REVERSE_POKEBALL]:   2,
  [CardVersion.REVERSE_MASTERBALL]: 3,
};

// ── Shorthand version sets ───────────────────────────────────────────────────

const V_NORMAL     = [CardVersion.NORMAL] as const;
const V_REVERSE    = [CardVersion.NORMAL, CardVersion.REVERSE] as const;
const V_POKEBALL   = [CardVersion.NORMAL, CardVersion.REVERSE, CardVersion.REVERSE_POKEBALL] as const;
const V_MASTERBALL = [CardVersion.NORMAL, CardVersion.REVERSE, CardVersion.REVERSE_POKEBALL, CardVersion.REVERSE_MASTERBALL] as const;

// ── Per-serie overrides (most specific, checked first) ───────────────────────

const SERIE_VERSION_MAP: Record<string, readonly CardVersion[]> = {
  // ── WOTC — pre-Reverse era (Set de Base → Neo Destiny) ──────────────────
  // These sets predate the Reverse mechanic — Normale + Holo only.
  // Expédition, Aquapolis, Skyridge (e-Card) DO have Reverse → wotc bloc default applies.
  "set-de-base":      V_NORMAL,
  "jungle":           V_NORMAL,
  "fossile":          V_NORMAL,
  "set-de-base-2":    V_NORMAL,
  "team-rocket":      V_NORMAL,
  "gym-heroes":       V_NORMAL,
  "gym-challenge":    V_NORMAL,
  "neo-genesis":      V_NORMAL,
  "neo-discovery":    V_NORMAL,
  "neo-revelation":   V_NORMAL,
  "neo-destiny":      V_NORMAL,

  // ── Épée & Bouclier — special sets with Reverse ─────────────────────────
  "celebrations":        V_REVERSE, // Célébrations
  "destinees-radieuses": V_REVERSE, // Destinées Radieuses
  "stars-etincelantes":  V_REVERSE, // Stars Étincelantes (EB09)
  "la-voie-du-maitre":   V_REVERSE, // La Voie du Maître

  // ── Écarlate & Violet — only 3 sets carry the Master Ball stamp ─────────
  "evolutions-prismatiques": V_MASTERBALL, // EV8.5
  "foudre-noire":            V_MASTERBALL, // EV10.5b
  "flamme-blanche":          V_MASTERBALL, // EV10.5w

  // ── Méga-Évolution — Héros Transcendants ajoute la Poké Ball (pas ME03)
  "heros-transcendants": V_POKEBALL, // ME2.5 — Reverse (type symbol) + Poké Ball

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
  "promos-nintendo":             V_NORMAL,
};

// ── Bloc-level defaults (fallback when serie not in map above) ───────────────

const BLOC_DEFAULT_VERSIONS: Record<string, readonly CardVersion[]> = {
  "mega-evolution":       V_REVERSE, // ME01, ME02: Normale + Reverse (no stamp)
  "ecarlate-violet":      V_REVERSE, // EV01–EV10: Normale + Reverse (most sets)
  "epee-bouclier":        V_REVERSE,
  "soleil-lune":          V_REVERSE,
  "xy":                   V_REVERSE,
  "noir-blanc":           V_REVERSE,
  "heartgold-soulsilver": V_REVERSE,
  "platine":              V_REVERSE,
  "diamant-perle":        V_REVERSE,
  "ex":                   V_REVERSE,
  "wotc":                 V_REVERSE, // Expédition, Aquapolis, Skyridge have Reverse
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
