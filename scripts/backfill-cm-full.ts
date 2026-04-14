/**
 * backfill-cm-full.ts
 *
 * One-pass Cardmarket backfill that writes `cardmarketId`, `cardmarketUrl`
 * and (when available) `priceFr` in a single Prisma update per card.
 *
 * Strategy:
 *   1. Build a comprehensive slug→PTCG-set-id map (≈100 series covering
 *      base → SV → ME, plus WOTC/EX/XY/BW/SM/SWSH).
 *   2. Load all DB cards that are missing `cardmarketUrl`, indexed by
 *      (serieId, normalizedNumber).
 *   3. Fetch all Cardmarket episodes (paginated).
 *   4. For every episode, fetch ALL pages of cards. This gives us slug,
 *      card_number, tcgid, prices and the CM numeric id in one shot —
 *      no per-card detail call needed.
 *      The first page is also used to early-exit episodes that don't
 *      contain any of our target series.
 *   5. For each matched card, build the Cardmarket URL path (with V-rank
 *      when the slug is shared within the episode) and stage an update
 *      with { cardmarketId, cardmarketUrl, priceFr, priceFrUpdatedAt }.
 *   6. Batch-write via Prisma.
 *
 * API budget: ~500 calls total for the whole catalogue (a few hundred
 * episode card-listings, each averaging 1–2 pages).
 *
 * Usage:
 *   npx tsx scripts/backfill-cm-full.ts --dry-run
 *   npx tsx scripts/backfill-cm-full.ts --only=mascarade-crepusculaire
 *   npx tsx scripts/backfill-cm-full.ts                   # live, full catalogue
 *   npx tsx scripts/backfill-cm-full.ts --quota=12000
 */

import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })

const prisma = new PrismaClient()

const DRY_RUN    = process.argv.includes("--dry-run")
const ONLY       = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1]
const QUOTA_ARG  = process.argv.find((a) => a.startsWith("--quota="))
const DAILY_QUOTA = QUOTA_ARG ? parseInt(QUOTA_ARG.split("=")[1]) : 14_000
const START_ARG  = process.argv.find((a) => a.startsWith("--start-ep="))
const START_EP   = START_ARG ? parseInt(START_ARG.split("=")[1]) : 1
const STOP_ARG   = process.argv.find((a) => a.startsWith("--stop-ep="))
const STOP_EP    = STOP_ARG ? parseInt(STOP_ARG.split("=")[1]) : Number.MAX_SAFE_INTEGER

const HOST = "cardmarket-api-tcg.p.rapidapi.com"
const KEY  = process.env.CARDMARKET_API_KEY ?? ""
if (!KEY) { console.error("❌ CARDMARKET_API_KEY not set"); process.exit(1) }

const DELAY = 200

let apiCallCount = 0

// ── Series → PTCG set id (copied from sync-card-rarities.ts) ────────────────

const SLUG_TO_PTCG: Record<string, string> = {
  // ── Mega-Evolution ────────────────────────────────────────────────────
  "mega-evolution":              "me1",
  "flammes-fantasmagoriques":    "me2",
  "heros-transcendants":         "me2pt5",
  "equilibre-parfait":           "me3",
  // ── Écarlate & Violet ─────────────────────────────────────────────────
  "rivalites-destinees":         "sv10",
  "foudre-noire":                "zsv10pt5",
  "flamme-blanche":              "rsv10pt5",
  "ecarlate-et-violet":          "sv1",
  "evolutions-a-paldea":         "sv2",
  "flammes-obsidiennes":         "sv3",
  "pokemon-151":                 "sv3pt5",
  "faille-paradoxe":             "sv4",
  "destinees-de-paldea":         "sv4pt5",
  "forces-temporelles":          "sv5",
  "mascarade-crepusculaire":     "sv6",
  "fable-nebuleuse":             "sv6pt5",
  "couronne-stellaire":          "sv7",
  "etincelles-deferlantes":      "sv8",
  "evolutions-prismatiques":     "sv8pt5",
  "aventures-ensemble":          "sv9",
  // ── Épée & Bouclier ──────────────────────────────────────────────────
  "epee-et-bouclier":            "swsh1",
  "clash-des-rebelles":          "swsh2",
  "tenebres-embrasees":          "swsh3",
  "la-voie-du-maitre":           "swsh35",
  "voltage-eclatant":            "swsh4",
  "destinees-radieuses":         "swsh45",
  "styles-de-combat":            "swsh5",
  "regne-de-glace":              "swsh6",
  "evolution-celeste":           "swsh7",
  "celebrations":                "cel25",
  "poing-de-fusion":             "swsh8",
  "stars-etincelantes":          "swsh9",
  "astres-radieux":              "swsh10",
  "pokemon-go":                  "pgo",
  "origine-perdue":              "swsh11",
  "tempete-argentee":            "swsh12",
  "zenith-supreme":              "swsh12pt5",
  // ── Soleil & Lune ────────────────────────────────────────────────────
  "soleil-et-lune":              "sm1",
  "gardiens-ascendants":         "sm2",
  "ombres-ardentes":             "sm3",
  "legendes-brillantes":         "sm35",
  "invasion-carmin":             "sm4",
  "ultra-prisme":                "sm5",
  "lumiere-interdite":           "sm6",
  "tempete-celeste":             "sm7",
  "majeste-des-dragons":         "sm75",
  "tonnerre-perdu":              "sm8",
  "duo-de-choc":                 "sm9",
  "alliance-infaillible":        "sm10",
  "harmonie-des-esprits":        "sm11",
  "destinees-occultes":          "sm115",
  "eclipse-cosmique":            "sm12",
  // ── XY ───────────────────────────────────────────────────────────────
  "xy-base":                     "xy1",
  "etincelles-xy":               "xy2",
  "poings-furieux":              "xy3",
  "vigueur-spectrale":           "xy4",
  "primo-choc":                  "xy5",
  "ciel-rugissant":              "xy6",
  "origines-antiques":           "xy7",
  "impulsion-turbo":             "xy8",
  "rupture-turbo":               "xy9",
  "impact-des-destins":          "xy10",
  "offensive-vapeur":            "xy11",
  "evolutions-xy":               "xy12",
  "double-danger":               "dc1",
  "generations":                 "g1",
  // ── Noir & Blanc ─────────────────────────────────────────────────────
  "noir-et-blanc":               "bw1",
  "pouvoirs-emergents":          "bw2",
  "nobles-victoires":            "bw3",
  "destinees-futures":           "bw4",
  "explorateurs-obscurs":        "bw5",
  "dragons-exaltes":             "bw6",
  "frontieres-franchies":        "bw7",
  "tempete-plasma":              "bw8",
  "glaciation-plasma":           "bw9",
  "explosion-plasma":            "bw10",
  // ── HeartGold & SoulSilver ───────────────────────────────────────────
  "heartgold-soulsilver-base":   "hgss1",
  "triomphe":                    "hgss2",
  "indomptable":                 "hgss3",
  "dechainement":                "hgss4",
  // ── Platine ──────────────────────────────────────────────────────────
  "platine-base":                "pl1",
  "rivaux-emergeants":           "pl2",
  "vainqueurs-supremes":         "pl3",
  "arceus":                      "pl4",
  // ── Diamant & Perle ──────────────────────────────────────────────────
  "diamant-et-perle":            "dp1",
  "tresors-mysterieux":          "dp2",
  "merveilles-secretes":         "dp3",
  "grands-envols":               "dp4",
  "aube-majestueuse":            "dp5",
  "eveil-des-legendes":          "dp6",
  "tempete-dp":                  "dp7",
  // ── EX era ───────────────────────────────────────────────────────────
  "rubis-et-saphir":             "ex1",
  "tempete-de-sable":            "ex2",
  "dragon-ex":                   "ex3",
  "groudon-vs-kyogre":           "ex4",
  "legendes-oubliees":           "ex5",
  "fire-red-leaf-green":         "ex6",
  "team-rocket-returns":         "ex7",
  "deoxys":                      "ex8",
  "emeraude":                    "ex9",
  "forces-cachees":              "ex10",
  "especes-delta":               "ex11",
  "createurs-de-legendes":       "ex12",
  "fantomes-holon":              "ex13",
  "gardiens-de-cristal":         "ex14",
  "gardiens-du-pouvoir":         "ex16",
  // ── WOTC / e-card ────────────────────────────────────────────────────
  "set-de-base":                 "base1",
  "jungle":                      "base2",
  "fossile":                     "base3",
  "set-de-base-2":                "base4",
  "team-rocket":                 "base5",
  "gym-heroes":                  "gym1",
  "gym-challenge":               "gym2",
  "expedition":                  "ecard1",
  "aquapolis":                   "ecard2",
  "skyridge":                    "ecard3",
}

// ── URL helpers (same algo as backfill-cm-urls.ts) ──────────────────────────

function capitalizeDashWords(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("-")
}
function capitalizeFirst(slug: string): string {
  if (!slug) return slug
  return slug.charAt(0).toUpperCase() + slug.slice(1)
}

function buildCmPath(
  epSlug: string,
  cardSlug: string,
  vRank: number,
  epCode: string,
  cardNum: number,
  groupSize: number,
  hasFrPrice: boolean,
): string {
  const epPart   = capitalizeDashWords(epSlug)
  const namePart = capitalizeFirst(cardSlug)
  const numPart  = String(cardNum).padStart(3, "0")
  const vPart    = groupSize > 1 ? `-V${vRank}-` : "-"
  const langSuffix = hasFrPrice ? "?language=2" : ""
  return `${epPart}/${namePart}${vPart}${epCode}${numPart}${langSuffix}`
}

function normalizeNumber(n: string): string {
  return n.replace(/^([A-Z]*)0+(\d+)$/, "$1$2")
}

// ── API helpers ─────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function apiFetch<T>(path: string): Promise<T | null> {
  if (apiCallCount >= DAILY_QUOTA) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  try {
    const res = await fetch(`https://${HOST}${path}`, {
      headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": KEY },
      signal: controller.signal,
    })
    clearTimeout(timer)
    apiCallCount++
    if (!res.ok) {
      process.stdout.write(`    ⚠ HTTP ${res.status} on ${path}\n`)
      return null
    }
    return (await res.json()) as T
  } catch (e) {
    clearTimeout(timer)
    process.stdout.write(`    ⚠ fetch error on ${path}: ${(e as Error).message}\n`)
    return null
  }
}

// ── API response types ─────────────────────────────────────────────────────

interface CMEpisode {
  id: number
  name: string
  slug: string
  code: string
  cards_total?: number
}

interface CMCard {
  id: number
  name: string
  slug: string
  card_number: number
  tcgid?: string | null
  prices?: { cardmarket?: { lowest_near_mint_FR?: number | null } | null } | null
}

interface CMListResponse<T> {
  data?: T[]
  paging?: { current: number; total: number }
}

// ── Main ────────────────────────────────────────────────────────────────────

interface PendingUpdate {
  cardId:        string
  cmId:          string
  cardmarketUrl: string
  priceFr:       number | null
}

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN — aucune écriture\n" : "")
  console.log(`🔢 Quota journalier : ${DAILY_QUOTA} appels\n`)

  // 1. Build ptcgSetId → { serieId, serieSlug, serieName } ────────────────
  const filter = ONLY ? (slug: string) => slug === ONLY : () => true

  const dbSeries = await prisma.serie.findMany({
    select: { id: true, slug: true, name: true },
  })
  const slugToSerie = new Map(dbSeries.map((s) => [s.slug, s]))

  const ptcgToSerie = new Map<
    string,
    { serieId: string; serieSlug: string; serieName: string }
  >()
  for (const [slug, ptcgId] of Object.entries(SLUG_TO_PTCG)) {
    if (!filter(slug)) continue
    const s = slugToSerie.get(slug)
    if (!s) { process.stdout.write(`  ⚠  ${slug} absent de la DB — skip\n`); continue }
    ptcgToSerie.set(ptcgId.toLowerCase(), { serieId: s.id, serieSlug: s.slug, serieName: s.name })
  }

  if (ptcgToSerie.size === 0) {
    console.log("❌ Aucune série ciblée. Vérifie --only=<slug>.")
    await prisma.$disconnect()
    return
  }

  console.log(`🎯 ${ptcgToSerie.size} série(s) ciblée(s)\n`)

  // 2. Load DB cards missing cardmarketUrl, keyed by (serieId, normNum) ───
  const targetSerieIds = [...ptcgToSerie.values()].map((v) => v.serieId)
  const dbCards = await prisma.card.findMany({
    where: {
      serieId: { in: targetSerieIds },
      cardmarketUrl: null,
    },
    select: { id: true, serieId: true, number: true, name: true },
  })
  console.log(`📋 ${dbCards.length} cartes sans \`cardmarketUrl\` à traiter\n`)

  if (dbCards.length === 0) {
    console.log("✅ Rien à faire.")
    await prisma.$disconnect()
    return
  }

  // Map: `${serieId}::${normNum}` → card.id
  const dbCardMap = new Map<string, { id: string; name: string }>()
  for (const c of dbCards) {
    const keyRaw  = `${c.serieId}::${c.number}`
    const keyNorm = `${c.serieId}::${normalizeNumber(c.number)}`
    dbCardMap.set(keyRaw,  { id: c.id, name: c.name })
    dbCardMap.set(keyNorm, { id: c.id, name: c.name })
  }

  // 3. Fetch all CM episodes ─────────────────────────────────────────────
  process.stdout.write("📡 Récupération des épisodes Cardmarket…\n")
  const episodes: CMEpisode[] = []
  for (let page = 1; page <= 20; page++) {
    const body = await apiFetch<CMListResponse<CMEpisode>>(
      `/pokemon/episodes?per_page=100&page=${page}`,
    )
    if (!body?.data?.length) break
    episodes.push(...body.data)
    if (body.paging && body.paging.current >= body.paging.total) break
    await sleep(DELAY)
  }
  console.log(`   ${episodes.length} épisodes trouvés · ${apiCallCount} appels\n`)

  // 4. For each episode, fetch all cards. Early-exit if no target match ─
  // We flush writes per-episode so partial runs always save progress.
  let totalWritten    = 0
  let matchedEpisodes = 0
  let skippedEpisodes = 0
  let idx = 0
  const now = new Date()
  const recordedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  for (const ep of episodes) {
    idx++
    if (idx < START_EP) continue
    if (idx > STOP_EP) { process.stdout.write(`\n⏹  Stop-ep ${STOP_EP} atteint\n`); break }
    if (apiCallCount >= DAILY_QUOTA) {
      process.stdout.write(`\n⚠️  Quota atteint (${apiCallCount}/${DAILY_QUOTA}) — arrêt\n`)
      break
    }

    // First page: decide whether this episode is one of ours
    const firstBody = await apiFetch<CMListResponse<CMCard>>(
      `/pokemon/episodes/${ep.id}/cards?per_page=100&page=1`,
    )
    if (!firstBody?.data?.length) { skippedEpisodes++; await sleep(DELAY); continue }

    const firstPage = firstBody.data
    const hasTarget = firstPage.some((c) => {
      const setId = (c.tcgid ?? "").split("-").slice(0, -1).join("-").toLowerCase()
      return setId && ptcgToSerie.has(setId)
    })
    if (!hasTarget) { skippedEpisodes++; await sleep(DELAY); continue }
    matchedEpisodes++

    // Fetch remaining pages
    const cmCards: CMCard[] = [...firstPage]
    const totalPages = firstBody.paging?.total ?? 1
    for (let p = 2; p <= totalPages; p++) {
      await sleep(DELAY)
      const body = await apiFetch<CMListResponse<CMCard>>(
        `/pokemon/episodes/${ep.id}/cards?per_page=100&page=${p}`,
      )
      if (!body?.data?.length) break
      cmCards.push(...body.data)
    }

    // Build in-episode slug-group map → needed for V-rank
    const slugGroup = new Map<string, CMCard[]>()
    for (const c of cmCards) {
      if (!c.slug) continue
      if (!slugGroup.has(c.slug)) slugGroup.set(c.slug, [])
      slugGroup.get(c.slug)!.push(c)
    }
    for (const group of slugGroup.values()) {
      group.sort((a, b) => a.card_number - b.card_number)
    }

    // Match each CM card to a DB card
    const epPending: PendingUpdate[] = []
    for (const cm of cmCards) {
      const tcgid = cm.tcgid ?? ""
      if (!tcgid) continue
      const setId = tcgid.split("-").slice(0, -1).join("-").toLowerCase()
      const target = ptcgToSerie.get(setId)
      if (!target) continue

      const numStr = String(cm.card_number)
      const dbEntry =
        dbCardMap.get(`${target.serieId}::${numStr}`) ??
        dbCardMap.get(`${target.serieId}::${normalizeNumber(numStr)}`)
      if (!dbEntry) continue

      const priceFr = cm.prices?.cardmarket?.lowest_near_mint_FR ?? null
      const hasFr   = typeof priceFr === "number" && priceFr > 0

      const group     = slugGroup.get(cm.slug) ?? [cm]
      const groupSize = group.length
      const vRank     = group.findIndex((g) => g.id === cm.id) + 1

      const cardmarketUrl = buildCmPath(
        ep.slug,
        cm.slug,
        vRank,
        ep.code,
        cm.card_number,
        groupSize,
        hasFr,
      )

      epPending.push({
        cardId:        dbEntry.id,
        cmId:          String(cm.id),
        cardmarketUrl,
        priceFr:       hasFr ? priceFr! : null,
      })
    }

    // Flush this episode to DB immediately (per-episode durability)
    if (epPending.length > 0 && !DRY_RUN) {
      await flushUpdates(epPending, now, recordedAt)
      // Remove the written card ids from the map so we don't rewrite them
      for (const p of epPending) {
        // no key uniqueness by id, so we just let map be — duplicates are rare
      }
    }
    totalWritten += epPending.length

    process.stdout.write(
      `  [${String(idx).padStart(3)}/${episodes.length}] ${ep.name.padEnd(40).slice(0,40)} ` +
      `${String(epPending.length).padStart(4)} match · ${apiCallCount} appels · ${totalWritten} written\n`,
    )

    await sleep(DELAY)
  }

  console.log(
    `\n📊 Scan terminé: ${matchedEpisodes} épisodes ciblés, ${skippedEpisodes} ignorés, ${totalWritten} cartes mises à jour · ${apiCallCount} appels API`,
  )
  await prisma.$disconnect()
}

// ── DB flush helper ─────────────────────────────────────────────────────────

async function flushUpdates(
  pending: PendingUpdate[],
  now: Date,
  recordedAt: Date,
) {
  // Sequential writes — small batches via Promise.all exhausted the Prisma
  // connection pool (25) when episodes had 20+ matches × 2 queries each.
  for (const p of pending) {
    await prisma.card.update({
      where: { id: p.cardId },
      data: {
        cardmarketId:  p.cmId,
        cardmarketUrl: p.cardmarketUrl,
        ...(p.priceFr != null
          ? { priceFr: p.priceFr, priceFrUpdatedAt: now }
          : {}),
      },
    })
    if (p.priceFr != null) {
      await prisma.cardPriceHistory.upsert({
        where: { cardId_recordedAt: { cardId: p.cardId, recordedAt } },
        create: {
          cardId:     p.cardId,
          price:      p.priceFr,
          priceFr:    p.priceFr,
          source:     "cardmarket-api",
          recordedAt,
        },
        update: { priceFr: p.priceFr },
      })
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
