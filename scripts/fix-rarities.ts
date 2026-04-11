/**
 * Fix misclassified card rarities in the DB by re-syncing from TCGDex API.
 *
 * Checks ALL cards currently stored as COMMON that have a tcgdexId.
 * For each one, fetches the real TCGDex rarity and updates if different.
 *
 * Usage:
 *   npx tsx scripts/fix-rarities.ts            # dry run
 *   npx tsx scripts/fix-rarities.ts --apply    # apply
 *   npx tsx scripts/fix-rarities.ts --prefix swsh  # only one era
 */

import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })
import { mapTcgdexRarity } from "../src/lib/pokemon/card-variants"

const prisma = new PrismaClient()
const APPLY   = process.argv.includes("--apply")
const PREFIX  = process.argv.find(a => a.startsWith("--prefix="))?.split("=")[1]

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

  const whereClause: any = {
    rarity: "COMMON",
    tcgdexId: { not: null },
  }
  if (PREFIX) {
    whereClause.tcgdexId = { startsWith: PREFIX, not: null }
    console.log(`Filtre: ère "${PREFIX}" uniquement\n`)
  }

  const cards = await prisma.card.findMany({
    where: whereClause,
    select: { id: true, name: true, number: true, rarity: true, tcgdexId: true },
    orderBy: { tcgdexId: "asc" },
  })
  console.log(`${cards.length} cartes COMMON à vérifier via TCGDex\n`)

  type Fix = { id: string; name: string; number: string; tcgdexId: string; tcgdexRarity: string; newRarity: string }
  const fixes: Fix[] = []
  let checked = 0
  const total = cards.length

  for (const card of cards) {
    checked++
    if (checked % 50 === 0) process.stdout.write(`  ${checked}/${total} vérifiés...\r`)

    const tcgdexRarity = await fetchRarity(card.tcgdexId!)
    if (!tcgdexRarity) continue

    const newRarity = mapTcgdexRarity(tcgdexRarity)
    if (newRarity === "COMMON") continue // already correct

    fixes.push({
      id: card.id,
      name: card.name,
      number: card.number,
      tcgdexId: card.tcgdexId!,
      tcgdexRarity,
      newRarity,
    })

    await new Promise(r => setTimeout(r, 60))
  }

  console.log(`\n\n=== ${fixes.length} cartes à corriger ===`)

  // Group by era for display
  const byEra = new Map<string, Fix[]>()
  for (const fix of fixes) {
    const era = fix.tcgdexId.match(/^([a-z]+)/)?.[1] ?? "?"
    if (!byEra.has(era)) byEra.set(era, [])
    byEra.get(era)!.push(fix)
  }
  for (const [era, eraFixes] of [...byEra.entries()].sort()) {
    // Group by target rarity within era
    const byRarity = new Map<string, Fix[]>()
    for (const f of eraFixes) {
      if (!byRarity.has(f.newRarity)) byRarity.set(f.newRarity, [])
      byRarity.get(f.newRarity)!.push(f)
    }
    console.log(`\n  ${era.toUpperCase()} — ${eraFixes.length} cartes`)
    for (const [rarity, rarFixes] of byRarity) {
      console.log(`    → ${rarity}: ${rarFixes.length} cartes`)
      rarFixes
        .sort((a, b) => a.tcgdexId.localeCompare(b.tcgdexId))
        .slice(0, 8)
        .forEach(f => console.log(`      #${f.number} ${f.name} [${f.tcgdexId}] (via "${f.tcgdexRarity}")`))
      if (rarFixes.length > 8) console.log(`      … +${rarFixes.length - 8} autres`)
    }
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
    if (done % 20 === 0) process.stdout.write(`  ${done}/${fixes.length}\r`)
  }
  console.log(`\n✅ ${done} cartes corrigées`)
  await prisma.$disconnect()
}

main().catch(console.error)
