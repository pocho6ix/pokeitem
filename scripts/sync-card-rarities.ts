/**
 * sync-card-rarities.ts
 *
 * Synchronise le champ `rarity` (et `isSpecial`) de toutes les cartes
 * en DB à partir de l'API PokémonTCG.io.
 *
 * Usage:
 *   npx tsx scripts/sync-card-rarities.ts
 *   npx tsx scripts/sync-card-rarities.ts --sets=sv1,sv3pt5   # sets spécifiques
 *   npx tsx scripts/sync-card-rarities.ts --dry-run
 */

import { PrismaClient, CardRarity } from "@prisma/client";
import { TCGDEX_RARITY_MAP } from "../src/lib/pokemon/card-variants";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

// ── Mapping : slug série → PokémonTCG.io set ID (copié depuis seed-card-prices.ts) ──

const SLUG_TO_PTCG: Record<string, string> = {
  "mega-evolution":              "me1",
  "flammes-fantasmagoriques":    "me2",
  "heros-transcendants":         "me2pt5",
  "equilibre-parfait":           "me3",
  "rivalites-destinees":         "sv10",
  "foudre-noire":               "zsv10pt5",
  "flamme-blanche":             "rsv10pt5",
  "ecarlate-et-violet":          "sv1",
  "evolutions-a-paldea":         "sv2",
  "flammes-obsidiennes":         "sv3",
  "pokemon-151":                 "sv3pt5",
  "faille-paradoxe":             "sv4",
  "destinees-de-paldea":         "sv4pt5",
  "forces-temporelles":          "sv5",
  "mascarade-crepusculaire":     "sv6",
  "fable-nebuleuse":             "sv6pt5",
  "couronne-stellaire":          "sv7",
  "etincelles-deferlantes":      "sv8",
  "evolutions-prismatiques":     "sv8pt5",
  "aventures-ensemble":          "sv9",
  "epee-et-bouclier":            "swsh1",
  "clash-des-rebelles":          "swsh2",
  "tenebres-embrasees":          "swsh3",
  "la-voie-du-maitre":           "swsh35",
  "voltage-eclatant":            "swsh4",
  "destinees-radieuses":         "swsh45",
  "styles-de-combat":            "swsh5",
  "regne-de-glace":              "swsh6",
  "evolution-celeste":           "swsh7",
  "celebrations":                "cel25",
  "poing-de-fusion":             "swsh8",
  "stars-etincelantes":          "swsh9",
  "astres-radieux":              "swsh10",
  "pokemon-go":                  "pgo",
  "origine-perdue":              "swsh11",
  "tempete-argentee":            "swsh12",
  "zenith-supreme":              "swsh12pt5",
  "soleil-et-lune":              "sm1",
  "gardiens-ascendants":         "sm2",
  "ombres-ardentes":             "sm3",
  "legendes-brillantes":         "sm35",
  "invasion-carmin":             "sm4",
  "ultra-prisme":                "sm5",
  "lumiere-interdite":           "sm6",
  "tempete-celeste":             "sm7",
  "majeste-des-dragons":         "sm75",
  "tonnerre-perdu":              "sm8",
  "duo-de-choc":                 "sm9",
  "alliance-infaillible":        "sm10",
  "harmonie-des-esprits":        "sm11",
  "destinees-occultes":          "sm115",
  "eclipse-cosmique":            "sm12",
  "xy-base":                     "xy1",
  "etincelles-xy":               "xy2",
  "poings-furieux":              "xy3",
  "vigueur-spectrale":           "xy4",
  "primo-choc":                  "xy5",
  "ciel-rugissant":              "xy6",
  "origines-antiques":           "xy7",
  "impulsion-turbo":             "xy8",
  "rupture-turbo":               "xy9",
  "impact-des-destins":          "xy10",
  "offensive-vapeur":            "xy11",
  "evolutions-xy":               "xy12",
  "noir-et-blanc":               "bw1",
  "pouvoirs-emergents":          "bw2",
  "nobles-victoires":            "bw3",
  "destinees-futures":           "bw4",
  "explorateurs-obscurs":        "bw5",
  "dragons-exaltes":             "bw6",
  "frontieres-franchies":        "bw7",
  "tempete-plasma":              "bw8",
  "glaciation-plasma":           "bw9",
  "explosion-plasma":            "bw10",
  "heartgold-soulsilver-base":   "hgss1",
  "triomphe":                    "hgss2",
  "indomptable":                 "hgss3",
  "dechainement":                "hgss4",
  "platine-base":                "pl1",
  "rivaux-emergeants":           "pl2",
  "vainqueurs-supremes":         "pl3",
  "arceus":                      "pl4",
  "diamant-et-perle":            "dp1",
  "tresors-mysterieux":          "dp2",
  "merveilles-secretes":         "dp3",
  "grands-envols":               "dp4",
  "aube-majestueuse":            "dp5",
  "eveil-des-legendes":          "dp6",
  "tempete-dp":                  "dp7",
  // ── EX era ────────────────────────────────────────────────────────────────
  "rubis-et-saphir":             "ex1",
  "tempete-de-sable":            "ex2",
  "dragon-ex":                   "ex3",
  "groudon-vs-kyogre":           "ex4",
  "legendes-oubliees":           "ex5",
  "fire-red-leaf-green":         "ex6",
  "team-rocket-returns":         "ex7",
  "deoxys":                      "ex8",
  "emeraude":                    "ex9",
  "forces-cachees":              "ex10",
  "especes-delta":               "ex11",
  "createurs-de-legendes":       "ex12",
  "fantomes-holon":              "ex13",
  "gardiens-de-cristal":         "ex14",
  "gardiens-du-pouvoir":         "ex16",
  // ── WOTC era ──────────────────────────────────────────────────────────────
  "set-de-base":                 "base1",
  "jungle":                      "base2",
  "fossile":                     "base3",
  "set-de-base-2":               "base4",
  "team-rocket":                 "base5",
  "gym-heroes":                  "gym1",
  "gym-challenge":               "gym2",
  "expedition":                  "ecard1",
  "aquapolis":                   "ecard2",
  "skyridge":                    "ecard3",
  // ── XY special sets ───────────────────────────────────────────────────────
  "double-danger":               "dc1",
  "generations":                 "g1",
};

// ── Mapping rareté PokémonTCG.io → CardRarity enum ───────────────────────────

const PTCG_RARITY_MAP: Record<string, CardRarity> = {
  "Common":                    CardRarity.COMMON,
  "Uncommon":                  CardRarity.UNCOMMON,
  "Rare":                      CardRarity.RARE,
  "Rare Holo":                 CardRarity.RARE,
  "Rare Holo EX":              CardRarity.DOUBLE_RARE,
  "Rare Holo GX":              CardRarity.DOUBLE_RARE,
  "Rare Holo V":               CardRarity.DOUBLE_RARE,
  "Rare Holo VMAX":            CardRarity.DOUBLE_RARE,
  "Rare Holo VSTAR":           CardRarity.DOUBLE_RARE,
  "Double Rare":               CardRarity.DOUBLE_RARE,
  "Ultra Rare":                CardRarity.DOUBLE_RARE,    // Full-Art EX (SV era)
  "Illustration Rare":         CardRarity.ILLUSTRATION_RARE,
  "Special Illustration Rare": CardRarity.SPECIAL_ILLUSTRATION_RARE,
  "Hyper Rare":                CardRarity.HYPER_RARE,
  "Mega Hyper Rare":           CardRarity.MEGA_HYPER_RARE,
  "MEGA_ATTACK_RARE":          CardRarity.MEGA_ATTAQUE_RARE,
  "ACE SPEC Rare":             CardRarity.ACE_SPEC_RARE,
  "Promo":                     CardRarity.PROMO,
  // Anciens sets
  "Rare Ultra":                CardRarity.ILLUSTRATION_RARE,  // Full Art pré-EV
  "Rare Rainbow":              CardRarity.HYPER_RARE,
  "Rare Secret":               CardRarity.ILLUSTRATION_RARE,
  "Rare Gold":                 CardRarity.HYPER_RARE,
  "Amazing Rare":              CardRarity.RARE,
  "Radiant Rare":              CardRarity.ILLUSTRATION_RARE,
  "LEGEND":                    CardRarity.RARE,
  "Rare Shiny":                CardRarity.ILLUSTRATION_RARE,
  "Shiny Rare":                CardRarity.ILLUSTRATION_RARE,
  "Shiny Ultra Rare":          CardRarity.HYPER_RARE,
  "Rare Shining":              CardRarity.ILLUSTRATION_RARE,
  "Rare Prime":                CardRarity.RARE,
  "Rare BREAK":                CardRarity.DOUBLE_RARE,
  "Rare Prism Star":           CardRarity.DOUBLE_RARE,
};

const SPECIAL_RARITIES = new Set<CardRarity>([
  CardRarity.DOUBLE_RARE,
  CardRarity.ILLUSTRATION_RARE,
  CardRarity.SPECIAL_ILLUSTRATION_RARE,
  CardRarity.HYPER_RARE,
  CardRarity.MEGA_HYPER_RARE,
  CardRarity.MEGA_ATTAQUE_RARE,
  CardRarity.ACE_SPEC_RARE,
  CardRarity.PROMO,
]);

// ── Sets avec un sous-set PTCGIO séparé (ex: Shiny Vault) ────────────────────

const SLUG_TO_PTCG_SECONDARY: Record<string, string> = {
  "destinees-radieuses": "swsh45sv", // Shining Fates Shiny Vault
};

// ── Mapping : slug série → TCGdex set ID (fallback pour sets absents de PTCGIO) ──

const SLUG_TO_TCGDEX: Record<string, string> = {
  "foudre-noire":             "sv10.5b",
  "flamme-blanche":           "sv10.5w",
  "mega-evolution":           "me01",
  "flammes-fantasmagoriques": "me02",
  "heros-transcendants":      "me02.5",
  "equilibre-parfait":        "me03",
};

function normalizeNumber(n: string): string {
  return n.replace(/^([A-Z]*)0+(\d+)$/, "$1$2");
}

// ── Fetch cards with rarity from TCGdex (FR) ─────────────────────────────────

interface TCGdexCardMin { localId: string }
interface TCGdexSetMin  { cards: TCGdexCardMin[] }
interface TCGdexCardFull { localId: string; rarity?: string | null }

async function fetchTCGdexRarities(setId: string): Promise<Map<string, CardRarity>> {
  const map = new Map<string, CardRarity>();

  // 1. Get card list
  const setRes = await fetch(`https://api.tcgdex.net/v2/fr/sets/${setId}`);
  if (!setRes.ok) { console.warn(`  ⚠ TCGdex set ${setId} → ${setRes.status}`); return map; }
  const setData = (await setRes.json()) as TCGdexSetMin;
  const cards = setData.cards ?? [];

  // 2. Fetch each card individually (rarity only available at card level)
  const BATCH = 8;
  for (let i = 0; i < cards.length; i += BATCH) {
    const batch = cards.slice(i, i + BATCH);
    await Promise.all(batch.map(async (c) => {
      try {
        const r = await fetch(`https://api.tcgdex.net/v2/fr/cards/${setId}-${c.localId}`);
        if (!r.ok) return;
        const d = (await r.json()) as TCGdexCardFull;
        if (!d.rarity) return;
        const mapped = TCGDEX_RARITY_MAP[d.rarity];
        if (!mapped) return;
        const norm = normalizeNumber(c.localId);
        map.set(c.localId, mapped);
        map.set(norm, mapped);
      } catch { /* skip */ }
    }));
    await new Promise((r) => setTimeout(r, 120));
  }

  return map;
}

// ── Fetch cards with rarity from pokemontcg.io ────────────────────────────────

interface PTCGCard { number: string; rarity?: string }
interface PTCGResponse { data: PTCGCard[]; totalCount: number; count: number }

async function fetchPTCGRarities(setId: string): Promise<Map<string, CardRarity>> {
  const map = new Map<string, CardRarity>();
  let page = 1;

  while (true) {
    const url = `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=250&page=${page}&select=number,rarity`;
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
    if (!res.ok) {
      console.warn(`  ⚠ PTCG set ${setId} → HTTP ${res.status}`);
      break;
    }
    const json = (await res.json()) as PTCGResponse;
    for (const card of json.data) {
      if (!card.rarity) continue;
      const mapped = PTCG_RARITY_MAP[card.rarity];
      if (!mapped) continue;
      const norm = normalizeNumber(card.number);
      map.set(norm, mapped);
      map.set(card.number, mapped); // also keep raw key
    }
    if (map.size >= json.totalCount || json.count < 250) break;
    page++;
    await new Promise((r) => setTimeout(r, 200));
  }

  return map;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function applyRarityMap(
  rarityMap: Map<string, CardRarity>,
  dbCards: { id: string; number: string }[],
  dryRun: boolean,
): Promise<number> {
  const toUpdate = dbCards
    .map((c) => {
      const rarity = rarityMap.get(c.number) ?? rarityMap.get(normalizeNumber(c.number));
      if (!rarity) return null;
      return { id: c.id, rarity, isSpecial: SPECIAL_RARITIES.has(rarity) };
    })
    .filter(Boolean) as { id: string; rarity: CardRarity; isSpecial: boolean }[];

  if (!dryRun) {
    const CHUNK = 50;
    for (let i = 0; i < toUpdate.length; i += CHUNK) {
      await Promise.all(
        toUpdate.slice(i, i + CHUNK).map((u) =>
          prisma.card.update({ where: { id: u.id }, data: { rarity: u.rarity, isSpecial: u.isSpecial } })
        )
      );
    }
  }
  return toUpdate.length;
}

async function main(opts: { sets?: string[]; dryRun: boolean }) {
  const { dryRun } = opts;
  if (dryRun) console.log("🔍 Mode dry-run\n");

  const seriesInDb = await prisma.serie.findMany({ select: { id: true, slug: true } });
  const serieBySlug = new Map(seriesInDb.map((s) => [s.slug, s.id]));

  // All known slugs (union of PTCGIO + TCGdex)
  const allSlugs = new Set([...Object.keys(SLUG_TO_PTCG), ...Object.keys(SLUG_TO_PTCG_SECONDARY), ...Object.keys(SLUG_TO_TCGDEX)]);

  let slugs: string[];
  if (opts.sets) {
    slugs = [...allSlugs].filter((s) =>
      opts.sets!.includes(s) ||
      opts.sets!.includes(SLUG_TO_PTCG[s] ?? "") ||
      opts.sets!.includes(SLUG_TO_TCGDEX[s] ?? "")
    );
  } else {
    slugs = [...allSlugs];
  }

  let totalUpdated = 0;
  let totalSets = 0;

  for (const slug of slugs) {
    const ptcgId   = SLUG_TO_PTCG[slug];
    const tcgdexId = SLUG_TO_TCGDEX[slug];
    const serieId  = serieBySlug.get(slug);
    if (!serieId) { console.warn(`⚠ Série "${slug}" absente de la DB`); continue; }

    const label = ptcgId ?? `tcgdex:${tcgdexId}`;
    process.stdout.write(`📦 ${label.padEnd(14)} → ${slug.padEnd(42)}`);

    let rarityMap = new Map<string, CardRarity>();

    // Try PTCGIO first
    if (ptcgId) {
      rarityMap = await fetchPTCGRarities(ptcgId);
    }

    // Merge secondary PTCGIO set (e.g. Shiny Vault) into rarityMap
    const ptcgSecondaryId = SLUG_TO_PTCG_SECONDARY[slug];
    if (ptcgSecondaryId) {
      const secondary = await fetchPTCGRarities(ptcgSecondaryId);
      for (const [k, v] of secondary) rarityMap.set(k, v);
    }

    // Fallback to TCGdex if PTCGIO returned nothing
    if (rarityMap.size === 0 && tcgdexId) {
      if (ptcgId) process.stdout.write(`(PTCGIO vide → TCGdex) `);
      rarityMap = await fetchTCGdexRarities(tcgdexId);
    }

    if (rarityMap.size === 0) { console.log(`aucune rareté`); continue; }

    const dbCards = await prisma.card.findMany({ where: { serieId }, select: { id: true, number: true } });
    const updated = await applyRarityMap(rarityMap, dbCards, dryRun);

    console.log(`${updated}/${dbCards.length} cartes`);
    totalUpdated += updated;
    totalSets++;
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n✅ ${totalSets} sets traités — ${totalUpdated} cartes mises à jour`);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const setsArg = args.find((a) => a.startsWith("--sets="));
const sets = setsArg ? setsArg.replace("--sets=", "").split(",") : undefined;

main({ sets, dryRun })
  .catch(console.error)
  .finally(() => prisma.$disconnect());
