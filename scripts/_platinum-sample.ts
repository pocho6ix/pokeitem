import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
const prisma = new PrismaClient();

async function main() {
  const series = await prisma.serie.findMany({
    where: { bloc: { name: "Platine" } },
    select: { slug: true, name: true, _count: { select: { cards: true } } },
    orderBy: { slug: "asc" },
  });
  console.log("=== Séries du bloc Platine ===");
  for (const s of series) console.log(`  ${s.slug.padEnd(35)} ${s.name.padEnd(35)} ${s._count.cards} cartes`);

  const cards = await prisma.card.findMany({
    where: { serie: { bloc: { name: "Platine" } }, cardmarketUrl: { not: null } },
    select: {
      number: true, name: true, cardmarketUrl: true, rarity: true,
      serie: { select: { slug: true } },
    },
    orderBy: [{ serie: { slug: "asc" } }, { number: "asc" }],
  });

  const perSerie = new Map<string, {
    episode: Set<string>; codes: Set<string>; samples: string[];
    padded: number; unpadded: number; hasLang: number; noLang: number;
  }>();

  for (const c of cards) {
    const url = c.cardmarketUrl!;
    const [path, q] = url.split("?");
    const slash = path.indexOf("/");
    if (slash < 0) continue;
    const episode = path.slice(0, slash);
    const rest = path.slice(slash + 1);
    const m = rest.match(/^(.+?)(?:-V\d+)?-([A-Z]{2,})(\w+)$/);
    if (!m) continue;
    const code = m[2];
    const numDigits = m[3];

    const t = perSerie.get(c.serie.slug) ?? {
      episode: new Set(), codes: new Set(), samples: [],
      padded: 0, unpadded: 0, hasLang: 0, noLang: 0,
    };
    t.episode.add(episode);
    t.codes.add(code);
    if (t.samples.length < 2) t.samples.push(url);
    if (numDigits.startsWith("0")) t.padded++; else t.unpadded++;
    if (q === "language=2") t.hasLang++; else t.noLang++;
    perSerie.set(c.serie.slug, t);
  }

  console.log(`\n=== ${cards.length} cartes Platine avec URL ===\n`);
  console.log("Série                             Episode(s)                    Code(s)            Pad  Unp  Lang  NoL  Sample");
  console.log("─".repeat(150));
  for (const [slug, t] of [...perSerie.entries()].sort()) {
    console.log(
      `  ${slug.padEnd(32)} ` +
      `${[...t.episode].join(",").padEnd(30)} ` +
      `${[...t.codes].join(",").padEnd(18)} ` +
      `${String(t.padded).padStart(4)} ${String(t.unpadded).padStart(4)} ` +
      `${String(t.hasLang).padStart(5)} ${String(t.noLang).padStart(4)}  ` +
      `${t.samples[0]}`
    );
  }

  // Collision groups
  const groups = new Map<string, typeof cards>();
  for (const c of cards) {
    const m = c.cardmarketUrl!.match(/\/(.+?)(?:-V\d+)?-[A-Z]{2,}\w+/);
    if (!m) continue;
    const base = m[1];
    const key = `${c.serie.slug}|${base}`;
    const g = groups.get(key) ?? [];
    g.push(c);
    groups.set(key, g);
  }

  console.log("\n=== Platine: groupes 3+ cartes ===");
  let three = 0;
  for (const [key, g] of [...groups.entries()].sort()) {
    if (g.length < 3) continue;
    three++;
    const [slug, base] = key.split("|");
    const sorted = [...g].sort((a, b) => (parseInt(a.number, 10) || 0) - (parseInt(b.number, 10) || 0));
    console.log(`  [${g.length}] ${slug.padEnd(22)} ${base.padEnd(22)}: ${sorted.map(c => `#${c.number}/${c.rarity?.slice(0, 6)}`).join(", ")}`);
  }
  console.log(`  (total groupes 3+: ${three})`);

  console.log("\n=== Platine: groupes 2 cartes par série ===");
  const twoCount = new Map<string, number>();
  for (const [key, g] of groups) {
    if (g.length !== 2) continue;
    const slug = key.split("|")[0];
    twoCount.set(slug, (twoCount.get(slug) ?? 0) + 1);
  }
  for (const [slug, n] of [...twoCount.entries()].sort()) {
    console.log(`  ${slug.padEnd(35)} ${n}`);
  }

  // Ghost V-rank singletons
  console.log("\n=== Platine: singletons avec V-rank (ghost) ===");
  let ghosts = 0;
  for (const [key, g] of groups) {
    if (g.length !== 1) continue;
    if (/-V\d+-/.test(g[0].cardmarketUrl!)) {
      ghosts++;
      if (ghosts <= 15) console.log(`  ${key.padEnd(55)} #${g[0].number.padEnd(5)} ${g[0].cardmarketUrl}`);
    }
  }
  console.log(`  (total: ${ghosts})`);

  // Rarities distribution
  console.log("\n=== Platine: rarités ===");
  const rarities = new Map<string, number>();
  for (const c of cards) rarities.set(c.rarity ?? "NULL", (rarities.get(c.rarity ?? "NULL") ?? 0) + 1);
  for (const [r, n] of [...rarities.entries()].sort()) console.log(`  ${r.padEnd(20)} ${n}`);

  // LV.X cards (Platinum era special)
  console.log("\n=== Platine: LV.X cards (Pokémon LV.X) ===");
  const lvxCards = cards.filter(c => /lv.?x/i.test(c.name) || /-lv-x-/i.test(c.cardmarketUrl ?? ""));
  for (const c of lvxCards.slice(0, 20)) {
    console.log(`  ${c.serie.slug.padEnd(22)} #${c.number.padEnd(5)} [${c.rarity?.padEnd(12)}] ${c.name.padEnd(30)} ${c.cardmarketUrl}`);
  }
  console.log(`  (total: ${lvxCards.length})`);

  // Cross-serie URL anomalies (HGSS had 39)
  const expected: Record<string, string[]> = {};
  for (const [slug, t] of perSerie.entries()) {
    // most common episode for this series
    expected[slug] = [...t.episode];
  }
  console.log("\n=== Platine: échantillon cartes singletons vs 2-card par série ===");
  const seenSingleton = new Set<string>();
  const seenPair = new Set<string>();
  for (const [key, g] of [...groups.entries()].sort()) {
    const slug = key.split("|")[0];
    if (g.length === 1 && !seenSingleton.has(slug)) {
      seenSingleton.add(slug);
      console.log(`  SINGLE ${slug.padEnd(22)} #${g[0].number.padEnd(5)} ${g[0].name.padEnd(25)} ${g[0].cardmarketUrl}`);
    }
    if (g.length === 2 && !seenPair.has(slug)) {
      seenPair.add(slug);
      const sorted = [...g].sort((a, b) => (parseInt(a.number, 10) || 0) - (parseInt(b.number, 10) || 0));
      for (const c of sorted) console.log(`  PAIR   ${slug.padEnd(22)} #${c.number.padEnd(5)} ${c.name.padEnd(25)} ${c.cardmarketUrl}`);
    }
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
