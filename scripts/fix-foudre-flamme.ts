/**
 * fix-foudre-flamme.ts
 *
 * Fixes the broken DB state after failed merge:
 * - Moves 172 cards from 'foudre-noire-flamme-blanche' → 'foudre-noire'
 * - Deletes the 'foudre-noire-flamme-blanche' serie
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

async function main() {
  const combined = await prisma.serie.findUnique({ where: { slug: "foudre-noire-flamme-blanche" } });
  const foudreNoire = await prisma.serie.findUnique({ where: { slug: "foudre-noire" } });

  if (!combined) { console.log("No combined serie found — nothing to do"); return; }
  if (!foudreNoire) { console.log("foudre-noire serie not found!"); return; }

  console.log(`Moving cards from combined (${combined.id}) → foudre-noire (${foudreNoire.id})`);

  const result = await prisma.card.updateMany({
    where: { serieId: combined.id },
    data: { serieId: foudreNoire.id },
  });

  console.log(`✅ Moved ${result.count} cards to foudre-noire`);

  // Delete combined serie
  await prisma.serie.delete({ where: { id: combined.id } });
  console.log("✅ Deleted foudre-noire-flamme-blanche serie");

  // Verify
  const fn = await prisma.card.count({ where: { serieId: foudreNoire.id } });
  const fb = await prisma.serie.findUnique({ where: { slug: "flamme-blanche" }, include: { _count: { select: { cards: true } } } });
  console.log(`\nFinal state:`);
  console.log(`  foudre-noire: ${fn} cards`);
  console.log(`  flamme-blanche: ${fb?._count.cards} cards`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
