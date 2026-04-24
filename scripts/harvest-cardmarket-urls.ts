/**
 * Harvest canonical cardmarket.com URLs for items already matched to a CM product.
 *
 * Why this script exists: the RapidAPI returns a TCGGO redirect
 * (`https://www.tcggo.com/external/cm/{cardmarket_id}`) in `product.links.cardmarket`.
 * In a real browser, that redirect resolves to the actual
 * `https://www.cardmarket.com/{fr|en}/Pokemon/Products/...` page. We prefer
 * storing the canonical URL so deep-links, sharing, and SEO work cleanly.
 *
 * Since cardmarket.com sits behind a Cloudflare challenge, a simple `fetch`
 * returns 403 — so we use puppeteer-core + the locally-installed Chrome (the
 * same pattern as scripts/scrape-cm-celebrations-*.ts).
 *
 * Pipeline (per item):
 *   1. Item must have `cardmarketId` set.
 *   2. If `cardmarketUrl` already points to cardmarket.com, skip (unless --force).
 *   3. Navigate to the TCGGO redirect. Wait until `page.url()` is a cardmarket.com
 *      URL (the CF challenge resolves and CM issues the final redirect).
 *   4. Rewrite the URL from /en/ to /fr/ (Pokeitem is FR-first).
 *   5. Persist to `Item.cardmarketUrl`.
 *
 * Flags:
 *   --dry-run      plan only, no DB writes
 *   --limit=N      process at most N items
 *   --force        even for items already on cardmarket.com
 *   --headful      show the Chrome window (for debugging the CF step)
 *
 * Usage:
 *   npx tsx scripts/harvest-cardmarket-urls.ts --dry-run --limit=5
 *   npx tsx scripts/harvest-cardmarket-urls.ts
 *
 * Prereq: Google Chrome must be installed at CHROME_PATH below. macOS only by
 * default — override via env `CHROME_PATH=/path/to/chrome`.
 */

import { PrismaClient } from "@prisma/client"
import puppeteer, { type Browser, type Page } from "puppeteer-core"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env" })
dotenv.config({ path: ".env.local", override: true })

const prisma = new PrismaClient()

const DRY_RUN = process.argv.includes("--dry-run")
const FORCE = process.argv.includes("--force")
const HEADFUL = process.argv.includes("--headful")
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="))
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1], 10) : undefined

const CHROME_PATH =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

// Between 2 and 4 seconds with jitter. Cloudflare throttles hard if you burst.
const BASE_DELAY_MS = 2500
const JITTER_MS = 1500

function jitteredDelay(): number {
  return BASE_DELAY_MS + Math.floor(Math.random() * JITTER_MS)
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function toFrenchUrl(url: string): string {
  // CM mirrors every product between /en/, /fr/, /de/, etc. Prefer /fr/.
  return url.replace(/:\/\/www\.cardmarket\.com\/(en|de|es|it|nl)\//, "://www.cardmarket.com/fr/")
}

/**
 * Navigate to the TCGGO redirect and wait until we land on cardmarket.com.
 * Returns the resolved cardmarket.com URL (already rewritten to /fr/), or null
 * on timeout / persistent challenge.
 */
async function resolveCanonicalUrl(page: Page, cardmarketId: string): Promise<string | null> {
  const redirectUrl = `https://www.tcggo.com/external/cm/${cardmarketId}`
  try {
    await page.goto(redirectUrl, { waitUntil: "domcontentloaded", timeout: 45_000 })
  } catch (err) {
    console.warn(`  ⚠ goto(${redirectUrl}) failed:`, (err as Error).message)
    return null
  }

  // Poll for the URL to reach cardmarket.com. CF may challenge once at the
  // first hit; afterwards the page is cached and subsequent hits are fast.
  const deadline = Date.now() + 45_000
  while (Date.now() < deadline) {
    const current = page.url()
    if (current.includes("cardmarket.com") && !/\/challenge|__cf_chl/.test(current)) {
      return toFrenchUrl(current)
    }
    await sleep(1000)
  }
  return null
}

async function main() {
  console.log("🔗 Harvest canonical Cardmarket URLs\n")
  console.log(`   mode       : ${DRY_RUN ? "DRY-RUN" : "LIVE"}`)
  console.log(`   force      : ${FORCE}`)
  if (LIMIT != null) console.log(`   limit      : ${LIMIT}`)
  console.log(`   chrome     : ${CHROME_PATH}`)
  console.log()

  const items = await prisma.item.findMany({
    where: {
      cardmarketId: { not: null },
      ...(FORCE
        ? {}
        : {
            OR: [
              { cardmarketUrl: null },
              { cardmarketUrl: { not: { contains: "cardmarket.com" } } },
            ],
          }),
    },
    select: { id: true, name: true, cardmarketId: true, cardmarketUrl: true },
    orderBy: { name: "asc" },
    ...(LIMIT != null ? { take: LIMIT } : {}),
  })

  console.log(`📋 ${items.length} items à résoudre\n`)
  if (items.length === 0) {
    await prisma.$disconnect()
    return
  }

  console.log("🌐 Lancement de Chrome…")
  const browser: Browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: !HEADFUL,
    defaultViewport: { width: 1400, height: 900 },
    args: ["--disable-blink-features=AutomationControlled", "--lang=fr-FR"],
  })
  const page = await browser.newPage()
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  )
  await page.setExtraHTTPHeaders({ "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8" })

  let resolved = 0
  let failed = 0
  try {
    for (const item of items) {
      const canonical = await resolveCanonicalUrl(page, item.cardmarketId!)
      if (!canonical) {
        failed++
        console.log(`  ❌ ${item.name.padEnd(50).slice(0, 50)} — non résolu (CF ou timeout)`)
        await sleep(jitteredDelay())
        continue
      }

      resolved++
      console.log(`  ✅ ${item.name.padEnd(50).slice(0, 50)} → ${canonical}`)

      if (!DRY_RUN) {
        await prisma.item.update({
          where: { id: item.id },
          data: { cardmarketUrl: canonical },
        })
      }

      await sleep(jitteredDelay())
    }
  } finally {
    await browser.close()
  }

  console.log()
  console.log(`📊 ${resolved} résolus · ${failed} échecs${DRY_RUN ? " (dry-run)" : ""}`)
  await prisma.$disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
