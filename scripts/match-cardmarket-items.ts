/**
 * Write Cardmarket matches back to the DB.
 *
 * Pipeline (per Pokeitem item with type ≠ OTHER):
 *
 *   1. Resolve Pokeitem.serie → CM episode.slug (via static overrides + fuzzy
 *      match on Serie.nameEn — shared with the audit script).
 *   2. Filter CM products of that episode by `PRODUCT_TYPE_RULES`.
 *   3. Decide a confidence bucket:
 *        - 1 candidate      → "auto_high"   → write cardmarketId + URL + prices
 *        - 2+ candidates    → "auto_low"    → write candidates JSON, admin decides
 *        - 0 candidates /
 *          no episode       → "unmatched"   → store an empty candidates array
 *
 * Prices written on auto_high:
 *   - priceFrom    ← prices.cardmarket.lowest_FR (fallback lowest)
 *   - priceTrend   ← prices.cardmarket["30d_average"]
 *   - currentPrice ← priceTrend ?? priceFrom
 *   - priceUpdatedAt + lastScrapedAt ← now
 *   - Upserts a PriceHistory row for today (source="cardmarket-api")
 *
 * URL: for now we store `links.cardmarket` (a TCGGO redirect). A follow-up
 * script (scripts/harvest-cardmarket-urls.ts) resolves each to the canonical
 * cardmarket.com URL via puppeteer.
 *
 * Flags:
 *   --dry-run        plan only, no DB writes
 *   --limit=N        process at most N items (after the resume filter)
 *   --resume         skip items already marked auto_high/verified (default: on)
 *   --force          ignore --resume and reprocess everything
 *   --verbose        per-item log line
 *   --no-fetch       reuse /tmp/cm-products-cache.json (skip ~95 API calls)
 *   --only-type=X    only touch items of this ItemType (e.g. --only-type=ETB)
 *
 * Usage:
 *   npx tsx scripts/match-cardmarket-items.ts --dry-run --limit=10
 *   npx tsx scripts/match-cardmarket-items.ts --limit=10
 *   npx tsx scripts/match-cardmarket-items.ts            # full run
 */

import { PrismaClient, ItemType } from "@prisma/client"
import * as dotenv from "dotenv"
import {
  fetchAllCMProducts,
  extractEpisodes,
  groupProductsByEpisode,
  matchSerieToEpisode,
  matchItemToProducts,
  decideConfidence,
  extractPrices,
  candidateFromProduct,
  type ItemInput,
  type StoredCandidate,
} from "../src/lib/cardmarket-items-matching"

dotenv.config({ path: ".env" })
dotenv.config({ path: ".env.local", override: true })

const prisma = new PrismaClient()

// ─── CLI parsing ────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run")
const VERBOSE = process.argv.includes("--verbose")
const NO_FETCH = process.argv.includes("--no-fetch")
const FORCE = process.argv.includes("--force")
// `--resume` is the default; `--force` overrides it.
const RESUME = !FORCE
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="))
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1], 10) : undefined
const ONLY_TYPE_ARG = process.argv.find((a) => a.startsWith("--only-type="))
const ONLY_TYPE = ONLY_TYPE_ARG ? (ONLY_TYPE_ARG.split("=")[1] as ItemType) : undefined

const CACHE_FILE = "/tmp/cm-products-cache.json"

// ─── Retry wrapper for Neon connection hiccups (mirrors backfill-cm-history.ts) ──

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function withRetry<T>(label: string, fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  let attempt = 0
  while (true) {
    try {
      return await fn()
    } catch (err) {
      const code = (err as { code?: string } | null)?.code
      if (code !== "P1017" && code !== "P1001" && code !== "P1002") throw err
      if (attempt >= maxRetries) throw err
      attempt++
      const delay = 500 * Math.pow(2, attempt - 1)
      console.log(`  ⚠ ${label} : ${code} (tentative ${attempt}/${maxRetries}) — reconnexion dans ${delay}ms`)
      await sleep(delay)
      try { await prisma.$disconnect() } catch {}
      try { await prisma.$connect() } catch {}
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

interface RunStats {
  processed: number
  autoHigh: number
  autoLow: number
  unmatched: number
  skipped: number
  priceHistoryRows: number
}

async function main() {
  console.log("🎯 Match Cardmarket items → DB\n")
  console.log(`   mode        : ${DRY_RUN ? "DRY-RUN (aucune écriture)" : "LIVE"}`)
  console.log(`   resume      : ${RESUME ? "oui — skip verified/auto_high" : "non (--force)"}`)
  if (LIMIT != null) console.log(`   limit       : ${LIMIT}`)
  if (ONLY_TYPE) console.log(`   only-type   : ${ONLY_TYPE}`)
  console.log()

  const apiKey = process.env.CARDMARKET_API_KEY
  if (!apiKey) { console.error("❌ CARDMARKET_API_KEY missing"); process.exit(1) }

  const products = await fetchAllCMProducts({
    apiKey,
    cacheFile: CACHE_FILE,
    useCache: NO_FETCH,
    verbose: VERBOSE,
  })
  const episodes = extractEpisodes(products)
  const productsByEpisode = groupProductsByEpisode(products)
  console.log(`📥 CM catalog : ${products.length} produits · ${episodes.length} épisodes\n`)

  // Load series + items. Exclude OTHER items (no meaningful rule).
  const series = await prisma.serie.findMany({
    where: { items: { some: ONLY_TYPE ? { type: ONLY_TYPE } : {} } },
    select: {
      id: true,
      slug: true,
      name: true,
      nameEn: true,
      items: {
        where: {
          type: ONLY_TYPE ?? { not: ItemType.OTHER },
          // Resume filter: skip items already marked auto_high/verified.
          // NULL rows (= not yet processed) must explicitly be kept — Prisma's
          // `notIn` translates to SQL `NOT IN (…)` which excludes NULL.
          ...(RESUME && !DRY_RUN
            ? {
                OR: [
                  { cardmarketMatchConfidence: null },
                  { cardmarketMatchConfidence: { notIn: ["auto_high", "verified"] } },
                ],
              }
            : {}),
        },
        select: { id: true, name: true, slug: true, type: true, cardmarketMatchConfidence: true },
      },
    },
    orderBy: { name: "asc" },
  })

  const episodeBySerie = new Map<string, string | null>()
  for (const s of series) {
    const sm = matchSerieToEpisode({ id: s.id, slug: s.slug, name: s.name, nameEn: s.nameEn }, episodes)
    episodeBySerie.set(s.id, sm.resolvedEpisodeSlug)
  }

  const flatItems: Array<{
    input: ItemInput
    currentConfidence: string | null
  }> = series.flatMap((s) =>
    s.items.map((i) => ({
      input: {
        id: i.id,
        name: i.name,
        slug: i.slug,
        type: i.type,
        serieId: s.id,
        serieSlug: s.slug,
        serieName: s.name,
      },
      currentConfidence: i.cardmarketMatchConfidence,
    }))
  )

  const queue = LIMIT != null ? flatItems.slice(0, LIMIT) : flatItems
  console.log(`🗂️  ${flatItems.length} items éligibles${LIMIT != null ? ` — ${queue.length} traités (--limit)` : ""}\n`)

  const now = new Date()
  const recordedAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  const stats: RunStats = {
    processed: 0,
    autoHigh: 0,
    autoLow: 0,
    unmatched: 0,
    skipped: 0,
    priceHistoryRows: 0,
  }

  for (const { input: item } of queue) {
    const episodeSlug = episodeBySerie.get(item.serieId) ?? null
    const match = matchItemToProducts(item, episodeSlug, productsByEpisode)
    const confidence = decideConfidence(match.verdict)
    stats.processed++

    if (confidence === "auto_high") {
      stats.autoHigh++
      const product = match.candidates[0]
      const prices = extractPrices(product)
      const candidateJson: StoredCandidate[] = [candidateFromProduct(product)]

      logRow(item, confidence, product.name, prices)
      if (DRY_RUN) continue

      await withRetry(`item.update ${item.id}`, () =>
        prisma.item.update({
          where: { id: item.id },
          data: {
            cardmarketId:              String(product.cardmarket_id ?? product.id),
            cardmarketUrl:             product.links?.cardmarket ?? null,
            cardmarketMatchConfidence: "auto_high",
            cardmarketCandidates:      candidateJson,
            priceFrom:                 prices.priceFrom,
            priceTrend:                prices.priceTrend,
            currentPrice:              prices.currentPrice,
            priceUpdatedAt:            now,
            lastScrapedAt:             now,
          },
        })
      )

      if (prices.currentPrice != null) {
        await withRetry(`priceHistory ${item.id}`, () =>
          prisma.priceHistory.upsert({
            // PriceHistory has no composite unique on (itemId, date); we emulate
            // idempotence via a findFirst + conditional create (cheap given 90 items).
            where: { id: `${item.id}_${recordedAt.toISOString().slice(0, 10)}` },
            create: {
              id: `${item.id}_${recordedAt.toISOString().slice(0, 10)}`,
              itemId: item.id,
              price: prices.currentPrice,
              priceFrom: prices.priceFrom,
              source: "cardmarket-api",
              currency: prices.currency,
              date: recordedAt,
            },
            update: {
              price: prices.currentPrice,
              priceFrom: prices.priceFrom,
            },
          })
        )
        stats.priceHistoryRows++
      }
    } else if (confidence === "auto_low") {
      stats.autoLow++
      const candidateJson: StoredCandidate[] = match.candidates.slice(0, 5).map(candidateFromProduct)
      logRow(item, confidence, `${match.candidates.length} candidats`)
      if (DRY_RUN) continue

      await withRetry(`item.update ${item.id}`, () =>
        prisma.item.update({
          where: { id: item.id },
          data: {
            cardmarketMatchConfidence: "auto_low",
            cardmarketCandidates:      candidateJson,
            // Intentionally don't set cardmarketUrl/Id/prices — admin picks.
          },
        })
      )
    } else {
      stats.unmatched++
      logRow(item, confidence, match.verdict === "no-episode" ? "aucune épisode CM" : "aucun candidat")
      if (DRY_RUN) continue

      await withRetry(`item.update ${item.id}`, () =>
        prisma.item.update({
          where: { id: item.id },
          data: {
            cardmarketMatchConfidence: "unmatched",
            cardmarketCandidates:      [],
          },
        })
      )
    }
  }

  console.log()
  console.log(`📊 ${stats.processed} items traités`)
  console.log(`   auto_high : ${stats.autoHigh}`)
  console.log(`   auto_low  : ${stats.autoLow}`)
  console.log(`   unmatched : ${stats.unmatched}`)
  if (!DRY_RUN) console.log(`   price_history lignes insérées : ${stats.priceHistoryRows}`)
  if (DRY_RUN) console.log("\n(dry-run : aucune écriture en DB)")

  await prisma.$disconnect()
}

function logRow(
  item: { name: string; serieName: string; type: ItemType },
  confidence: string,
  detail: string,
  prices?: { priceFrom: number | null; priceTrend: number | null }
) {
  const icon = confidence === "auto_high" ? "✅" : confidence === "auto_low" ? "🟡" : "⚪"
  const label = item.name.padEnd(50).slice(0, 50)
  const priceTag = prices
    ? ` · ${prices.priceFrom != null ? `from ${prices.priceFrom}€` : "—"} · ${prices.priceTrend != null ? `trend ${prices.priceTrend}€` : "—"}`
    : ""
  if (VERBOSE || confidence !== "auto_high") {
    console.log(`  ${icon} [${confidence}] ${label} → ${detail}${priceTag}`)
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
