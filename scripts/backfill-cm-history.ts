/**
 * Backfill CM API price history into CardPriceHistory.
 *
 * For every card with a cardmarketId, fetches all historical price points
 * from the Cardmarket TCG API and upserts them into the DB.
 *
 * Usage:
 *   npx tsx scripts/backfill-cm-history.ts
 *   npx tsx scripts/backfill-cm-history.ts --dry-run
 *   npx tsx scripts/backfill-cm-history.ts --limit 500   # process only N cards
 */

import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes("--dry-run")
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="))
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1]) : undefined

// Daily API quota guard — stop before hitting RapidAPI hard limit (15 000/day)
// Override with --quota=N  (e.g. --quota=12000)
const QUOTA_ARG = process.argv.find((a) => a.startsWith("--quota="))
const DAILY_QUOTA = QUOTA_ARG ? parseInt(QUOTA_ARG.split("=")[1]) : 13_500
let apiCallCount = 0

const HOST = "cardmarket-api-tcg.p.rapidapi.com"
const KEY = process.env.CARDMARKET_API_KEY ?? ""

if (!KEY) { console.error("❌ CARDMARKET_API_KEY is not set"); process.exit(1) }

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

interface HistoryDay { date: string; cmLow: number | null }
interface CMHistoryRaw { cm_low?: number | null }
interface FetchResult { days: HistoryDay[]; quotaExceeded: boolean }

async function fetchHistory(cmApiCardId: string): Promise<FetchResult> {
  const days: HistoryDay[] = []
  let page = 1

  while (true) {
    // Stop before hitting the hard limit
    if (apiCallCount >= DAILY_QUOTA) {
      return { days, quotaExceeded: true }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)
    try {
      const res = await fetch(
        `https://${HOST}/pokemon/cards/${cmApiCardId}/history-prices?per_page=100&page=${page}`,
        {
          headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": KEY },
          signal: controller.signal,
        }
      )
      clearTimeout(timer)
      apiCallCount++

      if (!res.ok) break

      const body = await res.json() as {
        data?: Record<string, CMHistoryRaw>
        paging?: { current: number; total: number }
      }
      for (const [date, val] of Object.entries(body.data ?? {})) {
        days.push({ date, cmLow: typeof val.cm_low === "number" ? val.cm_low : null })
      }
      const paging = body.paging
      if (!paging || paging.current >= paging.total) break
      page++
      await sleep(150)
    } catch {
      clearTimeout(timer)
      break
    }
  }

  days.sort((a, b) => a.date.localeCompare(b.date))
  return { days, quotaExceeded: false }
}

async function main() {
  console.log(DRY_RUN ? "DRY RUN — aucune écriture\n" : "")
  console.log(`Quota journalier : ${DAILY_QUOTA} appels API\n`)

  // Skip cards already backfilled (have history older than 2 days)
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  const cards = await prisma.card.findMany({
    where: {
      cardmarketId: { not: null },
      priceHistory: { none: { recordedAt: { lte: twoDaysAgo } } },
    },
    select: { id: true, cardmarketId: true },
    ...(LIMIT ? { take: LIMIT } : {}),
  })

  console.log(`${cards.length} cartes avec cardmarketId à traiter\n`)

  const BATCH = 1         // sequential — évite saturation pool Prisma
  const DELAY = 300       // ms between cards
  const CHUNK_DB = 5      // upserts per Promise.all

  let total = 0
  let totalPoints = 0
  let quotaReached = false

  for (let i = 0; i < cards.length; i += BATCH) {
    if (quotaReached) break

    const batch = cards.slice(i, i + BATCH)

    await Promise.all(
      batch.map(async (card) => {
        if (quotaReached) return

        const { days: history, quotaExceeded } = await fetchHistory(card.cardmarketId!)

        if (quotaExceeded) {
          quotaReached = true
          return
        }

        if (history.length === 0) return

        if (!DRY_RUN) {
          const upserts = history
            .filter((h) => h.cmLow != null)
            .map((h) => {
              const recordedAt = new Date(h.date)
              return prisma.cardPriceHistory.upsert({
                where: { cardId_recordedAt: { cardId: card.id, recordedAt } },
                create: {
                  cardId: card.id,
                  price: h.cmLow!,
                  priceFr: h.cmLow,
                  source: "cardmarket-api",
                  recordedAt,
                },
                update: { priceFr: h.cmLow },
              })
            })

          for (let j = 0; j < upserts.length; j += CHUNK_DB) {
            await Promise.all(upserts.slice(j, j + CHUNK_DB))
          }
        }

        total++
        totalPoints += history.length
      })
    )

    // Progress every 20 batches
    if ((i / BATCH) % 20 === 0 && i > 0) {
      const pct = ((i / cards.length) * 100).toFixed(1)
      process.stdout.write(`  ${pct}% — ${total} cartes · ${totalPoints} points · ${apiCallCount} appels API\n`)
    }

    await sleep(DELAY)
  }

  if (quotaReached) {
    console.log(`\n⚠️  Quota journalier atteint (${apiCallCount}/${DAILY_QUOTA} appels)`)
    console.log(`   ${total} cartes traitées · ${totalPoints} points insérés`)
    console.log(`   Relance demain : npx tsx scripts/backfill-cm-history.ts`)
  } else {
    console.log(`\n✅ Terminé — ${total} cartes · ${totalPoints} points d'historique · ${apiCallCount} appels API`)
  }
  if (DRY_RUN) console.log("(dry-run : rien n'a été écrit)")
  await prisma.$disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
