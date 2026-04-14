/**
 * fix-double-rare.ts
 *
 * DOUBLE_RARE n'existe que dans les blocs Écarlate & Violet et Méga-Évolution.
 * Ce script réassigne DOUBLE_RARE → HOLO_RARE pour toutes les cartes des
 * anciens blocs (Épée & Bouclier, Soleil & Lune, XY, etc.)
 *
 * Usage:
 *   npx tsx scripts/fix-double-rare.ts --dry-run
 *   npx tsx scripts/fix-double-rare.ts
 */

import { PrismaClient, CardRarity } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

/** Only these blocs can have DOUBLE_RARE */
const ALLOWED_BLOCS = new Set(["ecarlate-violet", "mega-evolution"]);

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN\n" : "");

  // Find all DOUBLE_RARE cards in blocs OTHER than EV and ME
  const cards = await prisma.card.findMany({
    where: {
      rarity: CardRarity.DOUBLE_RARE,
      serie: {
        bloc: {
          slug: { notIn: [...ALLOWED_BLOCS] },
        },
      },
    },
    select: {
      id: true,
      name: true,
      number: true,
      serie: {
        select: {
          name: true,
          bloc: { select: { slug: true, name: true } },
        },
      },
    },
  });

  console.log(`📋 ${cards.length} cartes DOUBLE_RARE dans les anciens blocs\n`);

  if (cards.length === 0) {
    console.log("✅ Rien à faire.");
    await prisma.$disconnect();
    return;
  }

  // Show a sample
  const sample = cards.slice(0, 15);
  for (const c of sample) {
    console.log(`  ${c.serie?.bloc?.name} / ${c.serie?.name} — ${c.name} #${c.number}`);
  }
  if (cards.length > 15) console.log(`  ... et ${cards.length - 15} autres`);

  if (DRY_RUN) {
    console.log(`\n🔍 Dry run — aucune modification`);
    await prisma.$disconnect();
    return;
  }

  // Bulk update: DOUBLE_RARE → HOLO_RARE for these cards
  const result = await prisma.card.updateMany({
    where: {
      rarity: CardRarity.DOUBLE_RARE,
      serie: {
        bloc: {
          slug: { notIn: [...ALLOWED_BLOCS] },
        },
      },
    },
    data: {
      rarity: CardRarity.HOLO_RARE,
    },
  });

  console.log(`\n✅ ${result.count} cartes mises à jour : DOUBLE_RARE → HOLO_RARE`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
