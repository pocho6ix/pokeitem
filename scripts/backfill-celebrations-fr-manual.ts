/**
 * One-shot backfill: set `priceFr` on the 26 Celebrations cards (Classic
 * Collection + #24 variant) using manually captured Cardmarket "De" values
 * filtered by French language (`?language=2`).
 *
 * Prices were sourced from cardmarket.com product pages manually because
 * Cloudflare blocked the automated scraper mid-session. The 9 cards that
 * were successfully scraped before CF blocked are also included here for
 * consistency — all 26 get rewritten in one pass.
 *
 * Usage:
 *   npx tsx scripts/backfill-celebrations-fr-manual.ts --dry-run
 *   npx tsx scripts/backfill-celebrations-fr-manual.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

// DB card number → FR-language lowest NM price (EUR).
// For #28 Florizarre, the "De" field showed £15.00 (GBP, likely from a UK
// seller pricing in pounds); we fall back to the lowest visible FR NM offer
// (17,75 €, Pokeseb).
const PRICES_FR: Record<string, number> = {
  "24": 1.0,     // Recherches Professorales (variante)
  "26": 25.0,    // Tortank
  "27": 300.0,   // Dracaufeu
  "28": 17.75,   // Florizarre (fallback: lowest FR NM, De affiché en £15)
  "29": 0.49,    // Faux Professeur Chen
  "30": 10.0,    // Léviator obscur
  "31": 1.0,     // Et voilà les Team Rocket !
  "32": 4.9,     // Électhor de Rocket
  "33": 35.0,    // Pikachu de ____
  "34": 1.0,     // Mélo
  "35": 70.0,    // Magicarpe Brillant
  "36": 1.5,     // Groudon de Team Magma
  "37": 0.2,     // Admin Rocket
  "38": 42.0,    // Mew ex
  "39": 70.0,    // Gardevoir ex δ
  "40": 375.0,   // Noctali ☆
  "41": 0.35,    // Kaorine
  "42": 3.6,     // Luxray GL NIV.X
  "43": 17.0,    // Carchacrok C NIV.X
  "44": 3.0,     // Donphan
  "45": 17.0,    // Reshiram
  "46": 18.0,    // Zekrom
  "47": 17.0,    // Mewtwo-EX
  "48": 6.0,     // Xerneas-EX
  "49": 80.0,    // M-Rayquaza-EX
  "50": 8.99,    // Tokopiyon-GX
};

async function main() {
  const cards = await prisma.card.findMany({
    where: {
      serie: { slug: "celebrations" },
      number: { in: Object.keys(PRICES_FR) },
    },
    select: { id: true, number: true, name: true, priceFr: true },
    orderBy: { number: "asc" },
  });
  console.log(`📦 ${cards.length} cartes Celebrations ciblées\n`);

  if (cards.length !== Object.keys(PRICES_FR).length) {
    console.warn(
      `⚠ attendu ${Object.keys(PRICES_FR).length} cartes, trouvé ${cards.length}`
    );
  }

  console.log("Récap :");
  for (const c of cards) {
    const newPrice = PRICES_FR[c.number];
    const oldStr = c.priceFr != null ? `${c.priceFr.toFixed(2)}€` : "null";
    const arrow = c.priceFr !== newPrice ? "→" : "=";
    console.log(
      `   #${c.number.padStart(3)} ${c.name.padEnd(42).slice(0, 42)} ${oldStr.padStart(8)} ${arrow} ${newPrice.toFixed(2)}€`
    );
  }

  if (DRY_RUN) {
    console.log("\n(dry-run : rien écrit en DB)");
    await prisma.$disconnect();
    return;
  }

  console.log("\n💾 Écriture DB…");
  const now = new Date();
  const recordedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let updated = 0;
  for (const c of cards) {
    const priceFr = PRICES_FR[c.number];
    await prisma.card.update({
      where: { id: c.id },
      data: { priceFr, priceFrUpdatedAt: now },
    });
    await prisma.cardPriceHistory.upsert({
      where: { cardId_recordedAt: { cardId: c.id, recordedAt } },
      create: {
        cardId: c.id,
        price: priceFr,
        priceFr,
        source: "cardmarket-manual-fr",
        recordedAt,
      },
      update: { priceFr },
    });
    updated++;
  }
  console.log(`✅ ${updated} cartes mises à jour`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
