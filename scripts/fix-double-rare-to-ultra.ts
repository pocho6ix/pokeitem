/**
 * fix-double-rare-to-ultra.ts
 *
 * Corrige les cartes V, VMAX, VSTAR, GX, LV.X des anciens blocs
 * qui ont été mises à HOLO_RARE mais devraient être ULTRA_RARE.
 *
 * On identifie ces cartes par leur nom (contient " V ", " VMAX", " VSTAR",
 * " GX", " LV.X" ou " ex") dans les blocs hors EV/ME.
 *
 * Usage:
 *   npx tsx scripts/fix-double-rare-to-ultra.ts --dry-run
 *   npx tsx scripts/fix-double-rare-to-ultra.ts
 */

import { PrismaClient, CardRarity } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

const RECENT_BLOCS = ["ecarlate-violet", "mega-evolution"];

/**
 * Patterns that indicate a V/VMAX/VSTAR/GX/LV.X card → should be ULTRA_RARE.
 * We match on the card name.
 */
const ULTRA_RARE_PATTERNS = [
  / V$/,           // "Giratina V"
  / V /,           // "Giratina V " (with trailing space in some names)
  / VMAX$/,
  / VMAX /,
  / VSTAR$/,
  / VSTAR /,
  /-VMAX$/,
  /-VSTAR$/,
  / GX$/,
  / GX /,
  /-GX$/,
  / LV\.X$/,
  / LV\.X /,
  /-LV\.X$/,
];

function isUltraRareByName(name: string): boolean {
  return ULTRA_RARE_PATTERNS.some((p) => p.test(name));
}

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN\n" : "");

  // Find all HOLO_RARE cards in old blocs that match V/VMAX/VSTAR/GX/LV.X patterns
  const cards = await prisma.card.findMany({
    where: {
      rarity: CardRarity.HOLO_RARE,
      serie: {
        bloc: {
          slug: { notIn: RECENT_BLOCS },
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

  const toFix = cards.filter((c) => isUltraRareByName(c.name));

  console.log(`📋 ${toFix.length} cartes V/VMAX/VSTAR/GX/LV.X à passer HOLO_RARE → ULTRA_RARE\n`);

  if (toFix.length === 0) {
    console.log("✅ Rien à faire.");
    await prisma.$disconnect();
    return;
  }

  // Show sample
  const sample = toFix.slice(0, 20);
  for (const c of sample) {
    console.log(`  ${c.serie?.bloc?.name} / ${c.serie?.name} — ${c.name} #${c.number}`);
  }
  if (toFix.length > 20) console.log(`  ... et ${toFix.length - 20} autres`);

  if (DRY_RUN) {
    console.log(`\n🔍 Dry run — aucune modification`);
    await prisma.$disconnect();
    return;
  }

  // Update in bulk by IDs
  const ids = toFix.map((c) => c.id);
  const result = await prisma.card.updateMany({
    where: { id: { in: ids } },
    data: { rarity: CardRarity.ULTRA_RARE },
  });

  console.log(`\n✅ ${result.count} cartes mises à jour : HOLO_RARE → ULTRA_RARE`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
