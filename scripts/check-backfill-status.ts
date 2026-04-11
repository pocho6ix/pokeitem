import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })

const prisma = new PrismaClient()
const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

async function main() {
  const [total, backfilled, withHistory, totalPoints] = await Promise.all([
    prisma.card.count({ where: { cardmarketId: { not: null } } }),
    prisma.card.count({ where: { cardmarketId: { not: null }, priceHistory: { some: { recordedAt: { lte: oneYearAgo } } } } }),
    prisma.card.count({ where: { cardmarketId: { not: null }, priceHistory: { some: {} } } }),
    prisma.cardPriceHistory.count(),
  ])
  console.log("─────────────────────────────────────")
  console.log("Backfill status —", new Date().toLocaleString("fr-FR"))
  console.log("─────────────────────────────────────")
  console.log(`Total cartes avec cardmarketId : ${total}`)
  console.log(`Backfillées (≥1 point > 1 an)  : ${backfilled}`)
  console.log(`Avec au moins 1 point           : ${withHistory}`)
  console.log(`Restantes à backfiller          : ${total - backfilled}`)
  console.log(`Progression                     : ${((backfilled / total) * 100).toFixed(1)}%`)
  console.log(`Total points historique en DB   : ${totalPoints.toLocaleString("fr-FR")}`)
  console.log("─────────────────────────────────────")
  await prisma.$disconnect()
}

main().catch(console.error)
