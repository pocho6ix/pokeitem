/**
 * One-shot audit script: gathers counts for docs/audit-items.md.
 * Usage: npx tsx scripts/audit-items-report.ts
 */
import { PrismaClient, ItemType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [
    totalItems,
    totalSeries,
    totalBlocs,
    totalPriceHistory,
    withImage,
    withCmUrl,
    withCmId,
    withCurrentPrice,
    withPriceFrom,
    withLastScrape,
    byType,
  ] = await Promise.all([
    prisma.item.count(),
    prisma.serie.count(),
    prisma.bloc.count(),
    prisma.priceHistory.count(),
    prisma.item.count({ where: { AND: [{ imageUrl: { not: null } }, { NOT: { imageUrl: "" } }] } }),
    prisma.item.count({ where: { AND: [{ cardmarketUrl: { not: null } }, { NOT: { cardmarketUrl: "" } }] } }),
    prisma.item.count({ where: { cardmarketId: { not: null } } }),
    prisma.item.count({ where: { currentPrice: { not: null } } }),
    prisma.item.count({ where: { priceFrom: { not: null } } }),
    prisma.item.count({ where: { lastScrapedAt: { not: null } } }),
    prisma.item.groupBy({ by: ["type"], _count: { _all: true } }),
  ]);

  const bySerie = await prisma.item.groupBy({ by: ["serieId"], _count: { _all: true } });
  const series = await prisma.serie.findMany({ select: { id: true, name: true, slug: true, blocId: true } });
  const blocs = await prisma.bloc.findMany({ select: { id: true, name: true, slug: true } });
  const serieById = new Map(series.map((s) => [s.id, s]));
  const blocById = new Map(blocs.map((b) => [b.id, b]));

  const perBloc: Record<string, number> = {};
  for (const row of bySerie) {
    const s = serieById.get(row.serieId);
    if (!s) continue;
    const blocName = blocById.get(s.blocId)?.name ?? "?";
    perBloc[blocName] = (perBloc[blocName] ?? 0) + row._count._all;
  }

  console.log("=== COUNTS ===");
  console.log({
    totalItems,
    totalSeries,
    totalBlocs,
    totalPriceHistory,
    withImage,
    withCmUrl,
    withCmId,
    withCurrentPrice,
    withPriceFrom,
    withLastScrape,
  });

  console.log("\n=== BY TYPE ===");
  for (const t of byType.sort((a, b) => b._count._all - a._count._all)) {
    console.log(`${t.type}: ${t._count._all}`);
  }

  console.log("\n=== BY BLOC ===");
  for (const [name, n] of Object.entries(perBloc).sort((a, b) => b[1] - a[1])) {
    console.log(`${name}: ${n}`);
  }

  console.log("\n=== TOP 20 SERIES BY ITEM COUNT ===");
  const topSeries = bySerie
    .map((r) => ({ name: serieById.get(r.serieId)?.name ?? r.serieId, n: r._count._all }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 20);
  for (const s of topSeries) console.log(`${s.name}: ${s.n}`);

  // Items missing image / cm / price
  console.log("\n=== MISSING FIELDS (counts) ===");
  console.log(`missing_image: ${totalItems - withImage}`);
  console.log(`missing_cardmarket_url: ${totalItems - withCmUrl}`);
  console.log(`missing_current_price: ${totalItems - withCurrentPrice}`);

  // Duplicates / naming inconsistencies: look for identical (serieId, type) pairs with multiple items
  const dupes = await prisma.$queryRaw<Array<{ serieid: string; type: ItemType; n: number }>>`
    SELECT "serieId" AS serieid, type, COUNT(*)::int AS n
    FROM items
    GROUP BY "serieId", type
    HAVING COUNT(*) > 1
    ORDER BY n DESC
    LIMIT 20;
  `;
  console.log("\n=== SERIE + TYPE DUPLICATES (top 20) ===");
  for (const d of dupes) {
    const s = serieById.get(d.serieid);
    console.log(`${s?.name ?? d.serieid} / ${d.type}: ${d.n}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
