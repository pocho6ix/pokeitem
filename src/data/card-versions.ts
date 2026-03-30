// ---------------------------------------------------------------------------
// Card version availability per serie / bloc
//
// Rules derived from Pokémon TCG print history (French market):
//  • EX / WOTC            → Normale + Reverse
//  • DP / PL / HGSS / NB / XY / SL / EB → Normale + Reverse
//  • EV01–EV02            → Normale + Reverse + Reverse Pokéball
//  • EV03–EV10.5          → Normale + Reverse + Reverse Pokéball + Reverse Masterball
//  • ME01 (new bloc)      → Normale + Reverse  (no stamp — deliberate design choice)
//  • ME02+                → Normale + Reverse + Reverse Pokéball
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

// ── Shorthand version sets ───────────────────────────────────────────────────

const V_NORMAL     = [CardVersion.NORMAL] as const;
const V_REVERSE    = [CardVersion.NORMAL, CardVersion.REVERSE] as const;
const V_POKEBALL   = [CardVersion.NORMAL, CardVersion.REVERSE, CardVersion.REVERSE_POKEBALL] as const;
const V_MASTERBALL = [CardVersion.NORMAL, CardVersion.REVERSE, CardVersion.REVERSE_POKEBALL, CardVersion.REVERSE_MASTERBALL] as const;

// ── Per-serie overrides (most specific, checked first) ───────────────────────

const SERIE_VERSION_MAP: Record<string, readonly CardVersion[]> = {
  // ── Méga-Évolution bloc (new, 2025–) ────────────────────────────────────
  "mega-evolution":             V_REVERSE,    // ME01 — no Pokéball stamp
  "flammes-fantasmagoriques":   V_POKEBALL,   // ME02
  "heros-transcendants":        V_POKEBALL,   // ME2.5
  "equilibre-parfait":          V_POKEBALL,   // ME03

  // ── Écarlate & Violet bloc ───────────────────────────────────────────────
  // EV01-EV02: Pokéball stamp, no Masterball
  "ecarlate-et-violet":         V_POKEBALL,   // EV01
  "evolutions-a-paldea":        V_POKEBALL,   // EV02

  // EV03+: Pokéball + Masterball
  "flammes-obsidiennes":        V_MASTERBALL, // EV03
  "pokemon-151":                V_MASTERBALL, // EV3.5
  "faille-paradoxe":            V_MASTERBALL, // EV04
  "destinees-de-paldea":        V_MASTERBALL, // EV4.5
  "forces-temporelles":         V_MASTERBALL, // EV05
  "mascarade-crepusculaire":    V_MASTERBALL, // EV06
  "fable-nebuleuse":            V_MASTERBALL, // EV6.5
  "couronne-stellaire":         V_MASTERBALL, // EV07
  "etincelles-deferlantes":     V_MASTERBALL, // EV08
  "evolutions-prismatiques":    V_MASTERBALL, // EV8.5
  "aventures-ensemble":         V_MASTERBALL, // EV09
  "rivalites-destinees":        V_MASTERBALL, // EV10
  "foudre-noire-flamme-blanche": V_MASTERBALL, // EV10.5

  // ── Épée & Bouclier — no Pokéball stamps ────────────────────────────────
  // All EB series use V_REVERSE (default fallback handles this via bloc)

  // ── Special / promo-only sets (no reverse) ──────────────────────────────
  "celebrations":               V_NORMAL,
  "destinees-radieuses":        V_NORMAL,
  "stars-etincelantes":         V_NORMAL,
  "la-voie-du-maitre":          V_NORMAL,
};

// ── Bloc-level defaults (fallback when serie not in map above) ───────────────

const BLOC_DEFAULT_VERSIONS: Record<string, readonly CardVersion[]> = {
  "mega-evolution":      V_POKEBALL,   // new ME bloc default (ME02+)
  "ecarlate-violet":     V_MASTERBALL, // EV default (most sets have Masterball)
  "epee-bouclier":       V_REVERSE,
  "soleil-lune":         V_REVERSE,
  "xy":                  V_REVERSE,
  "noir-blanc":          V_REVERSE,
  "heartgold-soulsilver": V_REVERSE,
  "platine":             V_REVERSE,
  "diamant-perle":       V_REVERSE,
  "ex":                  V_REVERSE,
  "wotc":                V_REVERSE,
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
