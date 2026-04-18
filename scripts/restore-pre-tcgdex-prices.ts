/**
 * restore-pre-tcgdex-prices.ts
 *
 * The TCGdex backfill (backfill-tcgdex-price-history.ts) overwrote
 * Card.price / Card.priceFr / Card.priceReverse with TCGdex Cardmarket
 * "trend" values. Those values are often wrong / stale compared to the
 * previous daily scrape of Cardmarket FR NM prices.
 *
 * This script restores each affected Card's live price fields to the most
 * recent CardPriceHistory entry whose source is NOT tcgdex/tcgdex-reverse
 * and whose priceFr is non-null — i.e. the last known genuine Cardmarket
 * FR NM snapshot, which was what the UI used to display.
 *
 * Scope: same cards the backfill touched (tcgdexId present, set not sv/me,
 * not -1ed placeholder). Cards that never had a prior priceFr are skipped.
 *
 * Usage:
 *   npx tsx scripts/restore-pre-tcgdex-prices.ts --dry-run
 *   npx tsx scripts/restore-pre-tcgdex-prices.ts
 */

import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes("--dry-run")

const SCRAPER_PREFIXES = ["sv", "me"]

function eligible(tcgdexId: string | null): boolean {
  if (!tcgdexId) return false
  if (tcgdexId.endsWith("-1ed")) return false
  if (SCRAPER_PREFIXES.some(p => tcgdexId.startsWith(p))) return false
  return true
}

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN — aucune écriture\n" : "⚡ Live run\n")

  const cards = await prisma.card.findMany({
    where: { tcgdexId: { not: null } },
    select: { id: true, tcgdexId: true, price: true, priceFr: true, priceReverse: true },
  })

  const scope = cards.filter(c => eligible(c.tcgdexId))
  console.log(`Cartes dans le scope du backfill : ${scope.length}\n`)

  let restored = 0
  let skippedNoHistory = 0
  let unchanged = 0

  const BATCH = 50

  for (let i = 0; i < scope.length; i += BATCH) {
    const batch = scope.slice(i, i + BATCH)

    await Promise.all(batch.map(async (card) => {
      const prev = await prisma.cardPriceHistory.findFirst({
        where: {
          cardId:  card.id,
          source:  { notIn: ["tcgdex", "tcgdex-reverse"] },
          priceFr: { not: null },
        },
        orderBy: { recordedAt: "desc" },
        select: { price: true, priceFr: true, priceReverse: true, recordedAt: true, source: true },
      })

      if (!prev) { skippedNoHistory++; return }

      const newPrice        = prev.price
      const newPriceFr      = prev.priceFr
      const newPriceReverse = prev.priceReverse

      // Nothing changed — skip the write
      if (
        card.price        === newPrice &&
        card.priceFr      === newPriceFr &&
        card.priceReverse === newPriceReverse
      ) { unchanged++; return }

      if (!DRY_RUN) {
        await prisma.card.update({
          where: { id: card.id },
          data: {
            price:        newPrice,
            priceFr:      newPriceFr,
            priceReverse: newPriceReverse,
          },
        })
      }
      restored++
    }))

    if ((i / BATCH) % 20 === 0) {
      process.stdout.write(`  ${i + batch.length}/${scope.length}…\r`)
    }
  }

  console.log(`\n${"─".repeat(50)}`)
  console.log(`✅ Cartes restaurées           : ${restored}`)
  console.log(`   Déjà alignées (rien à faire): ${unchanged}`)
  console.log(`   Aucun historique FR          : ${skippedNoHistory}`)
  if (DRY_RUN) console.log("   (dry-run — aucune écriture)")

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
