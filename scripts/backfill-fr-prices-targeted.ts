/**
 * Backfill French prices for specific series only.
 * Targets CM API episode IDs directly — no expensive prefix-scan needed.
 *
 * Usage:
 *   npx tsx scripts/backfill-fr-prices-targeted.ts
 *   npx tsx scripts/backfill-fr-prices-targeted.ts --dry-run
 */

import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes("--dry-run")
const HOST = "cardmarket-api-tcg.p.rapidapi.com"
const KEY = process.env.CARDMARKET_API_KEY ?? ""

if (!KEY) { console.error("❌ CARDMARKET_API_KEY is not set"); process.exit(1) }

// CM episode ID → DB slug
const EPISODE_TO_SLUG: Record<number, string> = {
  223: "foudre-noire",
  224: "flamme-blanche",
  230: "mega-evolution",
  231: "flammes-fantasmagoriques",
  396: "heros-transcendants",
  399: "equilibre-parfait",
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

function normalizeNumber(n: string): string {
  return n.replace(/^([A-Z]*)0+(\d+)$/, "$1$2")
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, {
    headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": KEY },
  })
  if (!res.ok) { console.warn(`  ⚠ HTTP ${res.status} — ${url}`); return null }
  return res.json() as Promise<T>
}

async function main() {
  if (DRY_RUN) console.log("DRY RUN — aucune écriture\n")

  // Load DB cards for target series
  const slugs = Object.values(EPISODE_TO_SLUG)
  const seriesInDb = await prisma.serie.findMany({
    where: { slug: { in: slugs } },
    select: {
      id: true, slug: true,
      cards: { select: { id: true, number: true } },
    },
  })

  const slugToCardMap = new Map<string, Map<string, string>>()
  for (const serie of seriesInDb) {
    const cardMap = new Map<string, string>()
    for (const c of serie.cards) {
      cardMap.set(c.number, c.id)
      cardMap.set(normalizeNumber(c.number), c.id)
    }
    slugToCardMap.set(serie.slug, cardMap)
    console.log(`📦 ${serie.slug} — ${serie.cards.length} cartes en DB`)
  }
  console.log()

  type CMCard = {
    id: number
    card_number: number | string
    name: string
    prices?: { cardmarket?: { lowest_near_mint_FR?: number | null } | null } | null
  }

  const now = new Date()
  const recordedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const allUpdates: Array<{ cardId: string; priceFr: number; cmApiCardId: number }> = []
  let apiCalls = 0

  for (const [epIdStr, slug] of Object.entries(EPISODE_TO_SLUG)) {
    const epId = Number(epIdStr)
    const cardMap = slugToCardMap.get(slug)
    if (!cardMap) { console.warn(`⚠ Slug ${slug} non trouvé en DB`); continue }

    console.log(`\n🎯 Episode ${epId} → ${slug}`)
    let epUpdates = 0
    let page = 1

    while (true) {
      const body = await fetchJson<{ data?: CMCard[]; paging?: { current: number; total: number } }>(
        `https://${HOST}/pokemon/episodes/${epId}/cards?per_page=100&page=${page}`
      )
      apiCalls++
      if (!body?.data) break

      for (const cm of body.data) {
        const priceFr = cm.prices?.cardmarket?.lowest_near_mint_FR ?? null
        if (!priceFr || priceFr <= 0) continue
        const numStr = String(cm.card_number)
        const cardId = cardMap.get(numStr) ?? cardMap.get(normalizeNumber(numStr))
        if (!cardId) continue
        allUpdates.push({ cardId, priceFr, cmApiCardId: cm.id })
        epUpdates++
      }

      if (!body.paging || body.paging.current >= body.paging.total) break
      page++
      await sleep(200)
    }

    console.log(`   → ${epUpdates} cartes avec prix FR (${apiCalls} appels total)`)
    await sleep(300)
  }

  console.log(`\n${apiCalls} appels API utilisés`)
  console.log(`${allUpdates.length} cartes avec prix FR au total\n`)

  if (!DRY_RUN && allUpdates.length > 0) {
    const CHUNK = 50
    console.log("Écriture en DB…")
    for (let i = 0; i < allUpdates.length; i += CHUNK) {
      const chunk = allUpdates.slice(i, i + CHUNK)
      await Promise.all(
        chunk.map((u) =>
          prisma.card.update({
            where: { id: u.cardId },
            data: { priceFr: u.priceFr, priceFrUpdatedAt: now, cardmarketId: String(u.cmApiCardId) },
          })
        )
      )
      await Promise.all(
        chunk.map((u) =>
          prisma.cardPriceHistory.upsert({
            where: { cardId_recordedAt: { cardId: u.cardId, recordedAt } },
            create: { cardId: u.cardId, price: u.priceFr, priceFr: u.priceFr, source: "cardmarket-api", recordedAt },
            update: { priceFr: u.priceFr },
          })
        )
      )
    }
    console.log(`✅ ${allUpdates.length} cartes mises à jour en DB`)
  }

  if (DRY_RUN) console.log("(dry-run : rien n'a été écrit)")
  await prisma.$disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
