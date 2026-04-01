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
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

// ── Mapping : slug série → PokémonTCG.io set ID (copié depuis seed-card-prices.ts) ──

const SLUG_TO_PTCG: Record<string, string> = {
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
  "tempete":                     "pl3",
  "platine-base":                "pl1",
  "rivaux-emergeants":           "pl2",
  "arceus":                      "pl4",
  "diamant-et-perle":            "dp1",
  "mysteres-de-la-jungle":       "dp2",
  "merveilles-secretes":         "dp3",
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
  "Illustration Rare":         CardRarity.ILLUSTRATION_RARE,
  "Special Illustration Rare": CardRarity.SPECIAL_ILLUSTRATION_RARE,
  "Hyper Rare":                CardRarity.HYPER_RARE,
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
  CardRarity.ACE_SPEC_RARE,
  CardRarity.PROMO,
]);

function normalizeNumber(n: string): string {
  return n.replace(/^([A-Z]*)0+(\d+)$/, "$1$2");
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

async function main(opts: { sets?: string[]; dryRun: boolean }) {
  const { dryRun } = opts;
  if (dryRun) console.log("🔍 Mode dry-run\n");

  const seriesInDb = await prisma.serie.findMany({ select: { id: true, slug: true } });
  const serieBySlug = new Map(seriesInDb.map((s) => [s.slug, s.id]));

  const slugs = opts.sets
    ? Object.keys(SLUG_TO_PTCG).filter((s) => opts.sets!.includes(SLUG_TO_PTCG[s]))
    : Object.keys(SLUG_TO_PTCG);

  let totalUpdated = 0;
  let totalSets = 0;

  for (const slug of slugs) {
    const ptcgId = SLUG_TO_PTCG[slug];
    const serieId = serieBySlug.get(slug);
    if (!serieId) { console.warn(`⚠ Série "${slug}" absente de la DB`); continue; }

    process.stdout.write(`📦 ${ptcgId.padEnd(12)} → ${slug.padEnd(42)}`);
    const rarityMap = await fetchPTCGRarities(ptcgId);
    if (rarityMap.size === 0) { console.log(`aucune rareté`); continue; }

    const dbCards = await prisma.card.findMany({ where: { serieId }, select: { id: true, number: true } });

    let updated = 0;
    if (!dryRun) {
      const CHUNK = 50;
      const toUpdate = dbCards
        .map((c) => {
          const rarity = rarityMap.get(c.number) ?? rarityMap.get(normalizeNumber(c.number));
          if (!rarity) return null;
          return { id: c.id, rarity, isSpecial: SPECIAL_RARITIES.has(rarity) };
        })
        .filter(Boolean) as { id: string; rarity: CardRarity; isSpecial: boolean }[];

      for (let i = 0; i < toUpdate.length; i += CHUNK) {
        await Promise.all(
          toUpdate.slice(i, i + CHUNK).map((u) =>
            prisma.card.update({ where: { id: u.id }, data: { rarity: u.rarity, isSpecial: u.isSpecial } })
          )
        );
      }
      updated = toUpdate.length;
    } else {
      updated = dbCards.filter((c) => rarityMap.has(c.number) || rarityMap.has(normalizeNumber(c.number))).length;
    }

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
