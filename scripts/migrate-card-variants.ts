/**
 * migrate-card-variants.ts
 *
 * One-shot: calcule isSpecial pour toutes les cartes existantes
 * basé sur leur champ rarity déjà en DB.
 *
 * Usage: npx tsx scripts/migrate-card-variants.ts
 */
import { PrismaClient, CardRarity } from '@prisma/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })

const prisma = new PrismaClient()

const SPECIAL_RARITIES = new Set<CardRarity>([
  CardRarity.DOUBLE_RARE,
  CardRarity.ILLUSTRATION_RARE,
  CardRarity.SPECIAL_ILLUSTRATION_RARE,
  CardRarity.HYPER_RARE,
  CardRarity.ACE_SPEC_RARE,
  CardRarity.PROMO,
])

async function main() {
  const cards = await prisma.card.findMany({ select: { id: true, rarity: true } })
  console.log(`Migration de ${cards.length} cartes...`)

  let updated = 0
  const BATCH = 100
  for (let i = 0; i < cards.length; i += BATCH) {
    const batch = cards.slice(i, i + BATCH)
    await Promise.all(
      batch.map((card) =>
        prisma.card.update({
          where: { id: card.id },
          data: { isSpecial: SPECIAL_RARITIES.has(card.rarity) },
        })
      )
    )
    updated += batch.length
    process.stdout.write(`\r  ${updated}/${cards.length}`)
  }

  console.log(`\n✅ ${updated} cartes migrées`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
