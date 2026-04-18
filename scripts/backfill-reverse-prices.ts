/**
 * Backfill reverse holo prices from tcgdex.net for all series.
 *
 * Runs the same logic as `updateReversePrices()` in the cron scraper but
 * can be invoked one-off from the CLI for the initial population, or
 * scoped to a single series via --slug=<series-slug>.
 *
 * Usage:
 *   npx tsx scripts/backfill-reverse-prices.ts                # all series
 *   npx tsx scripts/backfill-reverse-prices.ts --slug=heros-transcendants
 *   npx tsx scripts/backfill-reverse-prices.ts --dry-run      # no writes
 */

import { PrismaClient } from "@prisma/client"
import { fetchTCGdexReverseForSet } from "../src/lib/tcgdex-reverse"
import { isSpecialCard } from "../src/lib/pokemon/card-variants"

const prisma = new PrismaClient()

// Keep in sync with src/app/api/scraper/route.ts SLUG_TO_TCGDEX
const SLUG_TO_TCGDEX: Record<string, string> = {
  // ── Méga-Évolution ──────────────────────────────────────────────────────────
  "mega-evolution":            "me01",
  "flammes-fantasmagoriques":  "me02",
  "heros-transcendants":       "me02.5",
  "equilibre-parfait":         "me03",

  // ── Écarlate & Violet ───────────────────────────────────────────────────────
  "ecarlate-et-violet":        "sv01",
  "evolutions-a-paldea":       "sv02",
  "flammes-obsidiennes":       "sv03",
  "pokemon-151":               "sv03.5",
  "faille-paradoxe":           "sv04",
  "destinees-de-paldea":       "sv04.5",
  "forces-temporelles":        "sv05",
  "mascarade-crepusculaire":   "sv06",
  "fable-nebuleuse":           "sv06.5",
  "couronne-stellaire":        "sv07",
  "etincelles-deferlantes":    "sv08",
  "evolutions-prismatiques":   "sv08.5",
  "aventures-ensemble":        "sv09",
  "rivalites-destinees":       "sv10",
  "foudre-noire":              "sv10.5b",
  "flamme-blanche":            "sv10.5w",

  // ── Épée & Bouclier ─────────────────────────────────────────────────────────
  "epee-et-bouclier":          "swsh1",
  "clash-des-rebelles":        "swsh2",
  "tenebres-embrasees":        "swsh3",
  "la-voie-du-maitre":         "swsh3.5",
  "voltage-eclatant":          "swsh4",
  "destinees-radieuses":       "swsh4.5",
  "styles-de-combat":          "swsh5",
  "regne-de-glace":            "swsh6",
  "evolution-celeste":         "swsh7",
  "poing-de-fusion":           "swsh8",
  "stars-etincelantes":        "swsh9",
  "astres-radieux":            "swsh10",
  "pokemon-go":                "swsh10.5",
  "origine-perdue":            "swsh11",
  "tempete-argentee":          "swsh12",
  "zenith-supreme":            "swsh12.5",

  // ── Soleil & Lune ───────────────────────────────────────────────────────────
  "soleil-et-lune":            "sm1",
  "gardiens-ascendants":       "sm2",
  "ombres-ardentes":           "sm3",
  "legendes-brillantes":       "sm3.5",
  "invasion-carmin":           "sm4",
  "ultra-prisme":              "sm5",
  "lumiere-interdite":         "sm6",
  "tempete-celeste":           "sm7",
  "majeste-des-dragons":       "sm7.5",
  "tonnerre-perdu":            "sm8",
  "duo-de-choc":               "sm9",
  "alliance-infaillible":      "sm10",
  "harmonie-des-esprits":      "sm11",
  "destinees-occultes":        "sm115",
  "eclipse-cosmique":          "sm12",

  // ── XY ──────────────────────────────────────────────────────────────────────
  "xy-base":                   "xy1",
  "etincelles-xy":             "xy2",
  "poings-furieux":            "xy3",
  "vigueur-spectrale":         "xy4",
  "primo-choc":                "xy5",
  "ciel-rugissant":            "xy6",
  "origines-antiques":         "xy7",
  "impulsion-turbo":           "xy8",
  "rupture-turbo":             "xy9",
  "impact-des-destins":        "xy10",
  "offensive-vapeur":          "xy11",
  "evolutions-xy":             "xy12",

  // ── Noir & Blanc ────────────────────────────────────────────────────────────
  "noir-et-blanc":             "bw1",
  "pouvoirs-emergents":        "bw2",
  "nobles-victoires":          "bw3",
  "destinees-futures":         "bw4",
  "explorateurs-obscurs":      "bw5",
  "dragons-exaltes":           "bw6",
  "frontieres-franchies":      "bw7",
  "tempete-plasma":            "bw8",
  "glaciation-plasma":         "bw9",
  "explosion-plasma":          "bw10",

  // ── Diamant & Perle ─────────────────────────────────────────────────────────
  "diamant-et-perle":          "dp1",
  "tresors-mysterieux":        "dp2",
  "merveilles-secretes":       "dp3",
  "grands-envols":             "dp4",
  "aube-majestueuse":          "dp5",
  "eveil-des-legendes":        "dp6",
  "tempete-dp":                "dp7",

  // ── Platine ─────────────────────────────────────────────────────────────────
  "platine-base":              "pl1",
  "rivaux-emergeants":         "pl2",
  "vainqueurs-supremes":       "pl3",

  // ── HeartGold SoulSilver ────────────────────────────────────────────────────
  "heartgold-soulsilver-base": "hgss1",
  "dechainement":              "hgss2",
  "indomptable":               "hgss3",
  "triomphe":                  "hgss4",

  // ── EX ──────────────────────────────────────────────────────────────────────
  "rubis-et-saphir":           "ex1",
  "tempete-de-sable":          "ex2",
  "dragon-ex":                 "ex3",
  "groudon-vs-kyogre":         "ex4",
  "legendes-oubliees":         "ex5",
  "fire-red-leaf-green":       "ex6",
  "deoxys":                    "ex8",
  "emeraude":                  "ex9",
  "forces-cachees":            "ex10",
  "especes-delta":             "ex11",
  "createurs-de-legendes":     "ex12",
  "fantomes-holon":            "ex13",
  "gardiens-de-cristal":       "ex14",
  "gardiens-du-pouvoir":       "ex16",

  // ── Wizards of the Coast (seuls Expédition/Aquapolis ont des Reverse)
  "expedition":                "ecard1",
  "aquapolis":                 "ecard2",
}

function normalizeNumber(n: string): string {
  return n.replace(/^([A-Z]*)0+(\d+)$/, "$1$2")
}

function parseArgs() {
  const args = process.argv.slice(2)
  let slug: string | null = null
  let dryRun = false
  for (const a of args) {
    if (a.startsWith("--slug=")) slug = a.slice("--slug=".length)
    else if (a === "--dry-run") dryRun = true
  }
  return { slug, dryRun }
}

async function run() {
  const { slug: onlySlug, dryRun } = parseArgs()

  const series = await prisma.serie.findMany({ select: { id: true, slug: true, name: true } })
  const serieBySlug = new Map(series.map((s) => [s.slug, s]))

  const now = new Date()
  const recordedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const entries = Object.entries(SLUG_TO_TCGDEX).filter(
    ([slug]) => !onlySlug || slug === onlySlug
  )

  if (entries.length === 0) {
    console.error(`No matching series for slug '${onlySlug}'`)
    process.exit(1)
  }

  let totalSeries = 0
  let totalCards = 0

  for (const [slug, tcgdexId] of entries) {
    const serie = serieBySlug.get(slug)
    if (!serie) {
      console.warn(`[skip] ${slug}: not found in DB`)
      continue
    }

    process.stdout.write(`[${slug}] (${tcgdexId}) ${serie.name} … `)

    const reverseMap = await fetchTCGdexReverseForSet(tcgdexId)
    if (reverseMap.size === 0) {
      console.log("no reverse prices returned")
      continue
    }

    const dbCards = await prisma.card.findMany({
      where: { serieId: serie.id },
      select: { id: true, number: true, rarity: true },
    })

    const updates: Array<{ id: string; priceReverse: number }> = []
    for (const dbCard of dbCards) {
      if (isSpecialCard(dbCard.rarity as unknown as Parameters<typeof isSpecialCard>[0])) continue
      const entry =
        reverseMap.get(dbCard.number) ?? reverseMap.get(normalizeNumber(dbCard.number))
      if (!entry) continue
      const priceReverse = entry.trendHolo ?? entry.lowHolo
      if (priceReverse == null) continue
      updates.push({ id: dbCard.id, priceReverse })
    }

    if (dryRun) {
      console.log(`${updates.length} cards would be updated (dry-run)`)
      totalSeries++
      totalCards += updates.length
      continue
    }

    const CHUNK = 50
    for (let i = 0; i < updates.length; i += CHUNK) {
      const chunk = updates.slice(i, i + CHUNK)
      await Promise.all(
        chunk.map((u) =>
          prisma.card.update({
            where: { id: u.id },
            data: { priceReverse: u.priceReverse },
          })
        )
      )
      await Promise.all(
        chunk.map((u) =>
          prisma.cardPriceHistory.upsert({
            where: { cardId_recordedAt: { cardId: u.id, recordedAt } },
            create: {
              cardId: u.id,
              price: u.priceReverse,
              priceReverse: u.priceReverse,
              source: "tcgdex-reverse",
              recordedAt,
            },
            update: { priceReverse: u.priceReverse },
          })
        )
      )
    }

    console.log(`${updates.length} cards updated`)
    totalSeries++
    totalCards += updates.length
    await new Promise((r) => setTimeout(r, 200))
  }

  console.log(
    `\nDone. ${totalSeries} séries · ${totalCards} cartes ${dryRun ? "(dry-run)" : "mises à jour"}`
  )
  await prisma.$disconnect()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
