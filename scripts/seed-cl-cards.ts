// Seed L'Appel des Légendes (Call of Legends, CL) — 106 cards.
// Data source: Pokécardex — decrypted from the React bundle's
// __INITIAL_DATA_ENCRYPTED__ window variable and slimmed into scripts/_cl-data.json.
//
// Images: https://www.pokecardex.com/assets/images/sets/CL/HD/{ordre_affichage}.jpg
// Rarities: id_rarete 1/2/3/4/6 → COMMON/UNCOMMON/RARE/HOLO_RARE/SECRET_RARE
//
// Run: npx tsx scripts/seed-cl-cards.ts [--dry-run]

import { PrismaClient, CardRarity } from "@prisma/client";
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import { isSpecialCard } from "../src/lib/pokemon/card-variants";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

const SERIE_SLUG = "appel-des-legendes";
const POKECARDEX_SHORT = "CL";
const IMAGE_BASE = "https://www.pokecardex.com/assets/images/sets";

// Pokécardex id_rarete → CardRarity
const POKECARDEX_RARITY_MAP: Record<number, CardRarity> = {
  1: CardRarity.COMMON,
  2: CardRarity.UNCOMMON,
  3: CardRarity.RARE,
  4: CardRarity.HOLO_RARE,
  5: CardRarity.ULTRA_RARE,
  6: CardRarity.SECRET_RARE,
  7: CardRarity.PROMO,
};

type CLCard = {
  ordre: number;
  name: string;
  nameEn: string;
  rarete: number;
  numCard: string;
};

type Payload = {
  shortName: string;
  fullName: string;
  releaseDateFR: string;
  totalCards: number;
  secretCards: number;
  cartes: CLCard[];
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) console.log("🔍 Mode dry-run — aucune écriture en DB\n");

  const jsonPath = path.join(__dirname, "_cl-data.json");
  const raw = fs.readFileSync(jsonPath, "utf8");
  const payload: Payload = JSON.parse(raw);
  const cards = payload.cartes;
  console.log(`📦 ${cards.length} cartes "${payload.fullName}" à importer`);

  const serie = await prisma.serie.findUnique({
    where: { slug: SERIE_SLUG },
    select: { id: true },
  });
  if (!serie) {
    console.error(`❌ Série "${SERIE_SLUG}" absente de la DB. Exécute d'abord: npx tsx scripts/seed-series.ts`);
    process.exit(1);
  }

  const unknownRaretes = new Set<number>();
  for (const c of cards) {
    if (!(c.rarete in POKECARDEX_RARITY_MAP)) unknownRaretes.add(c.rarete);
  }
  if (unknownRaretes.size > 0) {
    console.warn(`⚠ id_rarete inconnus: ${[...unknownRaretes].join(", ")} (mappés en COMMON)`);
  }

  const rarityDist: Record<string, number> = {};

  const BATCH = 50;
  for (let i = 0; i < cards.length; i += BATCH) {
    const batch = cards.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (c) => {
        const rarity = POKECARDEX_RARITY_MAP[c.rarete] ?? CardRarity.COMMON;
        const imageUrl = `${IMAGE_BASE}/${POKECARDEX_SHORT}/HD/${c.ordre}.jpg`;
        rarityDist[rarity] = (rarityDist[rarity] ?? 0) + 1;

        if (dryRun) return;

        await prisma.card.upsert({
          where: { serieId_number: { serieId: serie.id, number: String(c.ordre) } },
          create: {
            serieId: serie.id,
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
    process.stdout.write(`  ${Math.min(i + BATCH, cards.length)}/${cards.length}\r`);
  }
  console.log();

  if (!dryRun) {
    await prisma.serie.update({
      where: { id: serie.id },
      data: { cardCount: cards.length },
    });
  }

  console.log(`\n✅ ${cards.length} cartes ${dryRun ? "(dry-run)" : "importées"}`);
  console.log(`\n📊 Distribution des raretés:`);
  for (const [r, n] of Object.entries(rarityDist).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${r.padEnd(30)} ${n}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
