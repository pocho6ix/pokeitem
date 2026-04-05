/**
 * seed-me-types.ts
 *
 * Remplit les champs types, category, trainerType, energyType pour les 4 sets
 * du bloc Méga-Évolution depuis PokémonTCG.io (TCGdex individual API trop lent).
 *
 * Usage:
 *   npx tsx scripts/seed-me-types.ts
 *   npx tsx scripts/seed-me-types.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

const ME_SETS: { slug: string; ptcgId: string }[] = [
  { slug: "mega-evolution",           ptcgId: "me1" },
  { slug: "flammes-fantasmagoriques", ptcgId: "me2" },
  { slug: "heros-transcendants",      ptcgId: "me2pt5" },
  { slug: "equilibre-parfait",        ptcgId: "me3" },
];

// PTCGIO English type → French type (stored in DB)
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

// PTCGIO English subtype → French trainerType
const SUBTYPE_EN_TO_FR: Record<string, string> = {
  "Supporter":    "Supporter",
  "Item":         "Objet",
  "Stadium":      "Stade",
  "Pokémon Tool": "Outil",
};

// PTCGIO supertype → French category
const SUPERTYPE_TO_CATEGORY: Record<string, string> = {
  "Pokémon": "Pokémon",
  "Trainer": "Dresseur",
  "Energy":  "Énergie",
};

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

async function main(dryRun: boolean) {
  if (dryRun) console.log("🔍 Mode dry-run — aucune écriture en DB\n");

  let totalUpdated = 0;

  for (const { slug, ptcgId } of ME_SETS) {
    const serie = await prisma.serie.findUnique({ where: { slug }, select: { id: true } });
    if (!serie) { console.warn(`⚠ Série "${slug}" absente`); continue; }

    process.stdout.write(`📦 ${ptcgId.padEnd(10)} → ${slug.padEnd(35)}`);

    const ptcgCards = await fetchPTCGCards(ptcgId);
    if (!ptcgCards.length) { console.log("aucune carte"); continue; }

    const dbCards = await prisma.card.findMany({
      where: { serieId: serie.id },
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
      // Energy spéciale : supertype=Energy AND has subtypes ["Special"]
      const energyType = card.supertype === "Energy" && card.subtypes?.includes("Special") ? "Spécial" : null;

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

const dryRun = process.argv.includes("--dry-run");
main(dryRun)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
