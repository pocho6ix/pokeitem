/**
 * migrate-versions.ts
 *
 * Normalizes existing UserCard version data:
 * - Special cards (isSpecial = true) should only have version = NORMAL.
 * - If a special card has REVERSE (or other non-NORMAL) entries, merge their
 *   quantity into the NORMAL entry and delete the non-NORMAL rows.
 *
 * Usage: npx tsx scripts/migrate-versions.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find all UserCard entries for special cards that have a non-NORMAL version
  const badEntries = await prisma.userCard.findMany({
    where: {
      card: { isSpecial: true },
      version: { not: "NORMAL" },
    },
    select: {
      id: true,
      userId: true,
      cardId: true,
      version: true,
      quantity: true,
    },
  });

  console.log(`Found ${badEntries.length} non-NORMAL entries for special cards.`);

  if (badEntries.length === 0) {
    console.log("Nothing to migrate.");
    return;
  }

  let merged = 0;
  let deleted = 0;

  for (const entry of badEntries) {
    // Check if a NORMAL entry already exists for this user+card
    const normalEntry = await prisma.userCard.findUnique({
      where: {
        userId_cardId_version: {
          userId: entry.userId,
          cardId: entry.cardId,
          version: "NORMAL",
        },
      },
    });

    if (normalEntry) {
      // Merge: add the quantity to the existing NORMAL entry
      await prisma.userCard.update({
        where: { id: normalEntry.id },
        data: { quantity: normalEntry.quantity + entry.quantity },
      });
      // Delete the non-NORMAL entry
      await prisma.userCard.delete({ where: { id: entry.id } });
      merged++;
      console.log(`  Merged ${entry.version} (qty ${entry.quantity}) → NORMAL for card ${entry.cardId}, user ${entry.userId}`);
    } else {
      // No NORMAL entry exists — just update the version to NORMAL
      await prisma.userCard.update({
        where: { id: entry.id },
        data: { version: "NORMAL" },
      });
      merged++;
      console.log(`  Converted ${entry.version} → NORMAL for card ${entry.cardId}, user ${entry.userId}`);
    }

    deleted++;
  }

  console.log(`\nDone. Processed ${deleted} entries (${merged} merged/converted).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
