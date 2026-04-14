/**
 * audit-missing-cm-urls.ts
 *
 * Reports which cards lack `cardmarketUrl` (the Cardmarket deep-link used by
 * the "voir détails" modal). Groups by bloc → serie and also distinguishes:
 *   - cards with `cardmarketId` (can be backfilled by backfill-cm-urls.ts)
 *   - cards without `cardmarketId` (need a prior CM-API lookup first)
 *
 * Purely read-only — no API calls. Safe to run at any time.
 *
 * Usage:
 *   npx tsx scripts/audit-missing-cm-urls.ts
 *   npx tsx scripts/audit-missing-cm-urls.ts --bloc=soleil-lune   # filter one bloc
 *   npx tsx scripts/audit-missing-cm-urls.ts --full              # show all series, not just incomplete
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

const FULL = process.argv.includes("--full");
const BLOC = process.argv.find((a) => a.startsWith("--bloc="))?.split("=")[1];

interface SerieRow {
  blocName: string;
  blocSlug: string;
  blocOrder: number;
  serieName: string;
  serieSlug: string;
  serieOrder: number;
  total: number;
  withUrl: number;
  withCmId: number;
  needsUrl: number;             // total - withUrl
  canBeBackfilled: number;      // needsUrl AND has cmId
  needsCmIdFirst: number;       // needsUrl AND no cmId
}

async function main() {
  // Load all series with their blocs, filtering by --bloc if given
  const series = await prisma.serie.findMany({
    where: BLOC ? { bloc: { slug: BLOC } } : undefined,
    select: {
      id: true,
      name: true,
      slug: true,
      order: true,
      bloc: { select: { name: true, slug: true, order: true } },
    },
  });

  const rows: SerieRow[] = [];

  for (const s of series) {
    const [total, withUrl, withCmId, canBeBackfilled] = await Promise.all([
      prisma.card.count({ where: { serieId: s.id } }),
      prisma.card.count({ where: { serieId: s.id, cardmarketUrl: { not: null } } }),
      prisma.card.count({ where: { serieId: s.id, cardmarketId: { not: null } } }),
      prisma.card.count({
        where: { serieId: s.id, cardmarketUrl: null, cardmarketId: { not: null } },
      }),
    ]);

    const needsUrl = total - withUrl;
    const needsCmIdFirst = needsUrl - canBeBackfilled;

    rows.push({
      blocName: s.bloc.name,
      blocSlug: s.bloc.slug,
      blocOrder: s.bloc.order,
      serieName: s.name,
      serieSlug: s.slug,
      serieOrder: s.order,
      total,
      withUrl,
      withCmId,
      needsUrl,
      canBeBackfilled,
      needsCmIdFirst,
    });
  }

  // Group by bloc
  const byBloc = new Map<string, SerieRow[]>();
  for (const r of rows) {
    if (!byBloc.has(r.blocSlug)) byBloc.set(r.blocSlug, []);
    byBloc.get(r.blocSlug)!.push(r);
  }
  // Sort blocs by their order
  const sortedBlocs = [...byBloc.entries()].sort((a, b) => {
    const ao = a[1][0]?.blocOrder ?? 999;
    const bo = b[1][0]?.blocOrder ?? 999;
    return ao - bo;
  });

  let totalCards = 0;
  let totalWithUrl = 0;
  let totalCanBackfill = 0;
  let totalNeedCmIdFirst = 0;

  console.log("# Audit — URLs Cardmarket manquantes par série\n");
  console.log("Légende :");
  console.log("  • **Backfillable**  = `cardmarketId` présent → `backfill-cm-urls.ts` peut les traiter (appels API)");
  console.log("  • **Sans cmId**     = aucun `cardmarketId` non plus → il faut d'abord le récupérer via une autre passe\n");

  for (const [, list] of sortedBlocs) {
    list.sort((a, b) => a.serieOrder - b.serieOrder);
    const blocName = list[0].blocName;

    // In default mode only show blocs that have incomplete series
    const blocHasGaps = list.some((r) => r.needsUrl > 0);
    if (!FULL && !blocHasGaps) continue;

    console.log(`## ${blocName}\n`);
    console.log("| Série | Total | Avec URL | Manque | Backfillable | Sans cmId |");
    console.log("|-------|-------|----------|--------|--------------|-----------|");
    for (const r of list) {
      if (!FULL && r.needsUrl === 0) continue;
      totalCards += r.total;
      totalWithUrl += r.withUrl;
      totalCanBackfill += r.canBeBackfilled;
      totalNeedCmIdFirst += r.needsCmIdFirst;
      const icon = r.needsUrl === 0 ? "✅" : r.canBeBackfilled === r.needsUrl ? "🔄" : "⚠️";
      console.log(
        `| ${icon} ${r.serieName} | ${r.total} | ${r.withUrl} | **${r.needsUrl}** | ${r.canBeBackfilled} | ${r.needsCmIdFirst} |`
      );
    }
    console.log("");
  }

  // Fully complete blocs (collapsed)
  if (!FULL) {
    const completeBlocs = sortedBlocs
      .filter(([, list]) => list.every((r) => r.needsUrl === 0))
      .map(([, list]) => list[0].blocName);
    if (completeBlocs.length > 0) {
      console.log(`## Blocs 100% complets\n`);
      console.log(completeBlocs.map((b) => `- ✅ ${b}`).join("\n"));
      console.log("");
    }
  }

  const totalMissing = rows.reduce((sum, r) => sum + r.needsUrl, 0);
  const totalAll = rows.reduce((sum, r) => sum + r.total, 0);
  const pct = totalAll > 0 ? ((totalMissing / totalAll) * 100).toFixed(1) : "0";

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Total sur ${rows.length} série(s) : ${totalAll} cartes`);
  console.log(`   • ${totalAll - totalMissing} avec \`cardmarketUrl\``);
  console.log(`   • **${totalMissing}** sans URL (${pct}% des cartes)`);
  console.log(`      └─ ${totalCanBackfill} directement backfillable (cmId présent)`);
  console.log(`      └─ ${totalNeedCmIdFirst} nécessitent d'abord un lookup cmId`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
