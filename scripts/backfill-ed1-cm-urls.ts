/**
 * backfill-ed1-cm-urls.ts
 *
 * Copies `cardmarketId` and `cardmarketUrl` from the regular (unlimited)
 * WOTC sets to their 1st-Edition counterparts, appending `?isFirstEd=Y`
 * (and `&language=2` when the unlimited URL already has `?language=2`).
 *
 * On CardMarket the same product page covers both printings; the
 * `?isFirstEd=Y` query param filters for 1st-Edition listings only.
 *
 * Prices are intentionally left untouched — 1st-Edition prices differ
 * significantly from unlimited and will be fetched by the price cron.
 *
 * Usage:
 *   npx tsx scripts/backfill-ed1-cm-urls.ts --dry-run
 *   npx tsx scripts/backfill-ed1-cm-urls.ts
 */

import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })

const prisma   = new PrismaClient()
const DRY_RUN  = process.argv.includes("--dry-run")

const PAIRS: Array<[string, string]> = [
  ["set-de-base-1ed", "set-de-base"],
  ["jungle-1ed",      "jungle"],
  ["fossile-1ed",     "fossile"],
  ["team-rocket-1ed", "team-rocket"],
]

function buildEd1Url(regularUrl: string): string {
  // Regular URL may already have ?language=2 — preserve it
  if (regularUrl.includes("?language=2")) {
    return regularUrl.replace("?language=2", "?isFirstEd=Y&language=2")
  }
  return `${regularUrl}?isFirstEd=Y`
}

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN — aucune écriture\n" : "⚡ Live run\n")

  let totalUpdated = 0

  for (const [ed1Slug, regSlug] of PAIRS) {
    const [ed1Serie, regSerie] = await Promise.all([
      prisma.serie.findUnique({ where: { slug: ed1Slug }, select: { id: true, name: true } }),
      prisma.serie.findUnique({ where: { slug: regSlug }, select: { id: true, name: true } }),
    ])
    if (!ed1Serie || !regSerie) {
      console.warn(`⚠️  Série introuvable: ${ed1Slug} ou ${regSlug}`)
      continue
    }

    // Load regular cards indexed by card number
    const regCards = await prisma.card.findMany({
      where: { serieId: regSerie.id, cardmarketUrl: { not: null } },
      select: { number: true, cardmarketId: true, cardmarketUrl: true },
    })
    const regByNumber = new Map(regCards.map((c) => [c.number, c]))

    // Load ED1 cards
    const ed1Cards = await prisma.card.findMany({
      where:  { serieId: ed1Serie.id },
      select: { id: true, number: true, name: true },
    })

    let updated = 0
    let skipped = 0

    for (const ed1Card of ed1Cards) {
      const reg = regByNumber.get(ed1Card.number)
      if (!reg || !reg.cardmarketUrl) { skipped++; continue }

      const ed1Url = buildEd1Url(reg.cardmarketUrl)
      console.log(`  ${ed1Serie.name} #${ed1Card.number} ${ed1Card.name} → ${ed1Url}`)

      if (!DRY_RUN) {
        await prisma.card.update({
          where: { id: ed1Card.id },
          data:  {
            cardmarketId:  reg.cardmarketId,
            cardmarketUrl: ed1Url,
          },
        })
      }
      updated++
    }

    console.log(`\n${ed1Serie.name}: ${updated} mis à jour, ${skipped} sans URL source\n`)
    totalUpdated += updated
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`✅ Total: ${totalUpdated} cartes ED1 ${DRY_RUN ? "(dry-run)" : "mises à jour"}`)

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
