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
  "rivaux-emergeants":           "hgss2",
  "vainqueurs-supremes":         "hgss3",
  "triomphe":                    "hgss4",
  "arceus":                      "pl4",
  // ── Platine ────────────────────────────────────────────────────────────
  "platine-base":                "pl1",
  "eveil-des-legendes":          "pl2",
  // ── Diamant & Perle ────────────────────────────────────────────────────
  "diamant-et-perle":            "dp1",
  "tresors-mysterieux":          "dp2",
  "grands-envols":               "dp3",
  "tempete-dp":                  "dp4",
  "merveilles-secretes":         "dp5",
  "aube-majestueuse":            "dp6",
};

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
  // opts.sets contains PTCG set IDs (e.g. "sv1,sv2") when --sets= is used
  let slugsToProcess: string[];
  if (opts.sets) {
    // Filter slugs whose PTCG ID is in the provided list
    slugsToProcess = Object.entries(SLUG_TO_PTCG)
      .filter(([, ptcgId]) => opts.sets!.includes(ptcgId))
      .map(([slug]) => slug);
  } else {
    slugsToProcess = Object.keys(SLUG_TO_PTCG);
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
    const ptcgId = SLUG_TO_PTCG[slug];
    if (!ptcgId) {
      console.warn(`Pas de mapping PTCG pour le slug "${slug}" — ignoré`);
      totalSetsSkipped++;
      continue;
    }

    const serieId = serieBySlug.get(slug);
    if (!serieId) {
      console.warn(`Série "${slug}" absente de la DB — ignoré`);
      totalSetsSkipped++;
      continue;
    }

    process.stdout.write(`${ptcgId.padEnd(12)} → ${slug.padEnd(40)}`);

    // Fetch all cards from PTCGIO
    const ptcgCards = await fetchPTCGCards(ptcgId);

    if (ptcgCards.length === 0) {
      console.log(`aucune carte PTCGIO`);
      totalSetsSkipped++;
      // Rate limit between sets
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }

    // Build map: normalized number → price data
    const priceMap = new Map<string, { trendPrice: number | null; averageSellPrice: number | null }>();
    for (const card of ptcgCards) {
      const normalized = normalizeNumber(card.number);
      const prices = card.cardmarket?.prices ?? null;
      priceMap.set(normalized, {
        trendPrice: prices?.trendPrice ?? null,
        averageSellPrice: prices?.averageSellPrice ?? null,
      });
    }

    // Fetch all DB cards for this serie
    const dbCards = await prisma.card.findMany({
      where: { serieId },
      select: { id: true, number: true },
    });

    console.log(`${ptcgCards.length} cartes PTCGIO, ${dbCards.length} cartes DB`);

    if (!dryRun && dbCards.length > 0) {
      const now = new Date();
      const updates: Array<{ id: string; price: number }> = [];

      for (const dbCard of dbCards) {
        const normalized = normalizeNumber(dbCard.number);
        const priceData = priceMap.get(normalized);

        if (!priceData) continue;

        // Use trendPrice with fallback to averageSellPrice
        const price = priceData.trendPrice ?? priceData.averageSellPrice;
        if (price === null || price === undefined) continue;

        updates.push({ id: dbCard.id, price });
        totalCardsWithPrice++;
      }

      // Batched updates in chunks of 50
      const BATCH = 50;
      for (let i = 0; i < updates.length; i += BATCH) {
        const batch = updates.slice(i, i + BATCH);
        await Promise.all(
          batch.map((u) =>
            prisma.card.update({
              where: { id: u.id },
              data: {
                price: u.price,
                priceUpdatedAt: now,
              },
            })
          )
        );
      }

      totalCardsUpdated += updates.length;
    } else if (dryRun) {
      // Count what would be updated in dry-run mode
      for (const dbCard of dbCards) {
        const normalized = normalizeNumber(dbCard.number);
        const priceData = priceMap.get(normalized);
        if (!priceData) continue;
        const price = priceData.trendPrice ?? priceData.averageSellPrice;
        if (price === null || price === undefined) continue;
        totalCardsWithPrice++;
        totalCardsUpdated++;
      }
    }

    totalSetsProcessed++;

    // Rate limit between sets
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
