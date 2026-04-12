import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })
const p = new PrismaClient()
async function main() {
  const [withUrl, missing, total, withHistory] = await Promise.all([
    p.card.count({ where: { cardmarketUrl: { not: null } } }),
    p.card.count({ where: { cardmarketId: { not: null }, cardmarketUrl: null } }),
    p.card.count({ where: { cardmarketId: { not: null } } }),
    p.cardPriceHistory.count(),
  ])
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  const needsHistory = await p.card.count({
    where: {
      cardmarketId: { not: null },
      priceHistory: { none: { recordedAt: { lte: oneYearAgo } } },
    },
  })
  console.log("\n── Slugs cardmarket ──────────────────")
  console.log(`✅ avec URL    : ${withUrl} / ${total}`)
  console.log(`❌ sans URL    : ${missing}`)
  console.log(`📊 progression : ${((withUrl / total) * 100).toFixed(1)}%`)
  console.log("\n── Historique de prix ────────────────")
  console.log(`📈 points total : ${withHistory.toLocaleString()}`)
  console.log(`⏳ cartes restantes (backfill complet) : ${needsHistory}`)
  await p.$disconnect()
}
main().catch(console.error)
