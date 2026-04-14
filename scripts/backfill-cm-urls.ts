/**
 * Backfill Cardmarket URL slugs into Card.cardmarketUrl
 *
 * Phase 1 — Fetch ALL episode card lists (~400 API calls) to build a
 *           global map of slug duplicates per episode.
 * Phase 2 — For every card that still needs a URL, fetch its individual
 *           detail from the API to get slug / episode / card_number.
 * Phase 3 — Build canonical URLs and write to DB.
 *
 * Cardmarket URL format:
 *   Unique slug in episode:   {Episode}/{Name}-{CODE}{number}
 *   Duplicate slug (≥2 cards): {Episode}/{Name}-V{n}-{CODE}{number}
 *
 *   e.g.  Mega-Evolution/Bulbasaur-MEG001       (unique)
 *         Twilight-Masquerade/Sunflora-V1-TWM007 (2 Sunflora in TWM)
 *
 * Usage:
 *   npx tsx scripts/backfill-cm-urls.ts
 *   npx tsx scripts/backfill-cm-urls.ts --dry-run
 *   npx tsx scripts/backfill-cm-urls.ts --limit=500
 *   npx tsx scripts/backfill-cm-urls.ts --force          # re-process all cards
 *   npx tsx scripts/backfill-cm-urls.ts --fix-existing    # fix V1 format in existing URLs
 */

import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })

const prisma = new PrismaClient()
const DRY_RUN       = process.argv.includes("--dry-run")
const FORCE         = process.argv.includes("--force")
const FIX_EXISTING  = process.argv.includes("--fix-existing")
const LIMIT_ARG     = process.argv.find((a) => a.startsWith("--limit="))
const LIMIT         = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1]) : undefined
const QUOTA_ARG     = process.argv.find((a) => a.startsWith("--quota="))
const DAILY_QUOTA   = QUOTA_ARG ? parseInt(QUOTA_ARG.split("=")[1]) : 14_000

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

function capitalizeDashWords(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("-")
}

function capitalizeFirst(slug: string): string {
  if (!slug) return slug
  return slug.charAt(0).toUpperCase() + slug.slice(1)
}

// No slug casing transformation needed — Cardmarket uses the API slug as-is
// with only the first letter capitalized. e.g. "kingdra-ex" → "Kingdra-ex"

interface CardAPIData {
  id: number
  name: string
  slug: string
  card_number: number
  episode: {
    id: number
    slug: string
    code: string
  }
  prices?: {
    cardmarket?: {
      lowest_near_mint_FR?: number | null
    }
  }
}

interface EpisodeCard {
  id: number
  slug: string
  card_number: number
}

async function apiFetch<T>(path: string): Promise<T | null> {
  if (apiCallCount >= DAILY_QUOTA) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(`https://${HOST}${path}`, {
      headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": KEY },
      signal: controller.signal,
    })
    clearTimeout(timer)
    apiCallCount++
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    clearTimeout(timer)
    return null
  }
}

async function fetchCardDetail(cmId: string): Promise<CardAPIData | null> {
  const body = await apiFetch<{ data?: CardAPIData }>(`/pokemon/cards/${cmId}`)
  return body?.data ?? null
}

/**
 * Build the canonical Cardmarket URL path for a card.
 * Appends ?language=2 (French filter) when the card has French market prices.
 */
function buildCmPath(
  epSlug: string,
  cardSlug: string,
  vRank: number,
  epCode: string,
  cardNum: number,
  groupSize: number,
  hasFrPrice: boolean
): string {
  const epPart   = capitalizeDashWords(epSlug)
  const namePart = capitalizeFirst(cardSlug)
  const numPart  = String(cardNum).padStart(3, "0")
  const vPart    = groupSize > 1 ? `-V${vRank}-` : "-"
  const langSuffix = hasFrPrice ? "?language=2" : ""
  return `${epPart}/${namePart}${vPart}${epCode}${numPart}${langSuffix}`
}

// ── Phase 1: Build episode slug-group map ───────────────────────────────────

/** Map<"epId::slug", count> — how many cards share each slug in each episode */
type SlugGroupMap = Map<string, number>

async function buildSlugGroupMap(): Promise<{ map: SlugGroupMap; episodeMeta: Map<number, { slug: string; code: string }> }> {
  process.stdout.write("📦 Phase 1 — Récupération des épisodes et cartes...\n")

  // 1a. Get all episodes
  const episodes: Array<{ id: number; slug: string; code: string; cards_total: number }> = []
  for (let page = 1; page <= 20; page++) {
    const body = await apiFetch<{ data?: typeof episodes }>(`/pokemon/episodes?per_page=50&page=${page}`)
    if (!body?.data?.length) break
    episodes.push(...body.data)
    await sleep(DELAY)
  }
  process.stdout.write(`   ${episodes.length} épisodes trouvés\n`)

  const episodeMeta = new Map<number, { slug: string; code: string }>()
  for (const ep of episodes) {
    episodeMeta.set(ep.id, { slug: ep.slug, code: ep.code })
  }

  // 1b. For each episode, fetch all cards to count slug duplicates
  const map: SlugGroupMap = new Map()
  let epDone = 0

  for (const ep of episodes) {
    const pagesNeeded = Math.ceil((ep.cards_total || 50) / 50)

    for (let page = 1; page <= pagesNeeded; page++) {
      const body = await apiFetch<{ data?: EpisodeCard[] }>(
        `/pokemon/episodes/${ep.id}/cards?per_page=50&page=${page}`
      )
      if (!body?.data?.length) break

      for (const card of body.data) {
        const key = `${ep.id}::${card.slug}`
        map.set(key, (map.get(key) ?? 0) + 1)
      }
      await sleep(DELAY)
    }

    epDone++
    if (epDone % 10 === 0) {
      process.stdout.write(`   ${epDone}/${episodes.length} épisodes · ${apiCallCount} appels API\n`)
    }

    if (apiCallCount >= DAILY_QUOTA) {
      process.stdout.write(`\n⚠️  Quota atteint pendant la phase 1\n`)
      break
    }
  }

  process.stdout.write(`   ✅ Phase 1 terminée: ${map.size} groupes de slugs, ${apiCallCount} appels API\n\n`)
  return { map, episodeMeta }
}

// ── Fix existing URLs mode ──────────────────────────────────────────────────

async function fixExistingUrls(slugGroupMap: SlugGroupMap, episodeMeta: Map<number, { slug: string; code: string }>) {
  process.stdout.write("🔧 Mode --fix-existing : correction des URLs existantes...\n")

  // Build reverse lookup: epSlug → epId
  const slugToEpId = new Map<string, number>()
  for (const [id, meta] of episodeMeta) {
    slugToEpId.set(meta.slug, id)
  }

  // Also build epId → code
  const epIdToCode = new Map<number, string>()
  for (const [id, meta] of episodeMeta) {
    epIdToCode.set(id, meta.code)
  }

  const cards = await prisma.card.findMany({
    where: { cardmarketUrl: { not: null } },
    select: { id: true, cardmarketUrl: true, priceFr: true },
  })

  let fixed = 0
  let unchanged = 0
  let errors = 0

  for (const card of cards) {
    const rawUrl = card.cardmarketUrl!
    // Strip any existing query params for re-processing
    const url = rawUrl.split("?")[0]
    const [epPart, rest] = url.split("/")
    if (!rest) { errors++; continue }

    const epSlug = epPart.toLowerCase()
    const epId = slugToEpId.get(epSlug)
    const hasFrPrice = typeof card.priceFr === "number" && card.priceFr > 0
    const langSuffix = hasFrPrice ? "?language=2" : ""

    // Parse: Name-V{n}-CODE### or Name-CODE###
    const vMatch = rest.match(/^(.+)-V(\d+)-([A-Z0-9-]+?)(\d{3})$/)
    const noVMatch = rest.match(/^(.+)-([A-Z0-9-]+?)(\d{3})$/)

    let newUrl: string

    if (vMatch) {
      const cardSlug = vMatch[1].toLowerCase()
      const groupKey = epId ? `${epId}::${cardSlug}` : null
      const groupSize = groupKey ? (slugGroupMap.get(groupKey) ?? 1) : 1
      const namePart = capitalizeFirst(cardSlug)
      const vRank = parseInt(vMatch[2])
      const code = vMatch[3]
      const num = vMatch[4]
      const vPart = groupSize > 1 ? `-V${vRank}-` : "-"
      newUrl = `${epPart}/${namePart}${vPart}${code}${num}${langSuffix}`
    } else if (noVMatch) {
      const cardSlug = noVMatch[1].toLowerCase()
      const namePart = capitalizeFirst(cardSlug)
      const code = noVMatch[2]
      const num = noVMatch[3]
      // Re-check group size — might now need V1
      const groupKey = epId ? `${epId}::${cardSlug}` : null
      const groupSize = groupKey ? (slugGroupMap.get(groupKey) ?? 1) : 1
      const vPart = groupSize > 1 ? `-V1-` : "-"
      newUrl = `${epPart}/${namePart}${vPart}${code}${num}${langSuffix}`
    } else {
      errors++
      continue
    }

    if (newUrl !== rawUrl) {
      if (!DRY_RUN) {
        await prisma.card.update({ where: { id: card.id }, data: { cardmarketUrl: newUrl } })
      }
      fixed++
      if (fixed <= 10) {
        process.stdout.write(`  FIX: ${rawUrl} → ${newUrl}\n`)
      }
    } else {
      unchanged++
    }
  }

  process.stdout.write(`\n✅ Fix terminé: ${fixed} corrigées, ${unchanged} inchangées, ${errors} erreurs\n`)
}

// ── Phase 2+3: Fetch new cards and write URLs ───────────────────────────────

async function backfillNewCards(slugGroupMap: SlugGroupMap, episodeMeta: Map<number, { slug: string; code: string }>) {
  // Step 2: Load cards needing processing
  const cards = await prisma.card.findMany({
    where: {
      cardmarketId: { not: null },
      ...(FORCE ? {} : { cardmarketUrl: null }),
    },
    select: { id: true, cardmarketId: true, number: true, name: true },
    ...(LIMIT ? { take: LIMIT } : {}),
    orderBy: { cardmarketId: "asc" },
  })

  console.log(`📋 Phase 2 — ${cards.length} cartes à traiter${LIMIT ? ` (limite: ${LIMIT})` : ""}`)

  if (cards.length === 0) {
    console.log("✅ Rien à faire.")
    return
  }

  interface Collected {
    dbId:    string
    cmId:    string
    epId:    number
    epSlug:  string
    epCode:  string
    cardSlug: string
    cardNum: number
    hasFrPrice: boolean
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
      const frPrice = data.prices?.cardmarket?.lowest_near_mint_FR
      collected.push({
        dbId:       card.id,
        cmId:       card.cardmarketId!,
        epId:       data.episode.id,
        epSlug:     data.episode.slug,
        epCode:     data.episode.code,
        cardSlug:   data.slug,
        cardNum:    data.card_number,
        hasFrPrice: typeof frPrice === "number" && frPrice > 0,
      })
    }

    done++
    if (done % CHUNK === 0) {
      const pct = ((done / cards.length) * 100).toFixed(1)
      process.stdout.write(`  ${pct}% — ${done}/${cards.length} fetched · ${apiCallCount} appels · ${apiErrors} erreurs\n`)
    }

    if (apiCallCount >= DAILY_QUOTA) {
      process.stdout.write(`\n⚠️  Quota journalier atteint (${apiCallCount}/${DAILY_QUOTA})\n`)
      process.stdout.write(`   Relance demain : npx tsx scripts/backfill-cm-urls.ts\n`)
      break
    }

    await sleep(DELAY)
  }

  process.stdout.write(`\n✅ Fetch terminé: ${collected.length} succès, ${apiErrors} erreurs, ${apiCallCount} appels\n`)
  process.stdout.write(`   Phase 3 — Calcul des URLs et écriture...\n\n`)

  // Step 3: Compute V ranks using the FULL episode slug group map
  // Group collected cards by (epCode, slug) to assign V-rank within this batch,
  // but use the global slug group map for groupSize.
  const batchGroups = new Map<string, Collected[]>()
  for (const c of collected) {
    const key = `${c.epCode}::${c.cardSlug}`
    if (!batchGroups.has(key)) batchGroups.set(key, [])
    batchGroups.get(key)!.push(c)
  }

  const ranks = new Map<string, number>()
  for (const [, group] of batchGroups) {
    group.sort((a, b) => a.cardNum - b.cardNum)
    group.forEach((c, i) => ranks.set(c.dbId, i + 1))
  }

  // Write to DB
  let skipped = 0

  for (const c of collected) {
    const vRank = ranks.get(c.dbId)!
    // Use the global slug group map for accurate group size
    const globalKey = `${c.epId}::${c.cardSlug}`
    const groupSize = slugGroupMap.get(globalKey) ?? 1
    const urlPath = buildCmPath(c.epSlug, c.cardSlug, vRank, c.epCode, c.cardNum, groupSize, c.hasFrPrice)

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
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN — nothing will be written\n" : "")
  console.log(`🔢 Quota journalier : ${DAILY_QUOTA} appels\n`)

  // Phase 1: Build global slug group map from all episodes
  const { map: slugGroupMap, episodeMeta } = await buildSlugGroupMap()

  if (FIX_EXISTING) {
    await fixExistingUrls(slugGroupMap, episodeMeta)
  }

  if (!FIX_EXISTING || FORCE) {
    await backfillNewCards(slugGroupMap, episodeMeta)
  }

  await prisma.$disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
