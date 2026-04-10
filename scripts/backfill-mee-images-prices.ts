/**
 * Backfill MEE (Énergies Méga-Évolution) card images and FR prices.
 *
 * Images  → scraped from cardmarket.com set listing page
 * Prices  → fetched from Cardmarket RapidAPI (lowest_near_mint_FR)
 *
 * Usage:
 *   npx tsx scripts/backfill-mee-images-prices.ts
 *   npx tsx scripts/backfill-mee-images-prices.ts --dry-run
 */

import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes("--dry-run")
const HOST = "cardmarket-api-tcg.p.rapidapi.com"
const KEY = process.env.CARDMARKET_API_KEY ?? ""

// ─── Scrape images from Cardmarket set listing ────────────────────────────────

/**
 * Fetches the MEE set page on Cardmarket and extracts:
 *   - card number (from "(MEE 00X)" in the name)
 *   - image URL (from the <img> tag in the listing)
 */
async function scrapeCardmarketMeeImages(): Promise<Map<string, string>> {
  const url = "https://www.cardmarket.com/fr/Pokemon/Products/Singles/Mega-Evolution-Energies"
  console.log(`\nScraping ${url} ...`)

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    },
  })
  if (!res.ok) throw new Error(`Cardmarket scrape failed: HTTP ${res.status}`)
  const html = await res.text()

  const imageMap = new Map<string, string>()

  // Pattern: match each product row — look for "(MEE 00X)" in the name and the image src
  // Cardmarket HTML structure: each card is in a <div class="col-..."> block
  // Image pattern: <img ... src="https://static.cardmarket.com/img/..." data-original="...">
  // Name pattern: "Énergie ... de base (MEE 00X)"

  // Extract all product blocks (between article tags or product table rows)
  const productPattern = /\(MEE\s+(\d+)\)[\s\S]*?(?:src|data-src|data-original)="(https:\/\/static\.cardmarket\.com\/img\/[^"]+\.jpg)"/gi
  let match
  while ((match = productPattern.exec(html)) !== null) {
    const num = match[1].padStart(3, "0")
    const imgUrl = match[2]
    imageMap.set(num, imgUrl)
  }

  // If above didn't work, try a broader pattern
  if (imageMap.size === 0) {
    // Try: find image src near "MEE 00X"
    const blocks = html.split(/(?=<div|<tr|<article)/i)
    for (const block of blocks) {
      const numMatch = block.match(/\(MEE\s+(\d+)\)/)
      if (!numMatch) continue
      const num = numMatch[1].padStart(3, "0")
      const imgMatch = block.match(/(?:src|data-src|data-original)="(https:\/\/static\.cardmarket\.com\/img\/[^"]+)"/i)
      if (imgMatch) {
        imageMap.set(num, imgMatch[1].split("?")[0]) // strip query params
      }
    }
  }

  return imageMap
}

// ─── Fetch prices from Cardmarket RapidAPI ────────────────────────────────────

interface CMCard {
  id: number
  name: string
  card_number: number | string
  cardmarket_id?: number | null
  prices?: {
    cardmarket?: {
      lowest_near_mint_FR?: number | null
      lowest_near_mint?: number | null
    } | null
  } | null
}

interface CMEpisode {
  id: number
  name: string
  code?: string
}

async function fetchJson<T>(url: string): Promise<T | null> {
  if (!KEY) return null
  try {
    const res = await fetch(url, {
      headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": KEY },
    })
    if (!res.ok) { console.warn(`API ${url} → ${res.status}`); return null }
    return await res.json() as T
  } catch (e) {
    console.warn(`API fetch error:`, e)
    return null
  }
}

async function findMeeEpisode(): Promise<CMEpisode | null> {
  let page = 1
  while (true) {
    const body = await fetchJson<{ data: CMEpisode[]; paging?: { current: number; total: number } }>(
      `https://${HOST}/pokemon/episodes?per_page=100&page=${page}`
    )
    if (!body?.data?.length) break
    const found = body.data.find((ep) =>
      ep.name.toLowerCase().includes("mega evolution energ") ||
      ep.name.toLowerCase().includes("méga-évolution énergie") ||
      ep.name.toLowerCase().includes("mega evolution energie") ||
      ep.code?.toLowerCase() === "mee"
    )
    if (found) return found
    if (!body.paging || body.paging.current >= body.paging.total) break
    page++
    await new Promise((r) => setTimeout(r, 200))
  }
  return null
}

async function fetchEpisodeCards(episodeId: number): Promise<CMCard[]> {
  const all: CMCard[] = []
  let page = 1
  while (true) {
    const body = await fetchJson<{ data: CMCard[]; paging?: { current: number; total: number } }>(
      `https://${HOST}/pokemon/episodes/${episodeId}/cards?per_page=100&page=${page}`
    )
    if (!body?.data?.length) break
    all.push(...body.data)
    if (!body.paging || body.paging.current >= body.paging.total) break
    page++
    await new Promise((r) => setTimeout(r, 200))
  }
  return all
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Find MEE serie in DB
  const serie = await prisma.serie.findUnique({
    where: { slug: "energies-mega-evolution" },
    select: { id: true, name: true },
  })
  if (!serie) throw new Error("MEE serie not found in DB")

  const dbCards = await prisma.card.findMany({
    where: { serieId: serie.id },
    select: { id: true, number: true, name: true, imageUrl: true, priceFr: true },
    orderBy: { number: "asc" },
  })
  console.log(`\nFound ${dbCards.length} MEE cards in DB`)

  // ── 1. Images ──────────────────────────────────────────────────────────────
  let imageMap = new Map<string, string>()
  try {
    imageMap = await scrapeCardmarketMeeImages()
    console.log(`\nScraped ${imageMap.size} images from Cardmarket:`)
    for (const [num, url] of imageMap) console.log(`  MEE ${num} → ${url}`)
  } catch (e) {
    console.warn("⚠ Image scraping failed:", e)
  }

  // ── 2. Prices ──────────────────────────────────────────────────────────────
  const priceMap = new Map<string, number>() // normalizedNumber → priceFr
  const cmIdMap = new Map<string, number>()  // normalizedNumber → cmApiId

  if (KEY) {
    console.log("\nSearching MEE episode on Cardmarket API...")
    const episode = await findMeeEpisode()
    if (episode) {
      console.log(`✓ Found episode: "${episode.name}" (id=${episode.id})`)
      const cmCards = await fetchEpisodeCards(episode.id)
      console.log(`  ${cmCards.length} cards from API`)
      for (const c of cmCards) {
        const num = String(c.card_number).replace(/^0+/, "")
        const priceFr = c.prices?.cardmarket?.lowest_near_mint_FR
        if (typeof priceFr === "number" && priceFr > 0) priceMap.set(num, priceFr)
        if (c.id) cmIdMap.set(num, c.id)
      }
      console.log(`  ${priceMap.size} cards with FR prices`)
    } else {
      console.warn("⚠ MEE episode not found via API — prices skipped")
    }
  } else {
    console.warn("⚠ CARDMARKET_API_KEY not set — prices skipped")
  }

  // ── 3. Update DB ──────────────────────────────────────────────────────────
  console.log("\nUpdating DB...")
  let updatedImages = 0
  let updatedPrices = 0

  for (const card of dbCards) {
    const normalizedNum = card.number.replace(/^0+/, "")
    const paddedNum = card.number.padStart(3, "0")

    const newImage = imageMap.get(paddedNum) ?? imageMap.get(normalizedNum) ?? null
    const newPrice = priceMap.get(normalizedNum) ?? null
    const cmApiId = cmIdMap.get(normalizedNum) ?? null

    const updates: Record<string, unknown> = {}
    if (newImage && newImage !== card.imageUrl) {
      updates.imageUrl = newImage
      updatedImages++
    }
    if (newPrice && newPrice !== card.priceFr) {
      updates.priceFr = newPrice
      updates.priceFrUpdatedAt = new Date()
      if (cmApiId) updates.cardmarketId = String(cmApiId)
      updatedPrices++
    }

    if (Object.keys(updates).length === 0) continue

    console.log(`  ${card.number} ${card.name}:${newImage ? ` image ✓` : ""}${newPrice ? ` priceFr=${newPrice}€` : ""}`)
    if (!DRY_RUN) {
      await prisma.card.update({ where: { id: card.id }, data: updates })
    }
  }

  console.log(`\n✓ ${updatedImages} images, ${updatedPrices} prices updated${DRY_RUN ? " (dry-run)" : ""}`)
  await prisma.$disconnect()
}

main().catch(console.error)
