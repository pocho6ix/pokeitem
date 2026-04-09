/**
 * Backfill French card prices from Cardmarket (RapidAPI).
 *
 * Fetches all episodes from the cardmarket-api-tcg API, paginated.
 * For each episode, fetches all cards and matches them to DB cards
 * via the tcgid prefix (e.g. "sv3pt5-9" → set "sv3pt5").
 *
 * Usage:
 *   npx tsx scripts/backfill-french-prices.ts
 *   npx tsx scripts/backfill-french-prices.ts --dry-run
 */

import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes("--dry-run")
const HOST = "cardmarket-api-tcg.p.rapidapi.com"
const KEY = process.env.CARDMARKET_API_KEY ?? ""

if (!KEY) {
  console.error("❌ CARDMARKET_API_KEY is not set")
  process.exit(1)
}

// ─── Same SLUG_TO_PTCG map as the scraper ────────────────────────────────────

const SLUG_TO_PTCG: Record<string, string> = {
  "rivalites-destinees":         "sv10",
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
  "epee-et-bouclier":            "swsh1",
  "clash-des-rebelles":          "swsh2",
  "tenebres-embrasees":          "swsh3",
  "la-voie-du-maitre":           "swsh3pt5",
  "voltage-eclatant":            "swsh4",
  "destinees-radieuses":         "swsh4pt5",
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
  "soleil-et-lune":              "sm1",
  "gardiens-ascendants":         "sm2",
  "ombres-ardentes":             "sm3",
  "legendes-brillantes":         "sm3pt5",
  "invasion-carmin":             "sm4",
  "ultra-prisme":                "sm5",
  "lumiere-interdite":           "sm6",
  "tempete-celeste":             "sm7",
  "majeste-des-dragons":         "sm7pt5",
  "tonnerre-perdu":              "sm8",
  "duo-de-choc":                 "sm9",
  "alliance-infaillible":        "sm10",
  "harmonie-des-esprits":        "sm11",
  "destinees-occultes":          "sm115",
  "eclipse-cosmique":            "sm12",
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
  "generations":                 "g1",
  "double-danger":               "dc1",
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
  "heartgold-soulsilver-base":   "hgss1",
  "dechainement":                "hgss2",
  "indomptable":                 "hgss3",
  "triomphe":                    "hgss4",
  "platine-base":                "pl1",
  "rivaux-emergeants":           "pl2",
  "vainqueurs-supremes":         "pl3",
  "arceus":                      "pl4",
  "diamant-et-perle":            "dp1",
  "tresors-mysterieux":          "dp2",
  "merveilles-secretes":         "dp3",
  "grands-envols":               "dp4",
  "aube-majestueuse":            "dp5",
  "eveil-des-legendes":          "dp6",
  "tempete-dp":                  "dp7",
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
  "set-de-base":                 "base1",
  "jungle":                      "base2",
  "fossile":                     "base3",
  "set-de-base-2":               "base4",
  "team-rocket":                 "base5",
  "gym-heroes":                  "gym1",
  "gym-challenge":               "gym2",
  "expedition":                  "ecard1",
  "aquapolis":                   "ecard2",
  "skyridge":                    "ecard3",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeNumber(n: string): string {
  return n.replace(/^([A-Z]*)0+(\d+)$/, "$1$2")
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchAllPages<T>(
  buildUrl: (page: number) => string,
  label: string
): Promise<T[]> {
  const all: T[] = []
  let page = 1
  while (true) {
    const res = await fetch(buildUrl(page), {
      headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": KEY },
    })
    if (!res.ok) {
      console.warn(`  ⚠ ${label} p${page} → HTTP ${res.status}`)
      break
    }
    const body = await res.json() as { data?: T[]; paging?: { current: number; total: number } }
    const items: T[] = body.data ?? (body as unknown as T[])
    all.push(...items)
    if (!body.paging || body.paging.current >= body.paging.total) break
    page++
    await sleep(200)
  }
  return all
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) console.log("DRY RUN — aucune écriture en DB\n")

  // Build ptcgId (lowercase) → serieId map
  const seriesInDb = await prisma.serie.findMany({ select: { id: true, slug: true } })
  const slugToId = new Map(seriesInDb.map((s) => [s.slug, s.id]))
  const ptcgToSerieId = new Map<string, string>()
  for (const [slug, ptcgId] of Object.entries(SLUG_TO_PTCG)) {
    const id = slugToId.get(slug)
    if (id) ptcgToSerieId.set(ptcgId.toLowerCase(), id)
  }
  console.log(`${ptcgToSerieId.size} séries avec mapping PTCG`)

  // Fetch all CM episodes (paginated)
  console.log("Récupération des épisodes Cardmarket…")
  const episodes = await fetchAllPages<{ id: number; name: string }>(
    (p) => `https://${HOST}/pokemon/episodes?per_page=100&page=${p}`,
    "episodes"
  )
  console.log(`${episodes.length} épisodes trouvés\n`)

  const now = new Date()
  const recordedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const CHUNK = 50
  let totalSeries = 0
  let totalCards = 0

  // Pre-load DB cards per serieId (lazy, cached)
  const dbCardsCache = new Map<string, Map<string, string>>() // serieId → number → cardId

  async function getDbMap(serieId: string): Promise<Map<string, string>> {
    if (dbCardsCache.has(serieId)) return dbCardsCache.get(serieId)!
    const cards = await prisma.card.findMany({
      where: { serieId },
      select: { id: true, number: true },
    })
    const m = new Map<string, string>()
    for (const c of cards) {
      m.set(c.number, c.id)
      m.set(normalizeNumber(c.number), c.id)
    }
    dbCardsCache.set(serieId, m)
    return m
  }

  // Collect all updates grouped by serieId
  const updatesBySerie = new Map<string, Array<{ id: string; priceFr: number }>>()

  for (const ep of episodes) {
    const cmCards = await fetchAllPages<{
      id: number
      name: string
      card_number: number | string
      tcgid?: string | null
      prices?: { cardmarket?: { lowest_near_mint_FR?: number | null } | null } | null
    }>(
      (p) => `https://${HOST}/pokemon/episodes/${ep.id}/cards?per_page=100&page=${p}`,
      `ep-${ep.id}`
    )

    if (cmCards.length === 0) continue

    let epMatched = 0
    for (const cm of cmCards) {
      const tcgid = cm.tcgid ?? ""
      if (!tcgid) continue
      const setId = tcgid.split("-").slice(0, -1).join("-").toLowerCase()
      if (!setId) continue
      const serieId = ptcgToSerieId.get(setId)
      if (!serieId) continue

      const priceFr = cm.prices?.cardmarket?.lowest_near_mint_FR ?? null
      if (!priceFr || priceFr <= 0) continue

      const dbMap = await getDbMap(serieId)
      const numStr = String(cm.card_number)
      const cardId = dbMap.get(numStr) ?? dbMap.get(normalizeNumber(numStr))
      if (!cardId) continue

      if (!updatesBySerie.has(serieId)) updatesBySerie.set(serieId, [])
      updatesBySerie.get(serieId)!.push({ id: cardId, priceFr })
      epMatched++
    }

    if (epMatched > 0) {
      process.stdout.write(`  ✅ ${ep.name.padEnd(35)} ${epMatched} cartes FR\n`)
    }

    await sleep(300)
  }

  // Write to DB
  console.log(`\nÉcriture en DB…`)
  for (const [serieId, updates] of updatesBySerie) {
    if (DRY_RUN) { totalSeries++; totalCards += updates.length; continue }
    for (let i = 0; i < updates.length; i += CHUNK) {
      const chunk = updates.slice(i, i + CHUNK)
      await Promise.all(
        chunk.map((u) =>
          prisma.card.update({
            where: { id: u.id },
            data: { priceFr: u.priceFr, priceFrUpdatedAt: now },
          })
        )
      )
      await Promise.all(
        chunk.map((u) =>
          prisma.cardPriceHistory.upsert({
            where: { cardId_recordedAt: { cardId: u.id, recordedAt } },
            create: { cardId: u.id, price: u.priceFr, priceFr: u.priceFr, source: "cardmarket-api", recordedAt },
            update: { priceFr: u.priceFr },
          })
        )
      )
    }
    totalSeries++
    totalCards += updates.length
  }

  console.log(`\nTerminé — ${totalSeries} séries · ${totalCards} cartes avec prix FR`)
  if (DRY_RUN) console.log("(dry-run : rien n'a été écrit)")
  await prisma.$disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
