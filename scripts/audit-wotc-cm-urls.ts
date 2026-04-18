/**
 * Read-only audit of current Cardmarket URLs on the Wizards bloc.
 * Groups URLs by set code / pattern so we can decide what the fix script
 * will need to handle.
 *
 * Usage: npx tsx scripts/audit-wotc-cm-urls.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cards = await prisma.card.findMany({
    where: { serie: { bloc: { slug: "wotc" } } },
    select: {
      id: true,
      number: true,
      name: true,
      rarity: true,
      cardmarketUrl: true,
      serie: { select: { slug: true, name: true } },
    },
    orderBy: [{ serie: { slug: "asc" } }, { number: "asc" }],
  });

  console.log(`\n📦 ${cards.length} cartes Wizards au total\n`);

  const withUrl = cards.filter((c) => c.cardmarketUrl);
  const withoutUrl = cards.filter((c) => !c.cardmarketUrl);

  console.log(`  avec URL : ${withUrl.length}`);
  console.log(`  sans URL : ${withoutUrl.length}\n`);

  // ── Per-serie ──────────────────────────────────────────────────────────
  const perSerie = new Map<string, { total: number; withUrl: number }>();
  for (const c of cards) {
    const t = perSerie.get(c.serie.slug) ?? { total: 0, withUrl: 0 };
    t.total++;
    if (c.cardmarketUrl) t.withUrl++;
    perSerie.set(c.serie.slug, t);
  }
  console.log("Série                          Total   Avec URL");
  console.log("─".repeat(54));
  for (const [slug, t] of [...perSerie.entries()].sort()) {
    console.log(`  ${slug.padEnd(30)}  ${String(t.total).padStart(5)}  ${String(t.withUrl).padStart(9)}`);
  }

  // ── Episode prefixes + patterns ────────────────────────────────────────
  const episodeCount = new Map<string, number>();
  const byPattern = new Map<string, typeof withUrl>();

  for (const c of withUrl) {
    const url = c.cardmarketUrl!;
    const [path] = url.split("?");
    const slash = path.indexOf("/");
    const ep = slash > 0 ? path.slice(0, slash) : "(no-slash)";
    episodeCount.set(ep, (episodeCount.get(ep) ?? 0) + 1);

    const rest = slash > 0 ? path.slice(slash + 1) : path;
    let pattern: string;
    if (/-([A-Z]{1,4})(\d+)$/.test(rest)) pattern = "name-CODE+digits";
    else if (/-V\d+$/.test(rest)) pattern = "name-Vn";
    else if (/\d+$/.test(rest))  pattern = "name-trailing-digits";
    else pattern = "bare-name";
    if (!byPattern.has(pattern)) byPattern.set(pattern, []);
    byPattern.get(pattern)!.push(c);
  }

  console.log("\nEpisode prefixes (path[0]) :");
  for (const [ep, n] of [...episodeCount.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${ep.padEnd(32)}  ${String(n).padStart(5)}`);
  }

  console.log("\nPatterns :");
  for (const [p, list] of [...byPattern.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${p.padEnd(26)}  ${String(list.length).padStart(5)}`);
  }

  // ── Sample 3 URLs per (episode, pattern) combo ─────────────────────────
  console.log("\n─── Échantillon par (episode, pattern) ─────────────────────");
  const bucket = new Map<string, typeof withUrl>();
  for (const c of withUrl) {
    const url = c.cardmarketUrl!;
    const [path] = url.split("?");
    const slash = path.indexOf("/");
    const ep = slash > 0 ? path.slice(0, slash) : "?";
    const rest = slash > 0 ? path.slice(slash + 1) : path;
    let pattern: string;
    if (/-([A-Z]{1,4})(\d+)$/.test(rest)) pattern = "name-CODE+digits";
    else if (/-V\d+$/.test(rest)) pattern = "name-Vn";
    else if (/\d+$/.test(rest))   pattern = "name-trailing-digits";
    else                          pattern = "bare-name";
    const key = `${ep} :: ${pattern}`;
    if (!bucket.has(key)) bucket.set(key, []);
    bucket.get(key)!.push(c);
  }
  for (const [key, list] of [...bucket.entries()].sort()) {
    console.log(`\n${key}  (${list.length})`);
    for (const c of list.slice(0, 3)) {
      console.log(`  ${c.serie.slug} #${c.number} ${c.name}`);
      console.log(`    → ${c.cardmarketUrl}`);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
