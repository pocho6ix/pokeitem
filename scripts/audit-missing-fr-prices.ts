/**
 * audit-missing-fr-prices.ts
 *
 * Scans the target series that just got EUR prices via seed-card-prices.ts
 * and reports how many still lack a French-specific `priceFr`. These are
 * the ones we'll need to call the RapidAPI Cardmarket endpoint for once
 * the monthly quota resets.
 *
 * Usage:
 *   npx tsx scripts/audit-missing-fr-prices.ts
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

const TARGET_SLUGS = [
  "diamant-et-perle",
  "tresors-mysterieux",
  "merveilles-secretes",
  "grands-envols",
  "aube-majestueuse",
  "eveil-des-legendes",
  "tempete-dp",
  "arceus",
  "heartgold-soulsilver-base",
  "dechainement",
  "indomptable",
  "triomphe",
  "alliance-infaillible",
  "harmonie-des-esprits",
  "destinees-occultes",
  "legendes-brillantes",
  "majeste-des-dragons",
  "aquapolis",
];

async function main() {
  const rows: Array<{
    bloc: string;
    serie: string;
    slug: string;
    total: number;
    withPrice: number;
    withPriceFr: number;
    needsFr: number;
  }> = [];

  for (const slug of TARGET_SLUGS) {
    const serie = await prisma.serie.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        bloc: { select: { name: true } },
      },
    });
    if (!serie) continue;

    const [total, withPrice, withPriceFr] = await Promise.all([
      prisma.card.count({ where: { serieId: serie.id } }),
      prisma.card.count({ where: { serieId: serie.id, price: { not: null } } }),
      prisma.card.count({ where: { serieId: serie.id, priceFr: { not: null } } }),
    ]);

    rows.push({
      bloc: serie.bloc.name,
      serie: serie.name,
      slug,
      total,
      withPrice,
      withPriceFr,
      needsFr: total - withPriceFr,
    });
  }

  // Group by bloc, sort by needsFr desc
  const byBloc = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!byBloc.has(r.bloc)) byBloc.set(r.bloc, []);
    byBloc.get(r.bloc)!.push(r);
  }

  let totalNeedsFr = 0;
  let totalCards = 0;
  let totalWithPrice = 0;
  let totalWithFr = 0;

  console.log("# Audit — Prix FR manquants sur les séries nouvellement imagées\n");
  for (const [bloc, list] of byBloc) {
    list.sort((a, b) => b.needsFr - a.needsFr);
    console.log(`## ${bloc}\n`);
    console.log("| Série | Total | Prix EUR | Prix FR | Manque FR |");
    console.log("|-------|-------|----------|---------|-----------|");
    for (const r of list) {
      totalCards += r.total;
      totalWithPrice += r.withPrice;
      totalWithFr += r.withPriceFr;
      totalNeedsFr += r.needsFr;
      console.log(`| ${r.serie} | ${r.total} | ${r.withPrice} | ${r.withPriceFr} | **${r.needsFr}** |`);
    }
    console.log("");
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Total: ${totalCards} cartes`);
  console.log(`   • ${totalWithPrice} avec prix EUR (pokemontcg.io)`);
  console.log(`   • ${totalWithFr} avec prix FR (Cardmarket API)`);
  console.log(`   • ${totalNeedsFr} encore à récupérer en FR après reset du quota`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
