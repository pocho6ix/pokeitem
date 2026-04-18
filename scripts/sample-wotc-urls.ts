/**
 * Pick 10 diverse Wizards URLs for manual Cardmarket verification.
 * - 2 per set (first + collision-prone middle card), plus 2 edge cases
 *   (Base Set no-language, Aquapolis H-variant).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function pick(serieSlug: string, numbers: string[]) {
  const rows = await prisma.card.findMany({
    where: { serie: { slug: serieSlug }, number: { in: numbers } },
    select: { number: true, name: true, rarity: true, cardmarketUrl: true, serie: { select: { slug: true } } },
    orderBy: { number: "asc" },
  });
  return rows;
}

async function main() {
  const picks = [
    ...(await pick("set-de-base",   ["4", "6", "100"])),       // Dracaufeu holo #4, Chenipan #100, Alakazam #1
    ...(await pick("jungle",        ["1", "10"])),             // Clefable #1, Scyther #10
    ...(await pick("fossile",       ["1"])),                   // Ptera #1
    ...(await pick("team-rocket",   ["1"])),                   // Alakazam obscur #1
    ...(await pick("expedition",    ["1"])),                   // Alakazam #1
    ...(await pick("aquapolis",     ["1", "H01"])),            // Pharamp #1 + H01 variant
  ];

  console.log("\nVérifie ces URLs en les ouvrant sur Cardmarket :\n");
  let i = 1;
  for (const c of picks) {
    console.log(`${String(i).padStart(2)}. ${c.serie.slug} #${c.number} ${c.name}`);
    console.log(`    https://www.cardmarket.com/fr/Pokemon/Products/Singles/${c.cardmarketUrl}`);
    console.log();
    i++;
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
