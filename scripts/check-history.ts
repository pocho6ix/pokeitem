import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })

const prisma = new PrismaClient()

async function main() {
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

  const [totalCards, fullyBackfilled, needsBackfill, totalPoints] = await Promise.all([
    prisma.card.count({ where: { cardmarketId: { not: null } } }),
    prisma.card.count({
      where: {
        cardmarketId: { not: null },
        priceHistory: { some: { recordedAt: { lte: oneYearAgo } } },
      }
    }),
    prisma.card.count({
      where: {
        cardmarketId: { not: null },
        priceHistory: { none: { recordedAt: { lte: oneYearAgo } } },
      }
    }),
    prisma.cardPriceHistory.count(),
  ])

  console.log('Cartes avec cardmarketId :', totalCards)
  console.log('✅ Backfillées (1+ record > 1 an) :', fullyBackfilled)
  console.log('❌ À backfiller encore          :', needsBackfill)
  console.log('Points historique total          :', totalPoints)
  await prisma.$disconnect()
}
main()
