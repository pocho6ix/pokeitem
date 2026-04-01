/**
 * seed-card-prices.ts
 *
 * Récupère les prix des cartes depuis l'API PokémonTCG.io et met à jour la DB.
 *
 * Usage :
 *   npx tsx scripts/seed-card-prices.ts
 *   npx tsx scripts/seed-card-prices.ts --sets=sv1,sv2   # sets spécifiques
 *   npx tsx scripts/seed-card-prices.ts --dry-run        # sans écriture en DB
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Mapping : slug série → PokémonTCG.io set ID
// ---------------------------------------------------------------------------
const SLUG_TO_PTCG: Record<string, string> = {
  // ── Écarlate & Violet ──────────────────────────────────────────────────
  "rivalites-destinees":         "sv10",
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
  // ── Épée & Bouclier ────────────────────────────────────────────────────
  "epee-et-bouclier":            "swsh1",
  "clash-des-rebelles":          "swsh2",
  "tenebres-embrasees":          "swsh3",
  "la-voie-du-maitre":           "swsh3pt5",
  "voltage-eclatant":            "swsh4",
  "destinees-radieuses":         "swsh4pt5",
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
  // ── Soleil & Lune ──────────────────────────────────────────────────────
  "soleil-et-lune":              "sm1",
  "gardiens-ascendants":         "sm2",
  "ombres-ardentes":             "sm3",
  "legendes-brillantes":         "sm3pt5",
  "invasion-carmin":             "sm4",
  "ultra-prisme":                "sm5",
  "lumiere-interdite":           "sm6",
  "tempete-celeste":             "sm7",
  "majeste-des-dragons":         "sm7pt5",
  "tonnerre-perdu":              "sm8",
  "duo-de-choc":                 "sm9",
  "alliance-infaillible":        "sm10",
  "harmonie-des-esprits":        "sm11",
  "destinees-occultes":          "sm115",
  "eclipse-cosmique":            "sm12",
  // ── XY ─────────────────────────────────────────────────────────────────
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
  "generations":                 "g1",
  "double-danger":               "dc1",
  // ── Noir & Blanc ───────────────────────────────────────────────────────
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
  "legendary-treasures":         "bw11",
  // ── HGSS ───────────────────────────────────────────────────────────────
  "heartgold-soulsilver-base":   "hgss1",
  "dechainement":                "hgss2",
  "indomptable":                 "hgss3",
  "triomphe":                    "hgss4",
  // ── Platine ────────────────────────────────────────────────────────────
  "platine-base":                "pl1",
  "rivaux-emergeants":           "pl2",
  "vainqueurs-supremes":         "pl3",
  "arceus":                      "pl4",
  // ── Diamant & Perle ────────────────────────────────────────────────────
  "diamant-et-perle":            "dp1",
  "tresors-mysterieux":          "dp2",
  "merveilles-secretes":         "dp3",
  "grands-envols":               "dp4",
  "aube-majestueuse":            "dp5",
  "eveil-des-legendes":          "dp6",
  "tempete-dp":                  "dp7",
  // ── EX ─────────────────────────────────────────────────────────────────
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
  // ── Wizards of the Coast ───────────────────────────────────────────────
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
};

// ---------------------------------------------------------------------------
// Mapping : slug série → TCGdex set ID  (FR-exclusive + fallback)
// ---------------------------------------------------------------------------
const SLUG_TO_TCGDEX: Record<string, string> = {
  "mega-evolution":             "me01",
  "flammes-fantasmagoriques":   "me02",
  "heros-transcendants":        "me02.5",
  // EV — present on PTCGIO too, but TCGdex has FR pricing
  "ecarlate-et-violet":         "sv01",
  "evolutions-a-paldea":        "sv02",
  "flammes-obsidiennes":        "sv03",
  "pokemon-151":                "sv03.5",
  "faille-paradoxe":            "sv04",
  "destinees-de-paldea":        "sv04.5",
  "forces-temporelles":         "sv05",
  "mascarade-crepusculaire":    "sv06",
  "fable-nebuleuse":            "sv06.5",
  "couronne-stellaire":         "sv07",
  "etincelles-deferlantes":     "sv08",
  "evolutions-prismatiques":    "sv08.5",
  "aventures-ensemble":         "sv09",
  "rivalites-destinees":        "sv10",
  "foudre-noire-flamme-blanche":"sv10.5b",
};

// Sets qui combinent deux IDs TCGdex (fetchés séparément puis fusionnés)
const DUAL_TCGDEX_SETS: Record<string, string> = {
  "foudre-noire-flamme-blanche": "sv10.5w",  // sv10.5b est déjà dans SLUG_TO_TCGDEX
}

// ---------------------------------------------------------------------------
// Types PokémonTCG.io
// ---------------------------------------------------------------------------
interface PTCGCardmarketPrices {
  averageSellPrice: number | null;
  trendPrice: number | null;
}

interface PTCGCardmarket {
  prices: PTCGCardmarketPrices | null;
}

interface PTCGCard {
  number: string;
  name: string;
  cardmarket: PTCGCardmarket | null;
}

interface PTCGResponse {
  data: PTCGCard[];
  totalCount: number;
  pageSize: number;
  page: number;
  count: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function normalizeNumber(n: string): string {
  // "001" → "1", "TG01" → "TG1", "GG01" → "GG1"
  return n.replace(/^([A-Z]*)0+(\d+)$/, "$1$2");
}

// ---------------------------------------------------------------------------
// TCGdex fetcher — returns localId → {normal price, holo price}
// ---------------------------------------------------------------------------
interface TCGdexCardMin { localId: string; }
interface TCGdexSetMin  { cards: TCGdexCardMin[]; }
interface TCGdexCardPricing {
  pricing?: {
    cardmarket?: {
      trend?: number | null;
      "trend-holo"?: number | null;
    } | null;
  } | null;
}

async function fetchTCGdexPrices(setId: string): Promise<Map<string, { normal: number | null; holo: number | null }>> {
  const map = new Map<string, { normal: number | null; holo: number | null }>();

  // 1. Get card list for the set
  const setRes = await fetch(`https://api.tcgdex.net/v2/fr/sets/${setId}`);
  if (!setRes.ok) { console.warn(`  ⚠ TCGdex set ${setId} → ${setRes.status}`); return map; }
  const setData = (await setRes.json()) as TCGdexSetMin;
  const cards = setData.cards ?? [];

  // 2. Fetch each card's pricing (batched, 5 at a time to avoid rate limits)
  const BATCH = 5;
  for (let i = 0; i < cards.length; i += BATCH) {
    const batch = cards.slice(i, i + BATCH);
    await Promise.all(batch.map(async (c) => {
      try {
        const r = await fetch(`https://api.tcgdex.net/v2/fr/cards/${setId}-${c.localId}`);
        if (!r.ok) return;
        const d = (await r.json()) as TCGdexCardPricing;
        const cm = d?.pricing?.cardmarket;  // pricing.cardmarket, not cardmarket directly
        map.set(c.localId, {
          normal: cm?.trend ?? null,
          holo:   cm?.["trend-holo"] || null,
        });
      } catch { /* skip */ }
    }));
    await new Promise((r) => setTimeout(r, 150));
  }

  return map;
}

async function fetchPTCGCards(setId: string): Promise<PTCGCard[]> {
  const allCards: PTCGCard[] = [];
  let page = 1;
  const pageSize = 250;

  while (true) {
    const url = `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=${pageSize}&page=${page}&select=number,cardmarket,name`;

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.warn(`  ⚠ Erreur réseau pour le set ${setId} (page ${page}):`, err);
      break;
    }

    if (res.status === 404) {
      console.warn(`  ⚠ Set ${setId} introuvable sur PTCGIO (404)`);
      return [];
    }

    if (!res.ok) {
      console.warn(`  ⚠ Set ${setId} — HTTP ${res.status}`);
      return [];
    }

    const json = (await res.json()) as PTCGResponse;
    const cards = json.data ?? [];
    allCards.push(...cards);

    // Stop if we've collected everything
    if (allCards.length >= json.totalCount || cards.length < pageSize) break;

    page++;
    // Rate limit between pages
    await new Promise((r) => setTimeout(r, 200));
  }

  return allCards;
}

// ---------------------------------------------------------------------------
// Seed principal
// ---------------------------------------------------------------------------
async function seed(opts: { sets?: string[]; dryRun: boolean }) {
  const { dryRun } = opts;
  if (dryRun) console.log("Mode dry-run — aucune écriture en DB\n");

  // Build the list of slugs to process
  // All known slugs = union of PTCGIO + TCGdex mappings
  const allSlugs = new Set([...Object.keys(SLUG_TO_PTCG), ...Object.keys(SLUG_TO_TCGDEX)]);

  let slugsToProcess: string[];
  if (opts.sets) {
    // opts.sets can be PTCG IDs (e.g. "sv1") or TCGdex IDs (e.g. "me01") or serie slugs
    slugsToProcess = [...allSlugs].filter((slug) => {
      const ptcg   = SLUG_TO_PTCG[slug];
      const tcgdex = SLUG_TO_TCGDEX[slug];
      return opts.sets!.includes(ptcg ?? "") || opts.sets!.includes(tcgdex ?? "") || opts.sets!.includes(slug);
    });
  } else {
    slugsToProcess = [...allSlugs];
  }

  // Charger une fois tous les slugs de séries depuis la DB
  const seriesInDb = await prisma.serie.findMany({ select: { id: true, slug: true } });
  const serieBySlug = new Map(seriesInDb.map((s) => [s.slug, s.id]));

  console.log(`${seriesInDb.length} séries en DB, ${slugsToProcess.length} sets à traiter\n`);

  let totalSetsProcessed = 0;
  let totalSetsSkipped = 0;
  let totalCardsUpdated = 0;
  let totalCardsWithPrice = 0;

  for (const slug of slugsToProcess) {
    const serieId = serieBySlug.get(slug);
    if (!serieId) {
      console.warn(`Série "${slug}" absente de la DB — ignoré`);
      totalSetsSkipped++;
      continue;
    }

    const ptcgId   = SLUG_TO_PTCG[slug];
    const tcgdexId = SLUG_TO_TCGDEX[slug];

    // Build a unified price map: localId/normalizedNumber → price
    const priceMap = new Map<string, number>();

    if (ptcgId) {
      process.stdout.write(`${ptcgId.padEnd(12)} → ${slug.padEnd(40)}`);
      const ptcgCards = await fetchPTCGCards(ptcgId);

      if (ptcgCards.length === 0) {
        // PTCGIO failed — fall through to TCGdex if available
        if (!tcgdexId) {
          console.log(`aucune carte PTCGIO`);
          totalSetsSkipped++;
          await new Promise((r) => setTimeout(r, 200));
          continue;
        }
        console.log(`aucune carte PTCGIO → fallback TCGdex`);
      } else {
        for (const card of ptcgCards) {
          const normalized = normalizeNumber(card.number);
          const prices = card.cardmarket?.prices ?? null;
          const price = prices?.trendPrice ?? prices?.averageSellPrice ?? null;
          if (price !== null) priceMap.set(normalized, price);
        }
        console.log(`${ptcgCards.length} cartes PTCGIO`);
      }
    }

    // Use TCGdex as primary source (for FR-exclusive sets) or fallback
    if (tcgdexId && priceMap.size === 0) {
      if (!ptcgId) process.stdout.write(`${"tcgdex:"+tcgdexId.padEnd(10)} → ${slug.padEnd(40)}`);
      const tcgdexPrices = await fetchTCGdexPrices(tcgdexId);
      for (const [localId, prices] of tcgdexPrices) {
        // localId from TCGdex is zero-padded (e.g. "001"), normalize it
        const normalized = normalizeNumber(localId);
        const price = prices.normal ?? prices.holo ?? null;
        if (price !== null) priceMap.set(normalized, price);
        // also keep zero-padded key for direct DB match
        if (price !== null) priceMap.set(localId, price);
      }
      if (!ptcgId) console.log(`${tcgdexPrices.size} cartes TCGdex`);
    }

    // Si ce slug a un second ID TCGdex (set combiné), fetch et merge
    const extraTcgdexId = DUAL_TCGDEX_SETS[slug]
    if (extraTcgdexId) {
      const extraPrices = await fetchTCGdexPrices(extraTcgdexId)
      for (const [localId, prices] of extraPrices) {
        const normalized = normalizeNumber(localId)
        const price = prices.normal ?? prices.holo ?? null
        if (price !== null && !priceMap.has(normalized)) priceMap.set(normalized, price)
        if (price !== null && !priceMap.has(localId)) priceMap.set(localId, price)
      }
    }

    if (priceMap.size === 0) {
      console.log(`  → aucun prix disponible, ignoré`);
      totalSetsSkipped++;
      continue;
    }

    // Fetch all DB cards for this serie
    const dbCards = await prisma.card.findMany({
      where: { serieId },
      select: { id: true, number: true },
    });

    if (!dryRun && dbCards.length > 0) {
      const now = new Date();
      const updates: Array<{ id: string; price: number }> = [];

      for (const dbCard of dbCards) {
        // Try exact number first (e.g. "001"), then normalized (e.g. "1")
        const price = priceMap.get(dbCard.number) ?? priceMap.get(normalizeNumber(dbCard.number)) ?? null;
        if (price === null) continue;
        updates.push({ id: dbCard.id, price });
        totalCardsWithPrice++;
      }

      // Batched updates in chunks of 50
      const CHUNK = 50;
      for (let i = 0; i < updates.length; i += CHUNK) {
        const chunk = updates.slice(i, i + CHUNK);
        await Promise.all(
          chunk.map((u) =>
            prisma.card.update({
              where: { id: u.id },
              data: { price: u.price, priceUpdatedAt: now },
            })
          )
        );
      }

      console.log(`  → ${updates.length}/${dbCards.length} cartes mises à jour`);
      totalCardsUpdated += updates.length;
    } else if (dryRun) {
      for (const dbCard of dbCards) {
        const price = priceMap.get(dbCard.number) ?? priceMap.get(normalizeNumber(dbCard.number)) ?? null;
        if (price === null) continue;
        totalCardsWithPrice++;
        totalCardsUpdated++;
      }
    }

    totalSetsProcessed++;
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(
    `\nTerminé — ${totalSetsProcessed} sets traités, ${totalSetsSkipped} ignorés, ` +
    `${totalCardsUpdated} cartes mises à jour, ${totalCardsWithPrice} cartes avec prix`
  );
  if (dryRun) console.log("(dry-run : rien n'a été écrit en DB)");
}

// ---------------------------------------------------------------------------
// Entrée
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const setsArg = args.find((a) => a.startsWith("--sets="));
const sets = setsArg ? setsArg.replace("--sets=", "").split(",") : undefined;

seed({ sets, dryRun })
  .catch(console.error)
  .finally(() => prisma.$disconnect());
