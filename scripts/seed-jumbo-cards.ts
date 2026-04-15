// Seed Jumbo (oversized) cards.
// Data source: Pokécardex JUMBO series (400 cards) — decrypted from the React bundle's
// __INITIAL_DATA_ENCRYPTED__ window variable and slimmed into scripts/_jumbo-cards.json.
//
// Images: https://www.pokecardex.com/assets/images/sets/JUMBO/HD/{ordre_affichage}.jpg
//         Cards 1–396 have HD images; 397–400 (latest Méga ex jumbos) have no CDN image yet.
//
// Rarity: Pokécardex uses its own numeric id_rarete. See POKECARDEX_RARITY_MAP below
//         for the translation to our CardRarity enum.
//
// Run: npx tsx scripts/seed-jumbo-cards.ts [--dry-run]

import { PrismaClient, CardRarity } from "@prisma/client";
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import { isSpecialCard } from "../src/lib/pokemon/card-variants";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

const JUMBO_SERIE_SLUG = "jumbo";
const IMAGE_BASE = "https://www.pokecardex.com/assets/images/sets/JUMBO/HD";
// Cards beyond this ordre_affichage don't have a CDN image yet.
const MAX_IMAGE_ORDRE = 396;

// Pokécardex id_rarete → CardRarity
const POKECARDEX_RARITY_MAP: Record<number, CardRarity> = {
  1:  CardRarity.COMMON,                   // Commune
  2:  CardRarity.UNCOMMON,                 // Unco
  3:  CardRarity.RARE,                     // Rare
  4:  CardRarity.HOLO_RARE,                // Holographique
  5:  CardRarity.ULTRA_RARE,               // Ultra-rare (old-style)
  6:  CardRarity.SECRET_RARE,              // Secrète
  7:  CardRarity.PROMO,                    // Promo
  21: CardRarity.NO_RARITY,                // Sans rareté
  32: CardRarity.DOUBLE_RARE,              // Double Rare (EX, V…)
  33: CardRarity.ILLUSTRATION_RARE,        // Illustration Rare
  34: CardRarity.ULTRA_RARE,               // Ultra Rare (new-style Full Art)
  35: CardRarity.SPECIAL_ILLUSTRATION_RARE,// Illustration Spéciale Rare
  36: CardRarity.HYPER_RARE,               // Hyper Rare
  38: CardRarity.ILLUSTRATION_RARE,        // Illustration Rare Chromatique
  39: CardRarity.SPECIAL_ILLUSTRATION_RARE,// Illustration Spéciale Chromatique
  40: CardRarity.HYPER_RARE,               // HIGH-TECH rare
  43: CardRarity.NOIR_BLANC_RARE,          // Noir Blanc Rare
  45: CardRarity.MEGA_HYPER_RARE,          // Mega Hyper Rare
  47: CardRarity.MEGA_ATTAQUE_RARE,        // Méga Attaque Rare
};

type JumboCard = {
  ordre: number;
  name: string;
  nameEn: string;
  rarete: number;
  numCard: string;
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) console.log("🔍 Mode dry-run — aucune écriture en DB\n");

  const jsonPath = path.join(__dirname, "_jumbo-cards.json");
  const raw = fs.readFileSync(jsonPath, "utf8");
  const cards: JumboCard[] = JSON.parse(raw);
  console.log(`📦 ${cards.length} cartes Jumbo à importer`);

  const serie = await prisma.serie.findUnique({
    where: { slug: JUMBO_SERIE_SLUG },
    select: { id: true, blocId: true },
  });
  if (!serie) {
    console.error(`❌ Série "${JUMBO_SERIE_SLUG}" absente de la DB. Exécute d'abord: npx tsx scripts/seed-series.ts`);
    process.exit(1);
  }

  // Safety check on rarity mapping
  const unknownRaretes = new Set<number>();
  for (const c of cards) {
    if (!(c.rarete in POKECARDEX_RARITY_MAP)) unknownRaretes.add(c.rarete);
  }
  if (unknownRaretes.size > 0) {
    console.warn(`⚠ id_rarete inconnus: ${[...unknownRaretes].join(", ")} (seront mappés en COMMON)`);
  }

  let imported = 0;
  let withImage = 0;
  let withoutImage = 0;
  const rarityDist: Record<string, number> = {};

  const BATCH = 50;
  for (let i = 0; i < cards.length; i += BATCH) {
    const batch = cards.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (c) => {
        const rarity = POKECARDEX_RARITY_MAP[c.rarete] ?? CardRarity.COMMON;
        const imageUrl =
          c.ordre <= MAX_IMAGE_ORDRE ? `${IMAGE_BASE}/${c.ordre}.jpg` : null;
        if (imageUrl) withImage++;
        else withoutImage++;
        rarityDist[rarity] = (rarityDist[rarity] ?? 0) + 1;

        if (dryRun) {
          imported++;
          return;
        }

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
        imported++;
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

  console.log(`\n✅ ${imported} cartes ${dryRun ? "(dry-run)" : "importées"}`);
  console.log(`   ${withImage} avec image, ${withoutImage} sans image (397–400)`);
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
