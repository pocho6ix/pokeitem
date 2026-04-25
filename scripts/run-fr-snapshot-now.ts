/**
 * Trigger an immediate FR price snapshot for all cards via RapidAPI.
 *
 * Matches cards by `cardmarketId` (= CM API `id`) — covers every card that
 * has been linked to the API, regardless of series.
 *
 * Uses extractLowestFr() which falls back to global NM when FR is null.
 *
 * Usage:
 *   npx tsx scripts/run-fr-snapshot-now.ts
 *   npx tsx scripts/run-fr-snapshot-now.ts --dry-run
 */
import dotenv from "dotenv"
dotenv.config()
import { PrismaClient } from "@prisma/client"
import {
  fetchCMEpisodes,
  fetchCMCardsForEpisode,
  extractLowestFrWithSource,
} from "../src/lib/cardmarket-fr"

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes("--dry-run")

async function main() {
  if (DRY_RUN) console.log("🟡 DRY RUN — aucune écriture")

  const episodes = await fetchCMEpisodes()
  console.log(`📡 ${episodes.length} épisodes CM à parcourir`)

  // cardmarketId → DB card id
  const dbCards = await prisma.card.findMany({
    where: { cardmarketId: { not: null } },
    select: { id: true, cardmarketId: true },
  })
  const cmIdToDbId = new Map<string, string>()
  for (const c of dbCards) if (c.cardmarketId) cmIdToDbId.set(c.cardmarketId, c.id)
  console.log(`🗂  ${cmIdToDbId.size} cartes DB avec cardmarketId\n`)

  const now = new Date()
  const recordedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  let episodesProcessed = 0
  let updated = 0
  let frCount = 0
  let fallbackCount = 0
  let unmatched = 0

  for (const ep of episodes) {
    const cmCards = await fetchCMCardsForEpisode(ep.id)
    if (cmCards.length === 0) continue

    const updates: Array<{ id: string; priceFr: number; source: "fr" | "global" }> = []
    for (const cm of cmCards) {
      const { value, source } = extractLowestFrWithSource(cm)
      if (value === null || source === null) continue
      const dbId = cmIdToDbId.get(String(cm.id))
      if (!dbId) { unmatched++; continue }
      updates.push({ id: dbId, priceFr: value, source })
    }

    if (!DRY_RUN && updates.length > 0) {
      for (const u of updates) {
        await prisma.card.update({
          where: { id: u.id },
          data: { priceFr: u.priceFr, priceFrUpdatedAt: now },
        })
        await prisma.cardPriceHistory.upsert({
          where: { cardId_recordedAt: { cardId: u.id, recordedAt } },
          create: {
            cardId: u.id,
            price: u.priceFr,
            priceFr: u.priceFr,
            source: "cardmarket-api",
            recordedAt,
          },
          update: { priceFr: u.priceFr, createdAt: new Date() },
        })
      }
    }
    for (const u of updates) (u.source === "fr" ? frCount++ : fallbackCount++)
    updated += updates.length

    episodesProcessed++
    if (episodesProcessed % 10 === 0) {
      console.log(`  [${episodesProcessed}/${episodes.length}] ep=${ep.id} "${ep.name}" · updates=${updates.length} · total=${updated} (FR=${frCount} / fallback=${fallbackCount})`)
    }
    await new Promise((r) => setTimeout(r, 150))
  }

  console.log(`\n✅ Terminé`)
  console.log(`   Épisodes: ${episodesProcessed}`)
  console.log(`   Cartes mises à jour: ${updated}`)
  console.log(`   · FR direct: ${frCount}`)
  console.log(`   · Fallback global NM: ${fallbackCount}`)
  console.log(`   · Cartes API sans match DB: ${unmatched}`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
