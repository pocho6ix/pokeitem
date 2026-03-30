/**
 * seed-cards.ts
 *
 * Importe les cartes depuis l'API TCGdex (https://api.tcgdex.net/v2/fr)
 * et les insère dans la base de données via Prisma.
 *
 * Usage :
 *   npx tsx scripts/seed-cards.ts
 *   npx tsx scripts/seed-cards.ts --sets sv01,sv02   # sets spécifiques
 *   npx tsx scripts/seed-cards.ts --dry-run          # sans écriture en DB
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Mapping : ID TCGdex → slug série dans notre DB
// ---------------------------------------------------------------------------
const TCGDEX_MAPPING: Record<string, string> = {
  // ── Méga-Évolution ────────────────────────────────────────────────────────
  me01: "mega-evolution",
  me02: "flammes-fantasmagoriques",
  "me02.5": "heros-transcendants",
  // me03 = Équilibre Parfait (pas encore sur TCGdex au 2026-03-30)

  // ── Écarlate & Violet ─────────────────────────────────────────────────────
  sv01: "ecarlate-et-violet",
  sv02: "evolutions-a-paldea",
  sv03: "flammes-obsidiennes",
  "sv03.5": "pokemon-151",
  sv04: "faille-paradoxe",
  "sv04.5": "destinees-de-paldea",
  sv05: "forces-temporelles",
  sv06: "mascarade-crepusculaire",
  "sv06.5": "fable-nebuleuse",
  sv07: "couronne-stellaire",
  sv08: "etincelles-deferlantes",
  "sv08.5": "evolutions-prismatiques",
  sv09: "aventures-ensemble",
  sv10: "rivalites-destinees",
  "sv10.5b": "foudre-noire-flamme-blanche",
  "sv10.5w": "foudre-noire-flamme-blanche", // même slug (double set)

  // ── Épée & Bouclier ───────────────────────────────────────────────────────
  swsh1: "epee-et-bouclier",
  swsh2: "clash-des-rebelles",
  swsh3: "tenebres-embrasees",
  "swsh3.5": "la-voie-du-maitre",
  swsh4: "voltage-eclatant",
  "swsh4.5": "destinees-radieuses",
  swsh5: "styles-de-combat",
  swsh6: "regne-de-glace",
  swsh7: "evolution-celeste",
  cel25: "celebrations",
  swsh8: "poing-de-fusion",
  swsh9: "stars-etincelantes",
  swsh10: "astres-radieux",
  "swsh10.5": "pokemon-go",
  swsh11: "origine-perdue",
  swsh12: "tempete-argentee",
  "swsh12.5": "zenith-supreme",

  // ── Soleil & Lune ─────────────────────────────────────────────────────────
  sm1: "soleil-et-lune",
  sm2: "gardiens-ascendants",
  sm3: "ombres-ardentes",
  "sm3.5": "legendes-brillantes",
  sm4: "invasion-carmin",
  sm5: "ultra-prisme",
  sm6: "lumiere-interdite",
  sm7: "tempete-celeste",
  "sm7.5": "majeste-des-dragons",
  sm8: "tonnerre-perdu",
  sm9: "duo-de-choc",
  sm10: "alliance-infaillible",
  sm11: "harmonie-des-esprits",
  sm115: "destinees-occultes",
  sm12: "eclipse-cosmique",

  // ── XY ────────────────────────────────────────────────────────────────────
  xy1: "xy-base",
  xy2: "etincelles-xy",
  xy3: "poings-furieux",
  xy4: "vigueur-spectrale",
  xy5: "primo-choc",
  xy6: "ciel-rugissant",
  xy7: "origines-antiques",
  xy8: "impulsion-turbo",
  xy9: "rupture-turbo",
  xy10: "impact-des-destins",
  xy11: "offensive-vapeur",
  xy12: "evolutions-xy",
  g1: "generations",
  dc1: "double-danger",

  // ── Noir & Blanc ──────────────────────────────────────────────────────────
  bw1: "noir-et-blanc",
  bw2: "pouvoirs-emergents",
  bw3: "nobles-victoires",
  bw4: "destinees-futures",
  bw5: "explorateurs-obscurs",
  bw6: "dragons-exaltes",
  bw7: "frontieres-franchies",
  bw8: "tempete-plasma",
  bw9: "glaciation-plasma",
  bw10: "explosion-plasma",

  // ── HeartGold SoulSilver ──────────────────────────────────────────────────
  hgss1: "heartgold-soulsilver-base",
  hgss2: "dechainement",
  hgss3: "indomptable",
  hgss4: "triomphe",
  col1: "arceus",

  // ── Platine ───────────────────────────────────────────────────────────────
  pl1: "platine-base",
  pl2: "rivaux-emergeants",
  pl3: "vainqueurs-supremes",

  // ── Diamant & Perle ───────────────────────────────────────────────────────
  dp1: "diamant-et-perle",
  dp2: "tresors-mysterieux",
  dp3: "merveilles-secretes",
  dp4: "grands-envols",
  dp5: "aube-majestueuse",
  dp6: "eveil-des-legendes",
  dp7: "tempete-dp",

  // ── EX ────────────────────────────────────────────────────────────────────
  ex1: "rubis-et-saphir",
  ex2: "tempete-de-sable",
  ex3: "dragon-ex",
  ex4: "groudon-vs-kyogre",
  ex5: "legendes-oubliees",
  ex6: "fire-red-leaf-green",
  ex7: "team-rocket-returns",
  ex8: "deoxys",
  ex9: "emeraude",
  ex10: "forces-cachees",
  ex11: "especes-delta",
  ex12: "createurs-de-legendes",
  ex13: "fantomes-holon",
  ex14: "gardiens-de-cristal",
  ex16: "gardiens-du-pouvoir",

  // ── Wizards of the Coast ──────────────────────────────────────────────────
  // TCGdex FR uniquement disponible pour : base1-base5, ecard1-ecard2
  // gym1/gym2 (Gym Heroes/Challenge), base4 (Base Set 2), ecard3 (Skyridge) → absents de TCGdex FR
  base1: "set-de-base",
  base2: "jungle",
  base3: "fossile",
  base5: "team-rocket",
  ecard1: "expedition",
  ecard2: "aquapolis",
};

// ---------------------------------------------------------------------------
// Types TCGdex
// ---------------------------------------------------------------------------
interface TCGdexCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
}

interface TCGdexSet {
  id: string;
  name: string;
  cards: TCGdexCard[];
  cardCount: { official: number; total: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function fetchSet(setId: string): Promise<TCGdexSet | null> {
  try {
    const res = await fetch(`https://api.tcgdex.net/v2/fr/sets/${setId}`);
    if (!res.ok) {
      console.warn(`  ⚠ TCGdex set ${setId} introuvable (${res.status})`);
      return null;
    }
    return res.json() as Promise<TCGdexSet>;
  } catch (err) {
    console.warn(`  ⚠ Erreur réseau pour le set ${setId}:`, err);
    return null;
  }
}

function buildImageUrl(card: TCGdexCard): string | null {
  if (!card.image) return null;
  // TCGdex fournit une base URL, on ajoute la résolution souhaitée
  return `${card.image}/high.webp`;
}

// ---------------------------------------------------------------------------
// Seed principal
// ---------------------------------------------------------------------------
async function seed(opts: { sets?: string[]; dryRun: boolean }) {
  const { dryRun } = opts;
  if (dryRun) console.log("🔍 Mode dry-run — aucune écriture en DB\n");

  // Filtre optionnel sur des sets précis
  const tcgdexIds = opts.sets ?? Object.keys(TCGDEX_MAPPING);

  // Dédupliquer (sv10.5b et sv10.5w → même slug)
  const seenSlugs = new Set<string>();

  // Charger une fois tous les slugs de séries depuis la DB
  const seriesInDb = await prisma.serie.findMany({ select: { id: true, slug: true } });
  const serieBySlug = new Map(seriesInDb.map((s) => [s.slug, s.id]));

  console.log(`🗂  ${seriesInDb.length} séries en DB, ${tcgdexIds.length} sets à traiter\n`);

  let totalCards = 0;
  let totalSets = 0;
  let skippedSets = 0;

  for (const tcgdexId of tcgdexIds) {
    const slug = TCGDEX_MAPPING[tcgdexId];
    if (!slug) {
      console.warn(`⚠ Pas de mapping pour le set TCGdex "${tcgdexId}" — ignoré`);
      skippedSets++;
      continue;
    }

    // Éviter de traiter deux fois le même slug (foudre-noire-flamme-blanche)
    if (seenSlugs.has(slug)) {
      console.log(`⏭  ${tcgdexId} → "${slug}" déjà traité (set double), on fusionne`);
    }

    const serieId = serieBySlug.get(slug);
    if (!serieId) {
      console.warn(`⚠ Série "${slug}" absente de la DB (non seedée) — ignoré`);
      skippedSets++;
      continue;
    }

    process.stdout.write(`📦 ${tcgdexId.padEnd(12)} → ${slug.padEnd(40)}`);
    const setData = await fetchSet(tcgdexId);
    if (!setData) { skippedSets++; continue; }

    const cards = setData.cards ?? [];
    console.log(`${cards.length} cartes`);

    if (!dryRun && cards.length > 0) {
      // Upsert par lot de 50
      const BATCH = 50;
      for (let i = 0; i < cards.length; i += BATCH) {
        const batch = cards.slice(i, i + BATCH);
        await Promise.all(
          batch.map((card) =>
            prisma.card.upsert({
              where: { serieId_number: { serieId, number: card.localId } },
              create: {
                serieId,
                number: card.localId,
                name: card.name,
                imageUrl: buildImageUrl(card),
                tcgdexId: card.id,
              },
              update: {
                name: card.name,
                imageUrl: buildImageUrl(card),
                tcgdexId: card.id,
              },
            })
          )
        );
      }

      // Mise à jour du cardCount sur la série
      if (!seenSlugs.has(slug)) {
        await prisma.serie.update({
          where: { id: serieId },
          data: { cardCount: setData.cardCount.official },
        });
      } else {
        // Set double (ex: sv10.5b + sv10.5w dans la même série) — additionner
        const current = await prisma.serie.findUnique({
          where: { id: serieId },
          select: { cardCount: true },
        });
        await prisma.serie.update({
          where: { id: serieId },
          data: { cardCount: (current?.cardCount ?? 0) + setData.cardCount.official },
        });
      }
    }

    seenSlugs.add(slug);
    totalCards += cards.length;
    totalSets++;

    // Petite pause pour ne pas surcharger l'API
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\n✅ Terminé — ${totalSets} sets traités, ${skippedSets} ignorés, ${totalCards} cartes importées`);
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
