/**
 * One-shot cleanup — deletes the 4 legacy ED1 series (set-de-base-1ed,
 * jungle-1ed, fossile-1ed, team-rocket-1ed) and all their Card rows.
 *
 * The ED1 concept now lives on the Unlimited serie twins as a
 * CardVersion.FIRST_EDITION variant (see src/data/card-versions.ts).
 *
 * Safety:
 *  - Refuses to run if any UserCard rows reference these series' cards.
 *  - Writes a JSON backup to backups/ed1-series-<date>.json before
 *    destructive operations.
 *
 * Usage: npx tsx scripts/delete-ed1-series.ts
 */

import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

const ED1_SLUGS = [
  "set-de-base-1ed",
  "jungle-1ed",
  "fossile-1ed",
  "team-rocket-1ed",
] as const;

async function main() {
  const series = await prisma.serie.findMany({
    where: { slug: { in: [...ED1_SLUGS] } },
    include: {
      cards: true,
    },
  });

  console.log(`Found ${series.length} ED1 series:`);
  for (const s of series) {
    console.log(`  - ${s.slug} (${s.name}): ${s.cards.length} cards`);
  }

  const cardIds = series.flatMap((s) => s.cards.map((c) => c.id));

  const userCardCount = await prisma.userCard.count({
    where: { cardId: { in: cardIds } },
  });
  if (userCardCount > 0) {
    console.error(
      `ABORT: ${userCardCount} UserCard rows still reference ED1 cards. ` +
        `Migrate them to the Unlimited serie + FIRST_EDITION version first.`
    );
    process.exit(1);
  }

  const historyCount = await prisma.cardPriceHistory.count({
    where: { cardId: { in: cardIds } },
  });
  console.log(`CardPriceHistory rows to delete: ${historyCount}`);

  // Backup — serialize Date → ISO string for JSON.
  mkdirSync(join(process.cwd(), "backups"), { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const backupPath = join(process.cwd(), "backups", `ed1-series-${stamp}.json`);
  writeFileSync(backupPath, JSON.stringify(series, null, 2));
  console.log(`Backup written to ${backupPath}`);

  // Delete children first to keep referential integrity.
  const histDel = await prisma.cardPriceHistory.deleteMany({
    where: { cardId: { in: cardIds } },
  });
  console.log(`Deleted ${histDel.count} CardPriceHistory rows`);

  const cardDel = await prisma.card.deleteMany({
    where: { id: { in: cardIds } },
  });
  console.log(`Deleted ${cardDel.count} Card rows`);

  const serieDel = await prisma.serie.deleteMany({
    where: { slug: { in: [...ED1_SLUGS] } },
  });
  console.log(`Deleted ${serieDel.count} Serie rows`);

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
