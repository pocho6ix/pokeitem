// Seed all 15 McDonald's promo sets (258 cards total).
// Data source: Pokécardex — decrypted from the React bundle's
// __INITIAL_DATA_ENCRYPTED__ window variable and slimmed into scripts/_mcdo-data.json.
//
// Images: https://www.pokecardex.com/assets/images/sets/{SHORT_NAME}/HD/{ordre_affichage}.jpg
// Rarity: every card is PROMO (Pokécardex id_rarete=7 for all McDonald's sets).
//
// Run: npx tsx scripts/seed-mcdo-cards.ts [--dry-run]

import { PrismaClient, CardRarity } from "@prisma/client";
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import { isSpecialCard } from "../src/lib/pokemon/card-variants";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

// Pokécardex shortName → our serie slug
const SHORT_TO_SLUG: Record<string, string> = {
  M24:    "promo-mcdonalds-2024",
  M23:    "promo-mcdonalds-2023",
  MC11US: "promo-mcdonalds-2022",
  MC10US: "promo-mcdonalds-2021",
  MC9:    "promo-mcdonalds-2019",
  MC9US:  "promo-mcdonalds-2019-usa",
  MC8US:  "promo-mcdonalds-2018-usa",
  MC8:    "promo-mcdonalds-2018",
  MC7:    "promo-mcdonalds-2017",
  MC6:    "promo-mcdonalds-2016",
  MC5:    "promo-mcdonalds-2015",
  MC4:    "promo-mcdonalds-2014",
  MC3:    "promo-mcdonalds-2013",
  MC2:    "promo-mcdonalds-2012",
  MC1:    "promo-mcdonalds-2011",
};

const IMAGE_BASE = "https://www.pokecardex.com/assets/images/sets";

type JumboCard = {
  ordre: number;
  name: string;
  nameEn: string;
  rarete: number;
  numCard: string;
};

type SeriePayload = {
  shortName: string;
  fullName: string;
  releaseDateFR: string;
  releaseDateUS: string;
  totalCards: number;
  secretCards: number;
  cartes: JumboCard[];
};

// Pokécardex id_rarete → CardRarity. McDonald's sets only use 7 (Promo).
const POKECARDEX_RARITY_MAP: Record<number, CardRarity> = {
  1: CardRarity.COMMON,
  2: CardRarity.UNCOMMON,
  3: CardRarity.RARE,
  4: CardRarity.HOLO_RARE,
  7: CardRarity.PROMO,
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) console.log("🔍 Mode dry-run — aucune écriture en DB\n");

  const jsonPath = path.join(__dirname, "_mcdo-data.json");
  const raw = fs.readFileSync(jsonPath, "utf8");
  const all: Record<string, SeriePayload> = JSON.parse(raw);
  const shorts = Object.keys(all);
  console.log(`📦 ${shorts.length} séries McDonald's à seeder\n`);

  // Resolve all serie IDs first
  const slugToId = new Map<string, string>();
  for (const short of shorts) {
    const slug = SHORT_TO_SLUG[short];
    if (!slug) {
      console.warn(`⚠ Pas de mapping pour shortName "${short}" — ignoré`);
      continue;
    }
    const serie = await prisma.serie.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!serie) {
      console.error(`❌ Série "${slug}" absente de la DB. Exécute d'abord: npx tsx scripts/seed-series.ts`);
      process.exit(1);
    }
    slugToId.set(slug, serie.id);
  }

  let totalCards = 0;
  for (const short of shorts) {
    const payload = all[short];
    const slug = SHORT_TO_SLUG[short];
    if (!slug) continue;
    const serieId = slugToId.get(slug)!;
    const cards = payload.cartes;

    process.stdout.write(`  ${short.padEnd(8)} → ${slug.padEnd(28)} ${String(cards.length).padStart(3)} cartes `);

    if (!dryRun && cards.length > 0) {
      await Promise.all(
        cards.map((c) => {
          const rarity = POKECARDEX_RARITY_MAP[c.rarete] ?? CardRarity.PROMO;
          const imageUrl = `${IMAGE_BASE}/${short}/HD/${c.ordre}.jpg`;
          return prisma.card.upsert({
            where: { serieId_number: { serieId, number: String(c.ordre) } },
            create: {
              serieId,
              number: String(c.ordre),
              name: c.name,
              imageUrl,
              rarity,
              isSpecial: isSpecialCard(rarity),
            },
            update: {
              name: c.name,
              imageUrl,
              rarity,
              isSpecial: isSpecialCard(rarity),
            },
          });
        })
      );
      await prisma.serie.update({
        where: { id: serieId },
        data: { cardCount: cards.length },
      });
    }
    totalCards += cards.length;
    console.log("✅");
  }

  console.log(`\n✅ ${totalCards} cartes ${dryRun ? "(dry-run)" : "importées"} sur ${shorts.length} séries McDonald's`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
