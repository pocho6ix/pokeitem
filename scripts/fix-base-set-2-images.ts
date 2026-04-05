/**
 * Fix Base Set 2 (set-de-base-2) card images
 * Replace pokemontcg.io English images with TCGdex FR images.
 *
 * TCGdex FR CDN: https://assets.tcgdex.net/fr/base/base4/{localId}/high.webp
 *
 * Usage: npx tsx scripts/fix-base-set-2-images.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const dryRun = process.argv.includes('--dry-run')

async function main() {
  if (dryRun) console.log('🔍 Dry-run — aucune écriture en DB\n')

  const serie = await prisma.serie.findFirst({ where: { slug: 'set-de-base-2' } })
  if (!serie) { console.error('❌ Série "set-de-base-2" introuvable en DB'); return }

  const cards = await prisma.card.findMany({ where: { serieId: serie.id } })
  console.log(`📦 ${cards.length} cartes trouvées dans "${serie.name}"`)

  let updated = 0
  for (const card of cards) {
    const newUrl = `https://assets.tcgdex.net/fr/base/base4/${card.number}/high.webp`
    if (card.imageUrl === newUrl) continue

    console.log(`  ${card.number.padStart(3)}  ${card.name.padEnd(30)} → ${newUrl}`)
    if (!dryRun) {
      await prisma.card.update({
        where: { id: card.id },
        data: { imageUrl: newUrl },
      })
    }
    updated++
  }

  console.log(`\n✅ ${dryRun ? '(dry-run) ' : ''}${updated} cartes mises à jour`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
