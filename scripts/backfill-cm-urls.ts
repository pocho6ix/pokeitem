/**
 * Backfill Cardmarket URL slugs into Card.cardmarketUrl
 *
 * For every card with a cardmarketId, fetches card detail from the Cardmarket
 * TCG API, extracts the English slug, episode slug/code, and card number,
 * then constructs the canonical Cardmarket URL slug and stores it.
 *
 * URL format: {Episode-Slug}/{Card-Slug}-V{n}-{CODE}{padded-number}
 *   e.g.  Mega-Evolution/Bulbasaur-V2-MEG133
 *
 * V{n} = rank of this card (by card_number) among all cards with the same
 *        slug in the same episode. Most cards are V1 (only one print).
 *
 * Usage:
 *   npx tsx scripts/backfill-cm-urls.ts
 *   npx tsx scripts/backfill-cm-urls.ts --dry-run
 *   npx tsx scripts/backfill-cm-urls.ts --limit=500
 *   npx tsx scripts/backfill-cm-urls.ts --force   # re-process already-backfilled cards
 */

import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })

const prisma = new PrismaClient()
const DRY_RUN   = process.argv.includes("--dry-run")
const FORCE     = process.argv.includes("--force")
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="))
const LIMIT     = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1]) : undefined
const QUOTA_ARG = process.argv.find((a) => a.startsWith("--quota="))
const DAILY_QUOTA = QUOTA_ARG ? parseInt(QUOTA_ARG.split("=")[1]) : 14_000

let apiCallCount = 0

const HOST = "cardmarket-api-tcg.p.rapidapi.com"
const KEY  = process.env.CARDMARKET_API_KEY ?? ""
if (!KEY) { console.error("❌ CARDMARKET_API_KEY not set"); process.exit(1) }

const DELAY = 200   // ms between API calls — stay within rate limits
const CHUNK = 20    // cards per progress log

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Capitalize every word separated by a dash.
 * "mega-evolution"  →  "Mega-Evolution"
 * "scarlet-violet"  →  "Scarlet-Violet"
 */
function capitalizeDashWords(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("-")
}

/**
 * Capitalize the first letter of a slug segment (keep rest as-is).
 * "bulbasaur"       →  "Bulbasaur"
 * "mega-venusaur-ex"→  "Mega-venusaur-ex"   (Cardmarket capitalizes only 1st char)
 */
function capitalizeFirst(slug: string): string {
  if (!slug) return slug
  return slug.charAt(0).toUpperCase() + slug.slice(1)
}

interface CardAPIData {
  id: number
  name: string
  slug: string
  card_number: number
  episode: {
    slug: string
    code: string
  }
}

async function fetchCardDetail(cmId: string): Promise<CardAPIData | null> {
  if (apiCallCount >= DAILY_QUOTA) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(`https://${HOST}/pokemon/cards/${cmId}`, {
      headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": KEY },
      signal: controller.signal,
    })
    clearTimeout(timer)
    apiCallCount++
    if (!res.ok) return null
    const body = await res.json() as { data?: CardAPIData }
    return body.data ?? null
  } catch {
    clearTimeout(timer)
    return null
  }
}

/**
 * Build the Cardmarket URL path for a card.
 *
 * @param epSlug    episode slug from API (e.g. "mega-evolution")
 * @param cardSlug  card slug from API   (e.g. "bulbasaur")
 * @param vRank     V{n} rank (1-based)  (e.g. 2 → "V2")
 * @param epCode    episode code         (e.g. "MEG")
 * @param cardNum   card number          (e.g. 133)
 */
function buildCmPath(
  epSlug: string,
  cardSlug: string,
  vRank: number,
  epCode: string,
  cardNum: number
): string {
  const epPart   = capitalizeDashWords(epSlug)
  const namePart = capitalizeFirst(cardSlug)
  const numPart  = String(cardNum).padStart(3, "0")
  return `${epPart}/${namePart}-V${vRank}-${epCode}${numPart}`
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN — nothing will be written\n" : "")

  // Step 1: Load all cards with cardmarketId that need processing
  const cards = await prisma.card.findMany({
    where: {
      cardmarketId: { not: null },
      ...(FORCE ? {} : { cardmarketUrl: null }),
    },
    select: { id: true, cardmarketId: true, number: true, name: true },
    ...(LIMIT ? { take: LIMIT } : {}),
    orderBy: { cardmarketId: "asc" },
  })

  console.log(`📋 ${cards.length} cartes à traiter${LIMIT ? ` (limite: ${LIMIT})` : ""}`)
  console.log(`🔢 Quota journalier : ${DAILY_QUOTA} appels\n`)

  if (cards.length === 0) {
    console.log("✅ Rien à faire.")
    await prisma.$disconnect()
    return
  }

  // Step 2: Fetch card details from API and write to DB incrementally.
  // Each successful fetch is immediately written — no data lost if interrupted.

  interface Collected {
    dbId:    string
    cmId:    string
    epSlug:  string
    epCode:  string
    cardSlug: string
    cardNum: number
  }

  const collected: Collected[] = []
  let apiErrors = 0
  let written   = 0
  let done      = 0

  for (const card of cards) {
    const data = await fetchCardDetail(card.cardmarketId!)

    if (!data || !data.episode?.slug || !data.slug) {
      apiErrors++
      process.stdout.write(`  ⚠️  Erreur API pour cardmarketId=${card.cardmarketId} (${card.name})\n`)
    } else {
      collected.push({
        dbId:     card.id,
        cmId:     card.cardmarketId!,
        epSlug:   data.episode.slug,
        epCode:   data.episode.code,
        cardSlug: data.slug,
        cardNum:  data.card_number,
      })
    }

    done++
    if (done % CHUNK === 0) {
      const pct = ((done / cards.length) * 100).toFixed(1)
      process.stdout.write(`  ${pct}% — ${done}/${cards.length} fetched · ${apiCallCount} appels · ${apiErrors} erreurs · ${written} écrits\n`)
    }

    // Stop if quota reached
    if (apiCallCount >= DAILY_QUOTA) {
      process.stdout.write(`\n⚠️  Quota journalier atteint (${apiCallCount}/${DAILY_QUOTA})\n`)
      process.stdout.write(`   Relance demain : npx tsx scripts/backfill-cm-urls.ts\n`)
      break
    }

    await sleep(DELAY)
  }

  process.stdout.write(`\n✅ Fetch terminé: ${collected.length} succès, ${apiErrors} erreurs, ${apiCallCount} appels\n`)
  process.stdout.write(`   Calcul des rangs V{n} et écriture en base...\n\n`)

  // Step 3: Compute V{n} ranks
  // Group by (epCode, cardSlug), sort by cardNum, assign 1-based rank
  const groups = new Map<string, Collected[]>()
  for (const c of collected) {
    const key = `${c.epCode}::${c.cardSlug}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(c)
  }

  const ranks = new Map<string, number>() // dbId → vRank
  for (const group of groups.values()) {
    group.sort((a, b) => a.cardNum - b.cardNum)
    group.forEach((c, i) => ranks.set(c.dbId, i + 1))
  }

  // Step 4: Write to DB incrementally (skip dry-run)
  let skipped = 0

  for (const c of collected) {
    const vRank = ranks.get(c.dbId)!
    const urlPath = buildCmPath(c.epSlug, c.cardSlug, vRank, c.epCode, c.cardNum)

    if (DRY_RUN) {
      console.log(`  [DRY] ${c.cmId} → ${urlPath}`)
      skipped++
      continue
    }

    await prisma.card.update({
      where: { id: c.dbId },
      data: { cardmarketUrl: urlPath },
    })
    written++

    if (written % 500 === 0) {
      process.stdout.write(`  💾 ${written} URLs écrites...\n`)
    }
  }

  console.log(`\n🎉 Terminé!`)
  console.log(`   ${written} URLs écrites en base`)
  if (skipped) console.log(`   ${skipped} (dry-run, non écrites)`)
  if (apiErrors) console.log(`   ${apiErrors} cartes sans URL (erreur API)`)

  await prisma.$disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
