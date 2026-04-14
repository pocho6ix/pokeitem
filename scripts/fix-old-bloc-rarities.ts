/**
 * fix-old-bloc-rarities.ts
 *
 * Les anciens blocs (non-EV/ME) ne doivent avoir que les raretés :
 * COMMON, UNCOMMON, RARE, HOLO_RARE, ULTRA_RARE, SECRET_RARE (+ PROMO)
 *
 * Règles de migration :
 *   1. Toutes les cartes TG (Trainer Gallery) → SECRET_RARE
 *   2. HYPER_RARE → SECRET_RARE
 *   3. ILLUSTRATION_RARE (non-TG) → ULTRA_RARE
 *   4. SPECIAL_ILLUSTRATION_RARE (non-TG) → SECRET_RARE
 *
 * Usage:
 *   npx tsx scripts/fix-old-bloc-rarities.ts --dry-run
 *   npx tsx scripts/fix-old-bloc-rarities.ts --serie=origine-perdue   # une seule série
 *   npx tsx scripts/fix-old-bloc-rarities.ts                          # tous anciens blocs
 */

import { PrismaClient, CardRarity } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const SERIE_ARG = process.argv.find((a) => a.startsWith("--serie="))?.split("=")[1];

const RECENT_BLOCS = ["ecarlate-violet", "mega-evolution"];

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN\n" : "");

  // Build filter: non-recent blocs, optionally scoped to one serie
  const serieFilter = SERIE_ARG
    ? { slug: SERIE_ARG }
    : { bloc: { slug: { notIn: RECENT_BLOCS } } };

  // Fetch all cards that might need fixing
  const cards = await prisma.card.findMany({
    where: {
      serie: serieFilter,
      rarity: {
        in: [
          CardRarity.ILLUSTRATION_RARE,
          CardRarity.HYPER_RARE,
          CardRarity.SPECIAL_ILLUSTRATION_RARE,
          CardRarity.ULTRA_RARE, // to catch TG cards currently in UR
        ],
      },
    },
    select: {
      id: true,
      name: true,
      number: true,
      rarity: true,
      serie: { select: { name: true, slug: true, bloc: { select: { slug: true } } } },
    },
  });

  // Filter out cards from recent blocs (safety)
  const candidates = cards.filter((c) => !RECENT_BLOCS.includes(c.serie?.bloc?.slug ?? ""));

  console.log(`📋 ${candidates.length} cartes candidates dans les anciens blocs\n`);

  // Classify each card into its target rarity
  const updates: { id: string; from: CardRarity; to: CardRarity; name: string; number: string; serie: string }[] = [];

  for (const c of candidates) {
    const isTG = c.number.toUpperCase().startsWith("TG");
    let target: CardRarity | null = null;

    if (isTG) {
      // Rule 1: ALL Trainer Gallery cards → SECRET_RARE
      target = CardRarity.SECRET_RARE;
    } else if (c.rarity === CardRarity.HYPER_RARE) {
      // Rule 2: HYPER_RARE → SECRET_RARE
      target = CardRarity.SECRET_RARE;
    } else if (c.rarity === CardRarity.ILLUSTRATION_RARE) {
      // Rule 3: ILLUSTRATION_RARE (non-TG) → ULTRA_RARE (Radiants, etc.)
      target = CardRarity.ULTRA_RARE;
    } else if (c.rarity === CardRarity.SPECIAL_ILLUSTRATION_RARE) {
      // Rule 4: SPECIAL_ILLUSTRATION_RARE (non-TG) → SECRET_RARE
      target = CardRarity.SECRET_RARE;
    }
    // ULTRA_RARE non-TG → stays ULTRA_RARE (no change)

    if (target && target !== c.rarity) {
      updates.push({
        id: c.id,
        from: c.rarity,
        to: target,
        name: c.name,
        number: c.number,
        serie: c.serie?.name ?? "?",
      });
    }
  }

  // Group for reporting
  const byTransition = new Map<string, number>();
  for (const u of updates) {
    const key = `${u.from} → ${u.to}`;
    byTransition.set(key, (byTransition.get(key) ?? 0) + 1);
  }

  console.log(`📊 ${updates.length} cartes à mettre à jour :\n`);
  for (const [key, count] of byTransition.entries()) {
    console.log(`  ${key}: ${count}`);
  }
  console.log();

  // Show a sample
  const sample = updates.slice(0, 15);
  for (const u of sample) {
    console.log(`  ${u.serie} — ${u.name} #${u.number}: ${u.from} → ${u.to}`);
  }
  if (updates.length > 15) console.log(`  ... et ${updates.length - 15} autres`);

  if (DRY_RUN) {
    console.log(`\n🔍 Dry run — aucune modification`);
    await prisma.$disconnect();
    return;
  }

  if (updates.length === 0) {
    console.log("\n✅ Rien à faire.");
    await prisma.$disconnect();
    return;
  }

  // Batch updates by target rarity for efficiency
  const byTarget = new Map<CardRarity, string[]>();
  for (const u of updates) {
    if (!byTarget.has(u.to)) byTarget.set(u.to, []);
    byTarget.get(u.to)!.push(u.id);
  }

  console.log("\n🔄 Application des changements...");
  for (const [target, ids] of byTarget.entries()) {
    const result = await prisma.card.updateMany({
      where: { id: { in: ids } },
      data: { rarity: target },
    });
    console.log(`  → ${target}: ${result.count} cartes mises à jour`);
  }

  console.log(`\n✅ Terminé: ${updates.length} cartes mises à jour`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
