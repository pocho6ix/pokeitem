import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
const prisma = new PrismaClient();

(async () => {
  // 1. Distribution: oldest price point age for each card-with-cmId
  const ageDist = await prisma.$queryRaw<Array<{ bucket: string; n: bigint }>>`
    WITH oldest AS (
      SELECT c.id, MIN(h."recordedAt") AS oldest
      FROM cards c
      JOIN card_price_history h ON h."cardId" = c.id
      WHERE c."cardmarketId" IS NOT NULL
      GROUP BY c.id
    )
    SELECT
      CASE
        WHEN oldest > NOW() - INTERVAL '30 days'  THEN '< 30d'
        WHEN oldest > NOW() - INTERVAL '90 days'  THEN '30-90d'
        WHEN oldest > NOW() - INTERVAL '180 days' THEN '90-180d'
        WHEN oldest > NOW() - INTERVAL '365 days' THEN '180-365d'
        WHEN oldest > NOW() - INTERVAL '730 days' THEN '1-2y'
        ELSE '> 2y'
      END AS bucket,
      COUNT(*)::int AS n
    FROM oldest
    GROUP BY 1
    ORDER BY 1;
  `;
  console.log("Distribution des cartes par âge de leur plus vieux point :");
  for (const r of ageDist) console.log("  " + r.bucket.padEnd(10), String(r.n));

  // 2. For cards in "recent only" bucket: how many points do they already have?
  const hist = await prisma.$queryRaw<Array<{ pts: string; n: bigint }>>`
    WITH recent_only AS (
      SELECT c.id,
        (SELECT COUNT(*) FROM card_price_history h WHERE h."cardId" = c.id) AS n_pts
      FROM cards c
      WHERE c."cardmarketId" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM card_price_history h
          WHERE h."cardId" = c.id AND h."recordedAt" <= NOW() - INTERVAL '365 days'
        )
    )
    SELECT
      CASE
        WHEN n_pts = 0 THEN '0 (aucune)'
        WHEN n_pts = 1 THEN '1'
        WHEN n_pts BETWEEN 2 AND 5 THEN '2-5'
        WHEN n_pts BETWEEN 6 AND 20 THEN '6-20'
        WHEN n_pts BETWEEN 21 AND 100 THEN '21-100'
        WHEN n_pts BETWEEN 101 AND 500 THEN '101-500'
        ELSE '501+'
      END AS pts,
      COUNT(*)::int AS n
    FROM recent_only
    GROUP BY 1
    ORDER BY
      MIN(CASE
        WHEN n_pts = 0 THEN 0
        WHEN n_pts = 1 THEN 1
        WHEN n_pts BETWEEN 2 AND 5 THEN 2
        WHEN n_pts BETWEEN 6 AND 20 THEN 3
        WHEN n_pts BETWEEN 21 AND 100 THEN 4
        WHEN n_pts BETWEEN 101 AND 500 THEN 5
        ELSE 6
      END);
  `;
  console.log("\nCartes 'sans point > 1 an' — distribution du nombre de points déjà présents :");
  for (const r of hist) console.log("  " + r.pts.padEnd(12), String(r.n));

  // 3. Integrity check: compound unique (cardId, recordedAt)
  const dupes = await prisma.$queryRaw<Array<{ total: bigint; unique_pairs: bigint }>>`
    SELECT
      COUNT(*)::bigint AS total,
      COUNT(DISTINCT ("cardId", "recordedAt"))::bigint AS unique_pairs
    FROM card_price_history
  `;
  const d = dupes[0];
  console.log("\nIntégrité CardPriceHistory :");
  console.log("  Total lignes        :", String(d.total));
  console.log("  Pairs uniques       :", String(d.unique_pairs));
  console.log(
    "  Doublons détectés   :",
    d.total === d.unique_pairs ? "0 (contrainte unique OK)" : String(d.total - d.unique_pairs),
  );

  await prisma.$disconnect();
})();
