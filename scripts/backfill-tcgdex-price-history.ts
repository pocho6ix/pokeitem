/**
 * backfill-tcgdex-price-history.ts
 *
 * Fills in missing CardPriceHistory entries using TCGdex's Cardmarket pricing.
 *
 * TCGdex exposes three rolling averages per card:
 *   avg1  → 24-hour average   (→ inserted as "today - 1 day")
 *   avg7  → 7-day average     (→ inserted as "today - 7 days",  only if window empty)
 *   avg30 → 30-day average    (→ inserted as "today - 30 days", only if window empty)
 *
 * History-only: does NOT touch Card.price / Card.priceFr / Card.priceReverse.
 * Those live fields are owned by the daily Cardmarket FR NM scraper — this
 * backfill is purely for filling gaps in CardPriceHistory.
 *
 * Rules:
 *  - Existing history points are NEVER overwritten (upsert with update: {})
 *  - Cards from SV / ME sets are skipped — covered by the daily scraper
 *  - Cards without a tcgdexId, or with a fake "-1ed" suffix, are skipped
 *  - Cards that already have ≥ 3 history points in the last 30 days are skipped
 *    unless --force is passed
 *
 * Usage:
 *   npx tsx scripts/backfill-tcgdex-price-history.ts --dry-run
 *   npx tsx scripts/backfill-tcgdex-price-history.ts
 *   npx tsx scripts/backfill-tcgdex-price-history.ts --force   # re-run even if history exists
 *   npx tsx scripts/backfill-tcgdex-price-history.ts --set=sm10  # single set
 */

import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })

const prisma  = new PrismaClient()
const DRY_RUN = process.argv.includes("--dry-run")
const FORCE   = process.argv.includes("--force")
const ONLY_SET = process.argv.find(a => a.startsWith("--set="))?.split("=")[1]

// Sets handled by the daily scraper — skip to avoid duplication
const SCRAPER_PREFIXES = ["sv", "me"]

// ── TCGdex pricing shape ──────────────────────────────────────────────────────
interface CMPricing {
  trend?:         number | null
  avg?:           number | null
  avg1?:          number | null
  avg7?:          number | null
  avg30?:         number | null
  "trend-holo"?:  number | null
  "avg1-holo"?:   number | null
  "avg7-holo"?:   number | null
  "avg30-holo"?:  number | null
}

interface TCGdexCardResponse {
  pricing?: {
    cardmarket?: CMPricing | null
  } | null
}

async function fetchPricing(tcgdexId: string): Promise<CMPricing | null> {
  try {
    const res = await fetch(`https://api.tcgdex.net/v2/fr/cards/${tcgdexId}`)
    if (!res.ok) return null
    const d = (await res.json()) as TCGdexCardResponse
    return d?.pricing?.cardmarket ?? null
  } catch {
    return null
  }
}

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Returns midnight UTC for a date N days before today */
function daysAgo(n: number): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - n)
  return d
}

/** True if the set should be handled by this script (not the daily scraper) */
function isEligibleSet(tcgdexId: string): boolean {
  const prefix = tcgdexId.split("-")[0].replace(/\d+.*$/, "") // "sm10-1" → "sm"
  if (SCRAPER_PREFIXES.some(p => tcgdexId.startsWith(p))) return false
  if (tcgdexId.endsWith("-1ed")) return false
  return true
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN — no writes\n" : "⚡ Live run\n")

  const thirtyDaysAgo = daysAgo(30)

  // Load all eligible cards
  const allCards = await prisma.card.findMany({
    where: {
      tcgdexId: { not: null },
      ...(ONLY_SET
        ? { tcgdexId: { startsWith: ONLY_SET } }
        : {}),
    },
    select: {
      id: true,
      tcgdexId: true,
      _count: { select: { priceHistory: { where: { recordedAt: { gte: thirtyDaysAgo } } } } },
    },
  })

  // Filter: skip scraper sets, skip if enough recent history (unless --force)
  const candidates = allCards.filter(c => {
    if (!c.tcgdexId) return false
    if (!isEligibleSet(c.tcgdexId)) return false
    if (!FORCE && c._count.priceHistory >= 3) return false
    return true
  })

  console.log(`Cards to process: ${candidates.length} / ${allCards.length} total\n`)

  // Group by set prefix for progress reporting
  const setGroups = new Map<string, typeof candidates>()
  for (const c of candidates) {
    const setId = c.tcgdexId!.split("-").slice(0, -1).join("-") // "sm10-153" → "sm10"
    if (!setGroups.has(setId)) setGroups.set(setId, [])
    setGroups.get(setId)!.push(c)
  }

  console.log(`Sets to process: ${setGroups.size}\n`)

  const BATCH = 5        // concurrent requests per wave
  const DELAY_MS = 150   // ms between waves

  let totalInserted = 0
  let totalSkippedNoPricing = 0

  for (const [setId, cards] of setGroups) {
    let setInserted = 0

    for (let i = 0; i < cards.length; i += BATCH) {
      const batch = cards.slice(i, i + BATCH)

      await Promise.all(batch.map(async (card) => {
        const cm = await fetchPricing(card.tcgdexId!)
        if (!cm) {
          totalSkippedNoPricing++
          return
        }

        // Prices to use
        const trend    = cm.trend   ?? cm.avg   ?? null
        const trendHolo = cm["trend-holo"] ?? null
        const avg1     = cm.avg1    ?? trend
        const avg7     = cm.avg7    ?? trend
        const avg30    = cm.avg30   ?? trend
        const avg1h    = cm["avg1-holo"]  ?? trendHolo
        const avg7h    = cm["avg7-holo"]  ?? trendHolo
        const avg30h   = cm["avg30-holo"] ?? trendHolo

        if (trend === null && trendHolo === null) {
          totalSkippedNoPricing++
          return
        }

        const today   = daysAgo(0)
        const day7    = daysAgo(7)
        const day30   = daysAgo(30)

        if (!DRY_RUN) {
          // ── Insert history points (never overwrite existing) ──────────────
          const points: Array<{ recordedAt: Date; price: number; priceFr: number | null; priceReverse: number | null }> = []

          // Today / avg1
          if (avg1 !== null || avg1h !== null) {
            points.push({
              recordedAt: today,
              price:        avg1 ?? avg1h ?? 0,
              priceFr:      avg1,
              priceReverse: avg1h,
            })
          }
          // 7 days ago
          if (avg7 !== null || avg7h !== null) {
            points.push({
              recordedAt: day7,
              price:        avg7 ?? avg7h ?? 0,
              priceFr:      avg7,
              priceReverse: avg7h,
            })
          }
          // 30 days ago
          if (avg30 !== null || avg30h !== null) {
            points.push({
              recordedAt: day30,
              price:        avg30 ?? avg30h ?? 0,
              priceFr:      avg30,
              priceReverse: avg30h,
            })
          }

          for (const pt of points) {
            await prisma.cardPriceHistory.upsert({
              where: { cardId_recordedAt: { cardId: card.id, recordedAt: pt.recordedAt } },
              create: {
                cardId:       card.id,
                price:        pt.price,
                priceFr:      pt.priceFr,
                priceReverse: pt.priceReverse,
                source:       "tcgdex",
                recordedAt:   pt.recordedAt,
              },
              update: {}, // ← keep existing data, never overwrite
            })
          }
          setInserted += points.length
          // Card.price / priceFr / priceReverse are intentionally NOT updated
          // here — they belong to the daily Cardmarket FR NM scraper.
        } else {
          // dry-run: just count
          setInserted += 3
        }
      }))

      await new Promise(r => setTimeout(r, DELAY_MS))
    }

    console.log(`  ${setId.padEnd(12)} → ${cards.length} cartes · ${setInserted} points insérés`)
    totalInserted += setInserted
  }

  console.log(`\n${"─".repeat(50)}`)
  console.log(`✅ Total: ${totalInserted} points historique insérés`)
  console.log(`   Sans prix TCGdex:    ${totalSkippedNoPricing}`)
  if (DRY_RUN) console.log("   (dry-run — nothing written)")

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
