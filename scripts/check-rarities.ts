import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
const prisma = new PrismaClient()

async function main() {
  // Audit global : nombre de cartes COMMON par ère qui ont des noms suspects
  const eras = [
    { prefix: 'swsh', label: 'Épée & Bouclier' },
    { prefix: 'sm',   label: 'Soleil & Lune' },
    { prefix: 'xy',   label: 'XY' },
    { prefix: 'bw',   label: 'Noir & Blanc' },
    { prefix: 'hgss', label: 'HeartGold SoulSilver' },
    { prefix: 'dp',   label: 'Diamant & Perle' },
    { prefix: 'pl',   label: 'Platine' },
    { prefix: 'ex',   label: 'EX' },
  ]

  console.log('=== Cartes COMMON avec des noms suspects par ère ===\n')
  for (const era of eras) {
    const vmax = await prisma.card.count({
      where: { rarity: 'COMMON', tcgdexId: { startsWith: era.prefix }, name: { contains: 'VMAX' } }
    })
    const vstar = await prisma.card.count({
      where: { rarity: 'COMMON', tcgdexId: { startsWith: era.prefix }, name: { contains: 'VSTAR' } }
    })
    const vCard = await prisma.card.count({
      where: { rarity: 'COMMON', tcgdexId: { startsWith: era.prefix }, name: { endsWith: ' V' } }
    })
    const gx = await prisma.card.count({
      where: { rarity: 'COMMON', tcgdexId: { startsWith: era.prefix }, name: { contains: 'GX' } }
    })
    const exCap = await prisma.card.count({
      where: { rarity: 'COMMON', tcgdexId: { startsWith: era.prefix }, name: { contains: '-EX' } }
    })
    const total = await prisma.card.count({
      where: { rarity: 'COMMON', tcgdexId: { startsWith: era.prefix } }
    })
    if (vmax + vstar + vCard + gx + exCap > 0 || era.prefix === 'swsh') {
      console.log(`${era.label} (${era.prefix}):`)
      console.log(`  Total COMMON: ${total}`)
      if (vmax)  console.log(`  ⚠️  VMAX en COMMON: ${vmax}`)
      if (vstar) console.log(`  ⚠️  VSTAR en COMMON: ${vstar}`)
      if (vCard) console.log(`  ⚠️  "X V" en COMMON: ${vCard}`)
      if (gx)    console.log(`  ⚠️  GX en COMMON: ${gx}`)
      if (exCap) console.log(`  ⚠️  -EX (majuscules) en COMMON: ${exCap}`)
    }
  }

  // Distribution des raretés SWSH
  const swshDist = await prisma.card.groupBy({
    by: ['rarity'],
    where: { tcgdexId: { startsWith: 'swsh' } },
    _count: true,
    orderBy: { _count: { rarity: 'desc' } }
  })
  console.log('\n=== Distribution SWSH ===')
  swshDist.forEach(r => console.log(`  ${r.rarity}: ${r._count}`))

  await prisma.$disconnect()
}
main()
