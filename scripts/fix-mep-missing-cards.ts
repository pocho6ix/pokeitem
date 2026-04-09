/**
 * fix-mep-missing-cards.ts
 *
 * Ajoute les cartes MEP 029–045 manquantes dans la DB.
 * TCGdex ne connaît que 28 cartes pour MEP ; le set réel en a 53.
 *
 * Sources des images : cartes "extra" (hors plage officielle) des sets
 * principaux me01/me02/me02.5/me03 sur TCGdex.
 *
 * Cartes sans image trouvée (039, 040, 041, 044, 045) : imageUrl = null.
 * Cartes 046–053 : noms inconnus → non ajoutées pour l'instant.
 *
 * Usage :
 *   npx tsx scripts/fix-mep-missing-cards.ts
 *   npx tsx scripts/fix-mep-missing-cards.ts --dry-run
 */

import { PrismaClient, CardRarity } from "@prisma/client";
import { isSpecialCard } from "../src/lib/pokemon/card-variants";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

// Cartes MEP 029–045 confirmées depuis les screenshots
// imageUrl : source dans les sets ME principaux (extras TCGdex)
const MEP_CARDS: Array<{
  number: string;
  name: string;
  rarity: CardRarity;
  imageUrl: string | null;
  tcgdexId: string;
}> = [
  // ── Méga EX promos ─────────────────────────────────────────────────────────
  {
    number: "029",
    name: "Méga-Dracaufeu X-ex",
    rarity: "DOUBLE_RARE" as CardRarity,
    imageUrl: "https://assets.tcgdex.net/fr/me/me02/109/high.webp",
    tcgdexId: "me02-109",
  },
  {
    number: "030",
    name: "Méga-Dracaufeu Y-ex",
    rarity: "DOUBLE_RARE" as CardRarity,
    imageUrl: "https://assets.tcgdex.net/fr/me/me02.5/294/high.webp",
    tcgdexId: "me02.5-294",
  },
  {
    number: "031",
    name: "Zekrom de N",
    rarity: "RARE" as CardRarity,
    imageUrl: "https://assets.tcgdex.net/fr/me/me02.5/155/high.webp",
    tcgdexId: "me02.5-155",
  },
  {
    number: "032",
    name: "Méga-Gardevoir-ex",
    rarity: "DOUBLE_RARE" as CardRarity,
    imageUrl: "https://assets.tcgdex.net/fr/me/me01/159/high.webp",
    tcgdexId: "me01-159",
  },
  {
    number: "033",
    name: "Méga-Lucario-ex",
    rarity: "DOUBLE_RARE" as CardRarity,
    imageUrl: "https://assets.tcgdex.net/fr/me/me01/160/high.webp",
    tcgdexId: "me01-160",
  },
  {
    number: "034",
    name: "Méga-Méganium-ex",
    rarity: "DOUBLE_RARE" as CardRarity,
    imageUrl: "https://assets.tcgdex.net/fr/me/me02.5/272/high.webp",
    tcgdexId: "me02.5-272",
  },
  {
    number: "035",
    name: "Méga-Roitiflam-ex",
    rarity: "DOUBLE_RARE" as CardRarity,
    imageUrl: "https://assets.tcgdex.net/fr/me/me02.5/273/high.webp",
    tcgdexId: "me02.5-273",
  },
  {
    number: "036",
    name: "Méga-Aligatueur-ex",
    rarity: "DOUBLE_RARE" as CardRarity,
    imageUrl: "https://assets.tcgdex.net/fr/me/me02.5/274/high.webp",
    tcgdexId: "me02.5-274",
  },
  // ── Starters Gen 1 ─────────────────────────────────────────────────────────
  {
    number: "037",
    name: "Bulbizarre",
    rarity: "COMMON" as CardRarity,
    imageUrl: "https://assets.tcgdex.net/fr/me/me01/133/high.webp",
    tcgdexId: "me01-133",
  },
  {
    number: "038",
    name: "Salamèche",
    rarity: "COMMON" as CardRarity,
    imageUrl: "https://assets.tcgdex.net/fr/me/me02/011/high.webp",
    tcgdexId: "me02-011",
  },
  {
    number: "039",
    name: "Carapuce",
    rarity: "COMMON" as CardRarity,
    imageUrl: null, // aucune source d'image trouvée dans les sets ME
    tcgdexId: "mep-039",
  },
  // ── Starters Gen 4 ─────────────────────────────────────────────────────────
  {
    number: "040",
    name: "Tortipouss",
    rarity: "COMMON" as CardRarity,
    imageUrl: null,
    tcgdexId: "mep-040",
  },
  {
    number: "041",
    name: "Ouisticram",
    rarity: "COMMON" as CardRarity,
    imageUrl: null,
    tcgdexId: "mep-041",
  },
  {
    number: "042",
    name: "Tiplouf",
    rarity: "COMMON" as CardRarity,
    imageUrl: "https://assets.tcgdex.net/fr/me/me02/098/high.webp",
    tcgdexId: "me02-098",
  },
  // ── Starters Gen 7 ─────────────────────────────────────────────────────────
  {
    number: "043",
    name: "Brindibou",
    rarity: "COMMON" as CardRarity,
    imageUrl: "https://assets.tcgdex.net/fr/me/me03/090/high.webp",
    tcgdexId: "me03-090",
  },
  {
    number: "044",
    name: "Flamiaou",
    rarity: "COMMON" as CardRarity,
    imageUrl: null,
    tcgdexId: "mep-044",
  },
  {
    number: "045",
    name: "Otaquin",
    rarity: "COMMON" as CardRarity,
    imageUrl: null,
    tcgdexId: "mep-045",
  },
];

async function main() {
  if (dryRun) console.log("🔍 Mode dry-run — aucune écriture en DB\n");

  const serie = await prisma.serie.findUnique({
    where: { slug: "promos-mega-evolution" },
    select: { id: true, name: true },
  });

  if (!serie) {
    console.error("❌ Série 'promos-mega-evolution' introuvable en DB");
    process.exit(1);
  }

  console.log(`📦 ${serie.name}`);

  let added = 0;
  let skipped = 0;
  let withImage = 0;

  for (const card of MEP_CARDS) {
    // Check if card already exists
    const existing = await prisma.card.findUnique({
      where: { serieId_number: { serieId: serie.id, number: card.number } },
      select: { id: true, imageUrl: true },
    });

    if (existing) {
      // Update imageUrl if we have one and it's missing
      if (card.imageUrl && !existing.imageUrl) {
        if (!dryRun) {
          await prisma.card.update({
            where: { id: existing.id },
            data: { imageUrl: card.imageUrl },
          });
        }
        console.log(`  ↻ ${card.number} ${card.name} — image mise à jour`);
        withImage++;
      } else {
        console.log(`  ⏭ ${card.number} ${card.name} — déjà en DB`);
        skipped++;
      }
      continue;
    }

    const isSpecial = isSpecialCard(card.rarity);

    if (!dryRun) {
      await prisma.card.create({
        data: {
          serieId: serie.id,
          number: card.number,
          name: card.name,
          rarity: card.rarity,
          isSpecial,
          imageUrl: card.imageUrl,
          tcgdexId: card.tcgdexId,
        },
      });
    }

    const imgStatus = card.imageUrl ? "✓ img" : "✗ no img";
    console.log(`  + ${card.number} ${card.name} [${card.rarity}] ${imgStatus}`);
    added++;
    if (card.imageUrl) withImage++;
  }

  // Update cardCount
  if (!dryRun) {
    const total = await prisma.card.count({ where: { serieId: serie.id } });
    await prisma.serie.update({
      where: { id: serie.id },
      data: { cardCount: total },
    });
    console.log(`\n✅ ${added} cartes ajoutées, ${skipped} ignorées, ${withImage} avec image`);
    console.log(`   Total MEP en DB : ${total} cartes`);
    console.log(`\n⚠  Cartes 046–053 non ajoutées (noms inconnus)`);
    console.log(`   Cartes sans image : 039 Carapuce, 040 Tortipouss, 041 Ouisticram, 044 Flamiaou, 045 Otaquin`);
  } else {
    console.log(`\n🔍 Dry-run : ${added} à ajouter, ${skipped} ignorées`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
