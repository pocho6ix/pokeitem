import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
const prisma = new PrismaClient();

async function main() {
  // Cross-series URL weirdness: what's happening with Nidoran TM070?
  console.log("=== Nidoran TM070 / dechainement + triomphe ===");
  const nidorans = await prisma.card.findMany({
    where: {
      serie: { bloc: { name: "HeartGold SoulSilver" } },
      name: { contains: "Nidoran" },
    },
    select: {
      number: true, name: true, cardmarketUrl: true, rarity: true,
      serie: { select: { slug: true, name: true } },
    },
    orderBy: [{ serie: { slug: "asc" } }, { number: "asc" }],
  });
  for (const c of nidorans) console.log(`  ${c.serie.slug.padEnd(22)} #${c.number.padEnd(5)} [${c.rarity}] ${c.name.padEnd(20)} ${c.cardmarketUrl}`);

  console.log("\n=== Alph lithographs ===");
  const alphs = await prisma.card.findMany({
    where: {
      serie: { bloc: { name: "HeartGold SoulSilver" } },
      name: { contains: "lithograph", mode: "insensitive" },
    },
    select: {
      number: true, name: true, cardmarketUrl: true, rarity: true,
      serie: { select: { slug: true } },
    },
    orderBy: [{ serie: { slug: "asc" } }, { number: "asc" }],
  });
  for (const c of alphs) console.log(`  ${c.serie.slug.padEnd(22)} #${c.number.padEnd(6)} [${c.rarity}] ${c.name.padEnd(30)} ${c.cardmarketUrl}`);

  // Crobat: dechainement UL084 & triomphe UL014 — look at both in full context
  console.log("\n=== Crobat UL014 / UL084 ===");
  const crobats = await prisma.card.findMany({
    where: {
      serie: { bloc: { name: "HeartGold SoulSilver" } },
      name: { contains: "Crobat" },
    },
    select: {
      number: true, name: true, cardmarketUrl: true, rarity: true,
      serie: { select: { slug: true } },
    },
    orderBy: [{ serie: { slug: "asc" } }, { number: "asc" }],
  });
  for (const c of crobats) console.log(`  ${c.serie.slug.padEnd(22)} #${c.number.padEnd(5)} [${c.rarity}] ${c.name.padEnd(20)} ${c.cardmarketUrl}`);

  // How many cards have an URL whose episode doesn't match the serie's "expected" episode?
  // Expected mapping: hgss-base=HS, dechainement=UL, indomptable=UD, triomphe=TM
  console.log("\n=== HGSS: cartes avec épisode non-canonique ===");
  const expected: Record<string, string[]> = {
    "heartgold-soulsilver-base": ["Heartgold-Soulsilver"],
    "dechainement":              ["Hs-Unleashed"],
    "indomptable":               ["Hs-Undaunted"],
    "triomphe":                  ["Hs-Triumphant"],
  };
  const allCards = await prisma.card.findMany({
    where: {
      serie: { bloc: { name: "HeartGold SoulSilver" } },
      cardmarketUrl: { not: null },
    },
    select: {
      number: true, name: true, cardmarketUrl: true,
      serie: { select: { slug: true } },
    },
    orderBy: [{ serie: { slug: "asc" } }, { number: "asc" }],
  });
  let weird = 0;
  for (const c of allCards) {
    const slash = c.cardmarketUrl!.indexOf("/");
    const ep = c.cardmarketUrl!.slice(0, slash);
    const exp = expected[c.serie.slug];
    if (!exp || !exp.includes(ep)) {
      weird++;
      if (weird <= 20) console.log(`  ${c.serie.slug.padEnd(22)} #${c.number.padEnd(5)} ${c.name.padEnd(25)} ${c.cardmarketUrl}`);
    }
  }
  console.log(`  (total anomalies: ${weird})`);

  // LEGEND cards are typically 2-part (top & bottom halves) in HGSS
  console.log("\n=== HGSS: cartes LEGEND (Entei-raikou etc.) ===");
  const legendBases = ["Entei", "Raikou", "Suicune", "Ho-Oh", "Lugia", "Kyogre", "Groudon", "Palkia", "Dialga", "Rayquaza", "Deoxys"];
  const legends = await prisma.card.findMany({
    where: {
      serie: { bloc: { name: "HeartGold SoulSilver" } },
      OR: legendBases.map(n => ({ name: { contains: n } })),
    },
    select: {
      number: true, name: true, cardmarketUrl: true, rarity: true,
      serie: { select: { slug: true } },
    },
    orderBy: [{ serie: { slug: "asc" } }, { number: "asc" }],
  });
  for (const c of legends) console.log(`  ${c.serie.slug.padEnd(22)} #${c.number.padEnd(5)} [${c.rarity?.padEnd(10)}] ${c.name.padEnd(30)} ${c.cardmarketUrl}`);

  // Sample: per-serie, first 3 unique singletons and one 2-card group (for anchor candidates)
  console.log("\n=== HGSS: candidats ancrages (1er singleton + 1er 2-card par série) ===");
  const groups = new Map<string, typeof allCards>();
  for (const c of allCards) {
    const m = c.cardmarketUrl!.match(/\/(.+?)(?:-V\d+)?-[A-Z]{2,}\w+/);
    if (!m) continue;
    const base = m[1];
    const key = `${c.serie.slug}|${base}`;
    const g = groups.get(key) ?? [];
    g.push(c);
    groups.set(key, g);
  }
  const seenSingleton = new Set<string>();
  const seenPair = new Set<string>();
  for (const [key, g] of [...groups.entries()].sort()) {
    const slug = key.split("|")[0];
    if (g.length === 1 && !seenSingleton.has(slug)) {
      seenSingleton.add(slug);
      console.log(`  SINGLETON ${slug.padEnd(22)} #${g[0].number.padEnd(5)} ${g[0].name.padEnd(25)} ${g[0].cardmarketUrl}`);
    }
    if (g.length === 2 && !seenPair.has(slug)) {
      seenPair.add(slug);
      const sorted = [...g].sort((a, b) => (parseInt(a.number, 10) || 0) - (parseInt(b.number, 10) || 0));
      for (const c of sorted) {
        console.log(`  PAIR      ${slug.padEnd(22)} #${c.number.padEnd(5)} ${c.name.padEnd(25)} ${c.cardmarketUrl}`);
      }
    }
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
