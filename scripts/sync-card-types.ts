/**
 * sync-card-types.ts
 *
 * Synchronise les champs types, category, trainerType, energyType
 * pour toutes les séries depuis PokémonTCG.io.
 *
 * Usage:
 *   npx tsx scripts/sync-card-types.ts
 *   npx tsx scripts/sync-card-types.ts --sets=sv1,sv3pt5
 *   npx tsx scripts/sync-card-types.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

// ── Mapping slug → PTCGIO set ID (même que sync-card-rarities) ──────────────

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
  "double-danger":               "dc1",
  "generations":                 "g1",
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

// Shiny Vault / sous-sets avec des cartes supplémentaires
const SLUG_TO_PTCG_SECONDARY: Record<string, string> = {
  "destinees-radieuses": "swsh45sv",
};

// ── Mappings EN → FR ─────────────────────────────────────────────────────────

const TYPE_EN_TO_FR: Record<string, string> = {
  "Grass":     "Plante",
  "Fire":      "Feu",
  "Water":     "Eau",
  "Lightning": "Électrique",
  "Psychic":   "Psy",
  "Fighting":  "Combat",
  "Colorless": "Incolore",
  "Darkness":  "Obscurité",
  "Metal":     "Métal",
  "Dragon":    "Dragon",
  "Fairy":     "Fée",
};

const SUBTYPE_EN_TO_FR: Record<string, string> = {
  "Supporter":    "Supporter",
  "Item":         "Objet",
  "Stadium":      "Stade",
  "Pokémon Tool": "Outil",
  "Tool":         "Outil",
};

const SUPERTYPE_TO_CATEGORY: Record<string, string> = {
  "Pokémon": "Pokémon",
  "Trainer": "Dresseur",
  "Energy":  "Énergie",
};

// ── PTCGIO fetch ─────────────────────────────────────────────────────────────

interface PTCGCard {
  number: string;
  supertype?: string;
  subtypes?: string[];
  types?: string[];
}
interface PTCGResponse { data: PTCGCard[]; totalCount: number; count: number }

function normalizeNumber(n: string): string {
  return n.replace(/^([A-Z]*)0+(\d+)$/, "$1$2");
}

async function fetchPTCGCards(setId: string): Promise<PTCGCard[]> {
  const all: PTCGCard[] = [];
  let page = 1;
  while (true) {
    const url = `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=250&page=${page}&select=number,supertype,subtypes,types`;
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
    if (!res.ok) { console.warn(`  ⚠ PTCG ${setId} → HTTP ${res.status}`); break; }
    const json = (await res.json()) as PTCGResponse;
    all.push(...json.data);
    if (all.length >= json.totalCount || json.count < 250) break;
    page++;
    await new Promise((r) => setTimeout(r, 200));
  }
  return all;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(opts: { sets?: string[]; dryRun: boolean }) {
  const { dryRun } = opts;
  if (dryRun) console.log("🔍 Mode dry-run — aucune écriture en DB\n");

  const seriesInDb = await prisma.serie.findMany({ select: { id: true, slug: true } });
  const serieBySlug = new Map(seriesInDb.map((s) => [s.slug, s.id]));

  const allSlugs = new Set([...Object.keys(SLUG_TO_PTCG), ...Object.keys(SLUG_TO_PTCG_SECONDARY)]);

  let slugs: string[];
  if (opts.sets) {
    slugs = [...allSlugs].filter((s) =>
      opts.sets!.includes(s) || opts.sets!.includes(SLUG_TO_PTCG[s] ?? "")
    );
  } else {
    slugs = [...allSlugs];
  }

  let totalUpdated = 0;

  for (const slug of slugs) {
    const ptcgId = SLUG_TO_PTCG[slug];
    const ptcgSecondaryId = SLUG_TO_PTCG_SECONDARY[slug];
    const serieId = serieBySlug.get(slug);
    if (!serieId) { console.warn(`⚠ Série "${slug}" absente`); continue; }

    const label = ptcgId ?? `secondary:${ptcgSecondaryId}`;
    process.stdout.write(`📦 ${label.padEnd(14)} → ${slug.padEnd(42)}`);

    // Fetch cards from primary + optional secondary set
    let ptcgCards = ptcgId ? await fetchPTCGCards(ptcgId) : [];
    if (ptcgSecondaryId) {
      const secondary = await fetchPTCGCards(ptcgSecondaryId);
      ptcgCards = [...ptcgCards, ...secondary];
    }

    if (!ptcgCards.length) { console.log("aucune carte"); continue; }

    const dbCards = await prisma.card.findMany({
      where: { serieId },
      select: { id: true, number: true },
    });

    const dbByNumber = new Map<string, string>();
    for (const c of dbCards) {
      dbByNumber.set(c.number, c.id);
      dbByNumber.set(normalizeNumber(c.number), c.id);
    }

    let updated = 0;
    for (const card of ptcgCards) {
      const cardId = dbByNumber.get(card.number) ?? dbByNumber.get(normalizeNumber(card.number));
      if (!cardId) continue;

      const category = card.supertype ? (SUPERTYPE_TO_CATEGORY[card.supertype] ?? null) : null;
      const types = (card.types ?? []).map((t) => TYPE_EN_TO_FR[t]).filter(Boolean) as string[];
      const trainerSubtype = (card.subtypes ?? []).find((s) => SUBTYPE_EN_TO_FR[s]);
      const trainerType = trainerSubtype ? SUBTYPE_EN_TO_FR[trainerSubtype] : null;
      const energyType =
        card.supertype === "Energy" && card.subtypes?.includes("Special") ? "Spécial" : null;

      if (!dryRun) {
        await prisma.card.update({
          where: { id: cardId },
          data: {
            ...(category ? { category } : {}),
            ...(types.length > 0 ? { types } : {}),
            ...(trainerType ? { trainerType } : {}),
            ...(energyType ? { energyType } : {}),
          },
        });
      }
      updated++;
    }

    console.log(`${updated}/${dbCards.length} cartes`);
    totalUpdated += updated;
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n✅ Terminé — ${totalUpdated} cartes mises à jour`);
  if (dryRun) console.log("(dry-run : rien n'a été écrit en DB)");
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const setsArg = args.find((a) => a.startsWith("--sets="));
const sets = setsArg ? setsArg.replace("--sets=", "").split(",") : undefined;

main({ sets, dryRun })
  .catch(console.error)
  .finally(() => prisma.$disconnect());
