/**
 * Fix misclassified card rarities in the DB by querying TCGDex per-card.
 *
 * Targets:
 *  1. COMMON cards with "-ex" in name (should never be COMMON in SV era)
 *  2. COMMON cards in the same number range (±15) as the -ex misclassified ones
 *     → catches Trainer Double Rares like Bria, Rubépin, Kombu, Taro
 *
 * Usage:
 *   npx tsx scripts/fix-rarities.ts            # dry run
 *   npx tsx scripts/fix-rarities.ts --apply    # apply
 */

import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })
import { mapTcgdexRarity } from "../src/lib/pokemon/card-variants"

const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")

async function fetchRarity(tcgdexId: string): Promise<string | null> {
  const url = `https://api.tcgdex.net/v2/fr/cards/${tcgdexId}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = await res.json() as { rarity?: string }
    return data.rarity ?? null
  } catch {
    return null
  }
}

async function main() {
  console.log(APPLY ? "🔧 MODE: APPLY\n" : "🔍 MODE: DRY RUN (use --apply to write)\n")

  // 1. All COMMON "-ex" cards
  const exCards = await prisma.card.findMany({
    where: { rarity: "COMMON", name: { contains: "-ex" }, tcgdexId: { not: null } },
    select: { id: true, name: true, number: true, rarity: true, tcgdexId: true, serieId: true },
  })
  console.log(`Phase 1: ${exCards.length} cartes "-ex" en COMMON à vérifier`)

  // 2. For each set that has misclassified -ex cards, also check nearby COMMON cards
  //    (catches Trainer Double Rares in the same number range)
  const affectedSeries = [...new Set(exCards.map(c => c.serieId))]
  const extraCandidates = await prisma.card.findMany({
    where: {
      rarity: "COMMON",
      serieId: { in: affectedSeries },
      name: { not: { contains: "-ex" } }, // not already in phase 1
      tcgdexId: { not: null },
    },
    select: { id: true, name: true, number: true, rarity: true, tcgdexId: true, serieId: true },
  })

  // Filter extras: only cards whose number is within 20 of a -ex card in the same set
  const exNums = new Map<string, number[]>()
  for (const c of exCards) {
    if (!exNums.has(c.serieId)) exNums.set(c.serieId, [])
    exNums.get(c.serieId)!.push(parseInt(c.number))
  }

  const nearbyCards = extraCandidates.filter(c => {
    const nums = exNums.get(c.serieId) ?? []
    const n = parseInt(c.number)
    return nums.some(exN => Math.abs(n - exN) <= 20)
  })
  console.log(`Phase 2: ${nearbyCards.length} cartes Dresseur/Pokémon proches des -ex à vérifier\n`)

  const allToCheck = [...exCards, ...nearbyCards]
  const total = allToCheck.length

  type Fix = { id: string; name: string; number: string; tcgdexId: string; tcgdexRarity: string; newRarity: string }
  const fixes: Fix[] = []
  let checked = 0

  for (const card of allToCheck) {
    checked++
    if (checked % 20 === 0) process.stdout.write(`  ${checked}/${total} vérifiés...\r`)

    const tcgdexRarity = await fetchRarity(card.tcgdexId!)
    if (!tcgdexRarity) continue

    const newRarity = mapTcgdexRarity(tcgdexRarity)
    if (newRarity === "COMMON") continue

    fixes.push({
      id: card.id,
      name: card.name,
      number: card.number,
      tcgdexId: card.tcgdexId!,
      tcgdexRarity,
      newRarity,
    })

    await new Promise(r => setTimeout(r, 80)) // gentle rate limit
  }

  console.log(`\n\n=== ${fixes.length} cartes à corriger ===`)

  // Group by set prefix for display
  const bySet = new Map<string, Fix[]>()
  for (const fix of fixes) {
    const setId = fix.tcgdexId.match(/^([^-]+)/)?.[1] ?? "?"
    if (!bySet.has(setId)) bySet.set(setId, [])
    bySet.get(setId)!.push(fix)
  }
  for (const [setId, setFixes] of [...bySet.entries()].sort()) {
    console.log(`\n  ${setId} — ${setFixes.length} cartes`)
    setFixes
      .sort((a, b) => parseInt(a.number) - parseInt(b.number))
      .forEach(f => console.log(`    #${f.number} ${f.name}  (COMMON → ${f.newRarity}  via "${f.tcgdexRarity}")`))
  }

  if (!APPLY) {
    console.log("\n⚠️  Dry run. Relance avec --apply pour appliquer.")
    await prisma.$disconnect()
    return
  }

  console.log("\nApplication...")
  let done = 0
  for (const fix of fixes) {
    const isSpecial = !["COMMON", "UNCOMMON", "RARE"].includes(fix.newRarity)
    await prisma.card.update({
      where: { id: fix.id },
      data: { rarity: fix.newRarity as any, isSpecial },
    })
    done++
    if (done % 10 === 0) process.stdout.write(`  ${done}/${fixes.length}\r`)
  }
  console.log(`\n✅ ${done} cartes corrigées`)
  await prisma.$disconnect()
}

main().catch(console.error)
