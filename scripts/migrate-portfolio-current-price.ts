/**
 * migrate-portfolio-current-price.ts
 *
 * One-shot migration for the "currentPrice is per-user, not shared" bug.
 *
 * Background
 * ----------
 * Before this patch, `POST /api/portfolio/valuation` wrote the manually-entered
 * "current price" into the shared `Item.currentPrice` column. Any user editing
 * their own holding silently clobbered the displayed value for every other user
 * owning the same product.
 *
 * The schema patch moves the personal value onto `PortfolioItem.currentPrice`
 * (per-user row). This script backfills that new column from the existing
 * per-user `ManualValuation` ledger (which always correctly carried userId),
 * then blanks out the polluted shared column.
 *
 * Steps
 * -----
 *   1. Assume `prisma db push` has already added the new columns. Run
 *      `--verify-schema` first to fail-fast if not.
 *   2. For every (user, item) pair with ≥1 ManualValuation, set the matching
 *      PortfolioItem.currentPrice to the most recent valuation's price, and
 *      currentPriceUpdatedAt to its date.
 *   3. Reset `Item.currentPrice = NULL` across the catalogue so the stale
 *      cross-user pollution is gone. (Item.priceTrend / priceFrom are left
 *      alone — those come from CM scraping and are legitimately shared.)
 *
 * Safety
 * ------
 * Idempotent: running twice is a no-op. Skips PortfolioItems whose currentPrice
 * is already set (treats them as authoritative).
 *
 * Usage
 *   npx tsx scripts/migrate-portfolio-current-price.ts --dry-run
 *   npx tsx scripts/migrate-portfolio-current-price.ts --apply
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma = new PrismaClient();
const APPLY  = process.argv.includes("--apply");

async function main() {
  console.log(APPLY ? "✏️  APPLY mode" : "🔍 DRY RUN (use --apply to write)");

  // ── Step 1: schema sanity check ───────────────────────────────────────
  //   If the new columns don't exist yet, `prisma db push` hasn't been run.
  //   Fail fast rather than silently writing nothing.
  try {
    await prisma.$queryRawUnsafe(
      `SELECT "currentPrice", "currentPriceUpdatedAt" FROM portfolio_items LIMIT 1`
    );
  } catch (err) {
    console.error("❌ Colonnes PortfolioItem.currentPrice absentes de la DB.");
    console.error("   → Exécute d'abord : npx prisma db push");
    console.error("   Détail :", (err as Error).message);
    process.exit(1);
  }
  console.log("✓ Schéma OK (colonnes présentes)\n");

  // ── Step 2: backfill per-user currentPrice from latest ManualValuation ─
  const valuations = await prisma.manualValuation.findMany({
    orderBy: { date: "desc" },
    select: { userId: true, itemId: true, price: true, date: true },
  });

  // Keep only the most recent per (userId, itemId)
  const latest = new Map<string, { price: number; date: Date }>();
  for (const v of valuations) {
    const key = `${v.userId}|${v.itemId}`;
    if (!latest.has(key)) latest.set(key, { price: v.price, date: v.date });
  }
  console.log(`📜 ${valuations.length} valuations → ${latest.size} (user,item) pairs uniques`);

  // Find matching PortfolioItems that don't yet have a currentPrice set
  let backfilled = 0;
  let skippedNoMatch = 0;
  let skippedAlreadySet = 0;

  for (const [key, v] of latest) {
    const [userId, itemId] = key.split("|");
    const portfolioItem = await prisma.portfolioItem.findFirst({
      where: { userId, itemId },
      select: { id: true, currentPrice: true },
    });

    if (!portfolioItem) { skippedNoMatch++; continue; }
    if (portfolioItem.currentPrice != null) { skippedAlreadySet++; continue; }

    if (APPLY) {
      await prisma.portfolioItem.update({
        where: { id: portfolioItem.id },
        data: { currentPrice: v.price, currentPriceUpdatedAt: v.date },
      });
    }
    backfilled++;
  }

  console.log(`\n🔁 Backfill PortfolioItem.currentPrice :`);
  console.log(`   ${backfilled} lignes ${APPLY ? "mises à jour" : "seraient mises à jour"}`);
  console.log(`   ${skippedAlreadySet} ignorées (currentPrice déjà défini)`);
  console.log(`   ${skippedNoMatch} valuations orphelines (user n'a plus l'item en collection)`);

  // ── Step 3: reset polluted shared Item.currentPrice ──────────────────
  const polluted = await prisma.item.count({ where: { currentPrice: { not: null } } });
  console.log(`\n🧹 Reset Item.currentPrice :`);
  console.log(`   ${polluted} items avec currentPrice ≠ null`);

  if (APPLY && polluted > 0) {
    const result = await prisma.item.updateMany({
      where: { currentPrice: { not: null } },
      data:  { currentPrice: null, priceUpdatedAt: null },
    });
    console.log(`   ✓ ${result.count} Item.currentPrice remis à null`);
  } else if (!APPLY) {
    console.log(`   (serait remis à null)`);
  }

  console.log(APPLY ? "\n✅ Migration terminée." : "\n(dry-run — relancer avec --apply)");
  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
