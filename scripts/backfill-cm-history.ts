/**
 * Backfill CM API price history into CardPriceHistory.
 *
 * For every card with a cardmarketId that hasn't been backfilled yet
 * (no price point older than 30 days), fetches all historical price points
 * from the Cardmarket TCG API and upserts them into the DB. As a bonus,
 * the card's current `priceFr` / `priceFrUpdatedAt` is refreshed from the
 * most recent point in the fetched history — so today's price is updated
 * on the same pass.
 *
 * Usage:
 *   npx tsx scripts/backfill-cm-history.ts
 *   npx tsx scripts/backfill-cm-history.ts --dry-run
 *   npx tsx scripts/backfill-cm-history.ts --limit 500   # process only N cards
 *   npx tsx scripts/backfill-cm-history.ts --serie=slug  # filter to one serie
 */

import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes("--dry-run")
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="))
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1]) : undefined
const SERIE_ARG = process.argv.find((a) => a.startsWith("--serie="))
const SERIE_SLUG = SERIE_ARG ? SERIE_ARG.split("=")[1] : undefined

// Daily API quota guard — RapidAPI hard limit is 15 000/day.
// Override with --quota=N  (e.g. --quota=12000 to leave headroom for the daily cron)
const QUOTA_ARG = process.argv.find((a) => a.startsWith("--quota="))
const DAILY_QUOTA = QUOTA_ARG ? parseInt(QUOTA_ARG.split("=")[1]) : 15_000
let apiCallCount = 0

const HOST = "cardmarket-api-tcg.p.rapidapi.com"
const KEY = process.env.CARDMARKET_API_KEY ?? ""

if (!KEY) { console.error("❌ CARDMARKET_API_KEY is not set"); process.exit(1) }

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Retry a Prisma operation when Neon closes the connection (P1017) or
 * refuses a new one (P1001). Tries up to `maxRetries` times with an
 * exponential backoff + explicit reconnect between attempts.
 */
async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  maxRetries = 5,
): Promise<T> {
  let attempt = 0
  while (true) {
    try {
      return await fn()
    } catch (err) {
      const code = (err as { code?: string } | null)?.code
      const isConnErr = code === "P1017" || code === "P1001" || code === "P1002"
      if (!isConnErr || attempt >= maxRetries) throw err

      attempt++
      const delay = 500 * Math.pow(2, attempt - 1) // 500, 1000, 2000, 4000, 8000
      console.log(
        `  ⚠ ${label} : ${code} (tentative ${attempt}/${maxRetries}) — reconnexion dans ${delay}ms`
      )
      await sleep(delay)
      try { await prisma.$disconnect() } catch {}
      try { await prisma.$connect() } catch {}
    }
  }
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

  // Skip cards already backfilled.
  //
  // Original heuristic ("no point older than 1 year") was too weak: cards backfilled
  // less than a year ago (when CM only returns ~12 months of history) kept being
  // re-selected every run. The API would happily return the same ~40 points, upsert
  // would no-op thanks to the (cardId, recordedAt) unique constraint, and each chunk
  // burned ~600 calls without adding any new rows.
  //
  // Tightened rule: a card is considered "already backfilled" if it has any price
  // point older than 30 days. Rationale: the daily cron only adds recent points
  // (<1 day old), so anything older than 30 days can only have been written by a
  // prior run of THIS script. Keeping 30 days as the cut-off leaves a healthy buffer
  // for brand-new imports to still get picked up.
  const backfillCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  if (SERIE_SLUG) console.log(`Filtre série : ${SERIE_SLUG}\n`)

  // Raw SQL query — the Prisma `priceHistory: { none: ... }` nested filter
  // becomes a correlated NOT EXISTS that is too slow at 1M+ history rows.
  // A LEFT JOIN + IS NULL on a pre-filtered DISTINCT cardIds set is ~10x faster.
  const serieFilterSql = SERIE_SLUG
    ? `AND c."serieId" IN (SELECT id FROM series WHERE slug = '${SERIE_SLUG.replace(/'/g, "''")}')`
    : ""
  const limitSql = LIMIT ? `LIMIT ${LIMIT}` : ""
  // A card is considered "already backfilled" if EITHER:
  //   (a) it has a history point older than 30 days  — initial criterion, or
  //   (b) it already has a `cardmarket-api` source entry within the last 7 days
  //       — protects against looping on cards where the CM API only returns
  //       recent history (no 1-year data available). Without this, those
  //       cards would be reprocessed every run forever.
  const recentBackfillCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const cards = await prisma.$queryRawUnsafe<Array<{ id: string; cardmarketId: string }>>(`
    SELECT c.id, c."cardmarketId"
    FROM cards c
    LEFT JOIN (
      SELECT DISTINCT "cardId" FROM card_price_history
      WHERE "recordedAt" <= $1
        AND source IN ('cardmarket-api', 'cardmarket-api-empty')
    ) ph_old ON ph_old."cardId" = c.id
    LEFT JOIN (
      SELECT DISTINCT "cardId" FROM card_price_history
      WHERE source IN ('cardmarket-api', 'cardmarket-api-empty') AND "createdAt" >= $2
    ) ph_recent ON ph_recent."cardId" = c.id
    WHERE c."cardmarketId" IS NOT NULL
      AND ph_old."cardId" IS NULL
      AND ph_recent."cardId" IS NULL
      ${serieFilterSql}
    ORDER BY c.id
    ${limitSql}
  `, backfillCutoff, recentBackfillCutoff)

  console.log(`${cards.length} cartes avec cardmarketId à traiter\n`)

  const BATCH = 1         // sequential — évite saturation pool Prisma
  const DELAY = 300       // ms between cards
  const CHUNK_DB = 1      // upserts fully sequential — P2024 pool-exhaustion guard

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

        // Always write an "attempt marker" sentinel (upsert keyed on cardId +
        // today 00:00) so the next-run filter excludes this card for 7 days,
        // regardless of whether the CM API returned usable history. This
        // prevents infinite looping on cards where the API returns empty
        // history OR where all days have null prices.
        const today = new Date()
        today.setUTCHours(0, 0, 0, 0)
        await withRetry(`sentinel ${card.id}`, () =>
          prisma.cardPriceHistory.upsert({
            where: { cardId_recordedAt: { cardId: card.id, recordedAt: today } },
            create: {
              cardId:     card.id,
              price:      0,
              priceFr:    null,
              source:     "cardmarket-api-empty",
              recordedAt: today,
            },
            // Bump createdAt so the filter treats this as a recent attempt.
            update: { createdAt: new Date() },
          })
        )

        if (history.length === 0) return

        // Most recent day with a usable price → used to refresh the card's
        // "current" priceFr so the rest of the app sees today's value alongside
        // the newly-imported history.
        const latestWithPrice = [...history]
          .reverse()
          .find((h) => h.cmLow != null)

        if (!DRY_RUN) {
          const points = history.filter((h) => h.cmLow != null)

          for (const h of points) {
            const recordedAt = new Date(h.date)
            await withRetry(`upsert ${card.id}`, () =>
              prisma.cardPriceHistory.upsert({
                where: { cardId_recordedAt: { cardId: card.id, recordedAt } },
                create: {
                  cardId: card.id,
                  price: h.cmLow!,
                  priceFr: h.cmLow,
                  source: "cardmarket-api",
                  recordedAt,
                },
                // Bump createdAt so the next-run filter (createdAt >= 7d ago)
                // correctly excludes this card even if no new points were
                // inserted this run.
                update: { priceFr: h.cmLow, createdAt: new Date() },
              })
            )
          }

          // Refresh the card's current price from the latest history point.
          // We use priceFr (the FR market) since the CM API returns cm_low
          // which corresponds to the FR/EU low — same source as priceFr.
          if (latestWithPrice) {
            await withRetry(`card.update ${card.id}`, () =>
              prisma.card.update({
                where: { id: card.id },
                data: {
                  priceFr:          latestWithPrice.cmLow!,
                  priceFrUpdatedAt: new Date(),
                },
              })
            )
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
