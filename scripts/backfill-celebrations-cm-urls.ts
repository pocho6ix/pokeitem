/**
 * Backfill Card.cardmarketUrl for the 26 Celebrations cards that the CM API
 * doesn't expose (Classic Collection reprints + #24 variant).
 *
 * The slugs were extracted from the Cardmarket Celebrations listing page
 * (see /tmp/cm-debug.html). Format matches the existing regular cards:
 *   Celebrations/{slug}?language=2
 *
 * Usage:
 *   npx tsx scripts/backfill-celebrations-cm-urls.ts --dry-run
 *   npx tsx scripts/backfill-celebrations-cm-urls.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

// DB card number → CM product slug (path segment after /Celebrations/)
const DB_TO_SLUG: Record<string, string> = {
  "24": "Professors-Research-Professor-Oak-V2-CEL024",
  "26": "Blastoise",
  "27": "Charizard-V1-CELBS-4",
  "28": "Venusaur",
  "29": "Imposter-Professor-Oak",
  "30": "Dark-Gyarados",
  "31": "Here-Comes-Team-Rocket",
  "32": "Rockets-Zapdos",
  "33": "s-Pikachu",
  "34": "Cleffa",
  "35": "Shining-Magikarp",
  "36": "Team-Magmas-Groudon",
  "37": "Rockets-Admin",
  "38": "Mew-ex",
  "39": "Gardevoir-ex-Delta-Species",
  "40": "Umbreon-Gold-Star-CELPOP5-17",
  "41": "Claydol-Lv45",
  "42": "Luxray-GL-LVX-CELRR-109",
  "43": "Garchomp-C-LVX-CELSV-145",
  "44": "Donphan-CELHS-107",
  "45": "Reshiram-V2",
  "46": "Zekrom-V2",
  "47": "Mewtwo-EX",
  "48": "Xerneas-EX",
  "49": "MRayquaza-EX",
  "50": "Tapu-Lele-GX",
};

async function main() {
  const cards = await prisma.card.findMany({
    where: {
      serie: { slug: "celebrations" },
      number: { in: Object.keys(DB_TO_SLUG) },
    },
    select: { id: true, number: true, name: true, cardmarketUrl: true },
    orderBy: { number: "asc" },
  });
  console.log(`📦 ${cards.length} cartes Celebrations ciblées\n`);

  const updates: Array<{ id: string; number: string; name: string; newUrl: string; oldUrl: string | null }> = [];
  for (const c of cards) {
    const slug = DB_TO_SLUG[c.number];
    const newUrl = `Celebrations/${slug}?language=2`;
    if (c.cardmarketUrl === newUrl) continue;
    updates.push({ id: c.id, number: c.number, name: c.name, newUrl, oldUrl: c.cardmarketUrl });
  }

  console.log("Récap :");
  for (const u of updates) {
    console.log(
      `   #${u.number.padStart(3)} ${u.name.padEnd(38).slice(0, 38)}  ${(u.oldUrl ?? "null").padEnd(32).slice(0, 32)} → ${u.newUrl}`
    );
  }

  if (DRY_RUN) {
    console.log(`\n(dry-run : ${updates.length} cartes seraient mises à jour)`);
    await prisma.$disconnect();
    return;
  }

  console.log(`\n💾 Écriture DB…`);
  for (const u of updates) {
    await prisma.card.update({
      where: { id: u.id },
      data: { cardmarketUrl: u.newUrl },
    });
  }
  console.log(`✅ ${updates.length} cartes mises à jour`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
