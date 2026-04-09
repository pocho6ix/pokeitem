/**
 * Comprehensive FR price backfill for ALL remaining extensions.
 * Maps every DB slug to its CM API episode ID(s) and fetches missing FR prices.
 *
 * Usage:
 *   npx tsx scripts/backfill-fr-prices-comprehensive.ts
 *   npx tsx scripts/backfill-fr-prices-comprehensive.ts --dry-run
 *   npx tsx scripts/backfill-fr-prices-comprehensive.ts --slug=destinees-radieuses
 */

import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes("--dry-run")
const SLUG_FILTER = process.argv.find((a) => a.startsWith("--slug="))?.split("=")[1]
const HOST = "cardmarket-api-tcg.p.rapidapi.com"
const KEY = process.env.CARDMARKET_API_KEY ?? ""

if (!KEY) { console.error("❌ CARDMARKET_API_KEY is not set"); process.exit(1) }

// ─── Episode → DB slug mapping ───────────────────────────────────────────────
// Each entry: slug → array of episode IDs to fetch
// Multiple episodes when a set is split (Trainer Gallery, Shiny Vault, Gallery, etc.)
const SLUG_TO_EPISODES: Record<string, number[]> = {
  // ── SWSH ──────────────────────────────────────────────────────────────────
  "destinees-radieuses":  [40, 41],      // Shining Fates + Shiny Vault
  "la-voie-du-maitre":    [44],          // Champion's Path
  "zenith-supreme":       [21, 22],      // Crown Zenith + Galarian Gallery
  "stars-etincelantes":   [32, 33],      // Brilliant Stars + Trainer Gallery
  "astres-radieux":       [30, 31],      // Astral Radiance + Trainer Gallery
  "origine-perdue":       [26, 27],      // Lost Origin + Trainer Gallery
  "tempete-argentee":     [24, 25],      // Silver Tempest + Trainer Gallery
  "celebrations":         [35, 36],      // Celebrations + Classic Collection
  "clash-des-rebelles":   [47],          // Rebel Clash
  "epee-et-bouclier":     [48],          // Sword & Shield
  "pokemon-go":           [29],          // Pokémon GO
  "fusions-des-destinees":[34],          // Fusion Strike

  // ── SV ────────────────────────────────────────────────────────────────────
  "evolutions-a-paldea":  [18],          // Paldea Evolved
  "ecarlate-et-violet":   [19],          // Scarlet & Violet base
  "flammes-obsidiennes":  [17],          // Obsidian Flames
  "cent-cinquante-et-un": [16],          // 151
  "paradox-rift":         [15],          // Paradox Rift
  "destins-de-paldea":    [14],          // Paldean Fates
  "forces-temporelles":   [13],          // Temporal Forces
  "mascarade-crepusculaire": [12],       // Twilight Masquerade
  "fables-nebuleuses":    [11],          // Shrouded Fable
  "couronne-stellaire":   [10],          // Stellar Crown
  "etincelles-survolees": [172],         // Surging Sparks
  "evolutions-prismatiques": [212],      // Prismatic Evolutions

  // ── Promos & spéciaux ────────────────────────────────────────────────────
  "promos-ecarlate-et-violet":    [23],  // SV Black Star Promos
  "energies-ecarlate-et-violet":  [20],  // Scarlet & Violet Energies
  "promos-epee-et-bouclier":      [49],  // SWSH Black Star Promos
  "promos-soleil-et-lune":        [70],  // SM Black Star Promos
  "promos-xy":                    [90],  // XY Black Star Promos
  "bienvenue-a-kalos":            [88],  // Kalos Starter Set
  "promos-noir-et-blanc":         [104], // BW Black Star Promos
  "coffre-des-dragons":           [95],  // Dragon Vault
  "promos-heartgold-soulsilver":  [110], // HGSS Black Star Promos
  "promos-diamant-et-perle":      [127], // DP Black Star Promos
  "promos-nintendo":              [151], // Nintendo Black Star Promos

  // ── SM ────────────────────────────────────────────────────────────────────
  "legendes-brillantes":  [66],          // Shining Legends (sm3.5)
  "majeste-des-dragons":  [60],          // Dragon Majesty (sm7.5)
  "tonnerre-perdu":       [58],          // Lost Thunder
  "duo-de-choc":          [57],          // Team Up
  "alliance-infaillible": [55],          // Unbroken Bonds
  "harmonie-des-esprits": [54],          // Unified Minds
  "eclipse-cosmique":     [50],          // Cosmic Eclipse
  "tempete-celeste":      [61],          // Celestial Storm
  "lumiere-interdite":    [62],          // Forbidden Light
  "ultra-prisme":         [63],          // Ultra Prism
  "ombres-ardentes":      [67],          // Burning Shadows
  "gardiens-ascendants":  [68],          // Guardians Rising
  "soleil-et-lune":       [69],          // Sun & Moon

  // ── XY ────────────────────────────────────────────────────────────────────
  "evolutions-xy":        [71],          // Evolutions
  "offensive-vapeur":     [73],          // Steam Siege
  "impact-des-destins":   [74],          // Fates Collide
  "generations":          [75],          // Generations
  "rupture-turbo":        [76],          // BREAKpoint
  "impulsion-turbo":      [78],          // BREAKthrough
  "origines-antiques":    [79],          // Ancient Origins
  "ciel-rugissant":       [80],          // Roaring Skies
  "primo-choc":           [82],          // Primal Clash
  "vigueur-spectrale":    [83],          // Phantom Forces
  "poings-furieux":       [84],          // Furious Fists
  "etincelles-xy":        [86],          // Flashfire
  "xy-base":              [87],          // XY

  // ── BW ────────────────────────────────────────────────────────────────────
  "noir-et-blanc":        [103],         // Black & White
  "nobles-victoires":     [100],         // Noble Victories
  "destinees-futures":    [99],          // Next Destinies
  "explorateurs-obscurs": [98],          // Dark Explorers
  "dragons-exaltes":      [96],          // Dragons Exalted
  "frontieres-franchies": [94],          // Boundaries Crossed
  "tempete-plasma":       [93],          // Plasma Storm
  "glaciation-plasma":    [92],          // Plasma Freeze
  "explosion-plasma":     [91],          // Plasma Blast

  // ── HGSS ──────────────────────────────────────────────────────────────────
  "heartgold-soulsilver-base": [109],    // HeartGold & SoulSilver
  "dechainement":         [108],         // HS—Unleashed
  "indomptable":          [107],         // HS—Undaunted
  "triomphe":             [106],         // HS—Triumphant
  "arceus":               [112],         // Arceus

  // ── DP ────────────────────────────────────────────────────────────────────
  "diamant-et-perle":     [126],         // Diamond & Pearl
  "tresors-mysterieux":   [125],         // Mysterious Treasures
  "merveilles-secretes":  [123],         // Secret Wonders
  "grands-envols":        [122],         // Great Encounters
  "aube-majestueuse":     [120],         // Majestic Dawn
  "eveil-des-legendes":   [119],         // Legends Awakened
  "tempete-dp":           [117],         // Stormfront
  "platine-base":         [116],         // Platinum
  "rivaux-emergeants":    [114],         // Rising Rivals
  "vainqueurs-supremes":  [113],         // Supreme Victors

  // ── EX era ────────────────────────────────────────────────────────────────
  "rubis-et-saphir":      [153],         // EX Ruby & Sapphire
  "tempete-de-sable":     [152],         // EX Sandstorm
  "dragon-ex":            [150],         // EX Dragon
  "groudon-vs-kyogre":    [149],         // EX Team Magma vs Team Aqua
  "legendes-oubliees":    [146],         // EX Hidden Legends
  "fire-red-leaf-green":  [144],         // EX FireRed & LeafGreen
  "deoxys":               [142],         // EX Deoxys
  "emeraude":             [141],         // EX Emerald
  "forces-cachees":       [139],         // EX Unseen Forces
  "especes-delta":        [138],         // EX Delta Species
  "createurs-de-legendes":[137],         // EX Legend Maker
  "fantomes-holon":       [133],         // EX Holon Phantoms
  "gardiens-de-cristal":  [131],         // EX Crystal Guardians
  "gardiens-du-pouvoir":  [129],         // EX Power Keepers

  // ── WOTC ──────────────────────────────────────────────────────────────────
  "set-de-base-2":        [167],         // Base Set 2
  "gym-heroes":           [165],         // Gym Heroes
  "gym-challenge":        [164],         // Gym Challenge
  "team-rocket":          [166],         // Team Rocket
  "skyridge":             [154],         // Skyridge
  "aquapolis":            [155],         // Aquapolis
  "expedition":           [157],         // Expedition Base Set
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

function normalizeNumber(n: string): string {
  // "001" → "1", "TG01" → "TG1", "GG01" → "GG1", "001/195" → "1"
  return n
    .replace(/\/.*$/, "")                          // strip "/total" suffix
    .replace(/^([A-Za-z]*)0+(\d+)$/, "$1$2")      // strip leading zeros
}

function buildNumberVariants(n: string): string[] {
  const norm = normalizeNumber(n)
  const variants = new Set([n, norm])
  return Array.from(variants)
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, {
    headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": KEY },
  })
  if (!res.ok) { console.warn(`  ⚠ HTTP ${res.status} — ${url}`); return null }
  return res.json() as Promise<T>
}

type CMCard = {
  id: number
  card_number: number | string
  name: string
  prices?: { cardmarket?: { lowest_near_mint_FR?: number | null } | null } | null
}

type EpisodeBody = {
  data?: CMCard[]
  paging?: { current: number; total: number }
}

async function fetchEpisodeCards(epId: number): Promise<CMCard[]> {
  const cards: CMCard[] = []
  let page = 1
  while (true) {
    const body = await fetchJson<EpisodeBody>(
      `https://${HOST}/pokemon/episodes/${epId}/cards?per_page=100&page=${page}`
    )
    if (!body?.data) break
    cards.push(...body.data)
    if (!body.paging || body.paging.current >= body.paging.total) break
    page++
    await sleep(200)
  }
  return cards
}

// ─── Main ────────────────────────────────────────────────────────────────────

interface SlugResult {
  slug: string
  dbTotal: number
  dbMissing: number
  matched: number
  noFrPrice: number
  notInCm: number
  apiCalls: number
}

async function main() {
  if (DRY_RUN) console.log("DRY RUN — aucune écriture\n")
  if (SLUG_FILTER) console.log(`Filtre slug: ${SLUG_FILTER}\n`)

  // Determine which slugs to process
  const slugsToProcess = SLUG_FILTER
    ? [SLUG_FILTER]
    : Object.keys(SLUG_TO_EPISODES)

  // Load DB cards for all target series
  const seriesInDb = await prisma.serie.findMany({
    where: { slug: { in: slugsToProcess } },
    select: {
      slug: true,
      cards: {
        where: { priceFr: null },        // only cards missing FR price
        select: { id: true, number: true },
      },
    },
  })

  // Build per-slug card map (number → cardId) for cards missing FR price
  const slugToMissingMap = new Map<string, Map<string, string>>()
  const slugToTotalMissing = new Map<string, number>()

  for (const serie of seriesInDb) {
    const cardMap = new Map<string, string>()
    for (const c of serie.cards) {
      for (const v of buildNumberVariants(c.number)) {
        cardMap.set(v, c.id)
      }
    }
    slugToMissingMap.set(serie.slug, cardMap)
    slugToTotalMissing.set(serie.slug, serie.cards.length)
  }

  const now = new Date()
  const recordedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const results: SlugResult[] = []
  const allUpdates: Array<{ cardId: string; priceFr: number; cmApiCardId: number }> = []
  let totalApiCalls = 0

  for (const slug of slugsToProcess) {
    const episodes = SLUG_TO_EPISODES[slug]
    if (!episodes) continue

    const cardMap = slugToMissingMap.get(slug)
    const dbMissing = slugToTotalMissing.get(slug) ?? 0

    if (!cardMap || dbMissing === 0) {
      // No missing cards for this slug — skip API calls
      if (cardMap !== undefined) {
        console.log(`✅ ${slug} — aucune carte manquante`)
      } else {
        console.log(`⚠ ${slug} — non trouvé en DB`)
      }
      continue
    }

    console.log(`\n🎯 ${slug} (${dbMissing} manquantes) — épisodes ${episodes.join(", ")}`)

    let matched = 0
    let noFrPrice = 0
    let notInCm = 0
    let epApiCalls = 0
    const remaining = new Map(cardMap)
    const matchedIds = new Set<string>()

    for (const epId of episodes) {
      const cmCards = await fetchEpisodeCards(epId)
      // Count pages fetched (rough estimate based on cards count)
      epApiCalls += Math.ceil(cmCards.length / 100) || 1
      totalApiCalls += Math.ceil(cmCards.length / 100) || 1

      for (const cm of cmCards) {
        const priceFr = cm.prices?.cardmarket?.lowest_near_mint_FR ?? null
        const numStr = String(cm.card_number)
        const variants = buildNumberVariants(numStr)

        let cardId: string | undefined
        for (const v of variants) {
          cardId = remaining.get(v)
          if (cardId) break
        }

        if (!cardId) continue

        if (!priceFr || priceFr <= 0) {
          if (!matchedIds.has(cardId)) noFrPrice++
          for (const v of variants) remaining.delete(v)
          continue
        }

        if (!matchedIds.has(cardId)) {
          allUpdates.push({ cardId, priceFr, cmApiCardId: cm.id })
          matched++
          matchedIds.add(cardId)
        }
        for (const v of variants) remaining.delete(v)
      }

      await sleep(300)
    }

    notInCm = remaining.size

    console.log(`   ✅ ${matched} matchées avec prix FR`)
    console.log(`   〰 ${noFrPrice} trouvées en CM mais sans prix FR`)
    console.log(`   ❌ ${notInCm} non trouvées dans CM API`)
    console.log(`   📡 ${epApiCalls} appels API (total: ${totalApiCalls})`)

    results.push({ slug, dbTotal: 0, dbMissing, matched, noFrPrice, notInCm, apiCalls: epApiCalls })
  }

  // ─── DB writes ─────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(60)}`)
  console.log(`📊 Total: ${allUpdates.length} cartes avec prix FR à écrire`)
  console.log(`📡 Total appels API: ${totalApiCalls}`)

  if (!DRY_RUN && allUpdates.length > 0) {
    const CHUNK = 50
    console.log("\nÉcriture en DB…")
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
      process.stdout.write(`\r  ${Math.min(i + CHUNK, allUpdates.length)}/${allUpdates.length}`)
    }
    console.log(`\n✅ ${allUpdates.length} cartes mises à jour`)
  }

  if (DRY_RUN) console.log("\n(dry-run : rien n'a été écrit)")

  // ─── Recap table ──────────────────────────────────────────────────────────
  if (results.length > 0) {
    console.log(`\n${"─".repeat(60)}`)
    console.log("RÉCAP PAR EXTENSION\n")
    console.log("Slug".padEnd(32) + "Manq.".padStart(6) + "Matchées".padStart(10) + "Sans prix".padStart(10) + "Non CM".padStart(8))
    console.log("─".repeat(66))
    for (const r of results) {
      const icon = r.matched === r.dbMissing ? "✅" : r.matched > 0 ? "〰 " : "❌"
      console.log(
        `${icon} ${r.slug.padEnd(30)}` +
        `${r.dbMissing.toString().padStart(6)}` +
        `${r.matched.toString().padStart(10)}` +
        `${r.noFrPrice.toString().padStart(10)}` +
        `${r.notInCm.toString().padStart(8)}`
      )
    }
  }

  await prisma.$disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
