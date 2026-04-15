/**
 * report-backfilled-series.ts
 *
 * Lists series that got new price history rows written in the last N hours.
 * Useful after a backfill run to know which extensions are "ready" to be
 * exposed on the frontend.
 *
 * Usage:
 *   npx tsx scripts/report-backfilled-series.ts           # last 24h
 *   npx tsx scripts/report-backfilled-series.ts --hours=6
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma = new PrismaClient();
const HOURS_ARG = process.argv.find((a) => a.startsWith("--hours="));
const HOURS = HOURS_ARG ? parseInt(HOURS_ARG.split("=")[1]) : 24;

(async () => {
  const since = new Date(Date.now() - HOURS * 60 * 60 * 1000);

  // Group new history rows by series, only counting "backfill-ish" rows.
  // The daily cron writes rows with recordedAt ~= now, so anything with
  // recordedAt older than 7 days that was JUST inserted can only have come
  // from a backfill run. 7 days gives a safe buffer vs cron jitter.
  const backfillThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRaw<Array<{
    blocName: string;
    serieName: string;
    serieSlug: string;
    cardsTouched: bigint;
    pointsWritten: bigint;
    oldestNew: Date;
    newestNew: Date;
  }>>`
    SELECT
      b.name AS "blocName",
      s.name AS "serieName",
      s.slug AS "serieSlug",
      COUNT(DISTINCT h."cardId")::bigint AS "cardsTouched",
      COUNT(*)::bigint AS "pointsWritten",
      MIN(h."recordedAt") AS "oldestNew",
      MAX(h."recordedAt") AS "newestNew"
    FROM card_price_history h
    JOIN cards c ON c.id = h."cardId"
    JOIN series s ON s.id = c."serieId"
    JOIN blocs b ON b.id = s."blocId"
    WHERE h."createdAt" >= ${since}
      AND h."recordedAt" <= ${backfillThreshold}
    GROUP BY b.name, s.name, s.slug, b."order", s."order"
    ORDER BY b."order", s."order";
  `;

  if (rows.length === 0) {
    console.log(`Aucune série n'a reçu de nouveau point d'historique >1j dans les ${HOURS} dernières heures.`);
    await prisma.$disconnect();
    return;
  }

  console.log(`# Séries backfillées dans les ${HOURS} dernières heures\n`);
  console.log("| Bloc | Série | Cartes touchées | Points écrits | Plus vieux point | Plus récent |");
  console.log("|------|-------|-----------------|---------------|------------------|-------------|");

  let totalCards = 0n;
  let totalPts = 0n;
  for (const r of rows) {
    totalCards += r.cardsTouched;
    totalPts += r.pointsWritten;
    const old = r.oldestNew.toISOString().slice(0, 10);
    const recent = r.newestNew.toISOString().slice(0, 10);
    console.log(
      `| ${r.blocName} | ${r.serieName} | ${r.cardsTouched} | ${r.pointsWritten} | ${old} | ${recent} |`,
    );
  }
  console.log(`\n**Total** : ${rows.length} séries · ${totalCards} cartes · ${totalPts} points d'historique`);

  await prisma.$disconnect();
})();
