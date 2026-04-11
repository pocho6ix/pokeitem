import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
const prisma = new PrismaClient()

async function main() {
  // Couronne Stellaire — cartes COMMON dans les numéros élevés (potentiellement Double Rare)
  const ev07Id = 'cmnd8zj5r000uth4l2xjn5j6z'
  const ev07wrong = await prisma.card.findMany({
    where: { serieId: ev07Id, rarity: 'COMMON' },
    select: { number: true, name: true, rarity: true, tcgdexId: true },
    orderBy: { number: 'asc' },
  })
  // Filtrer les numéros > 100
  const highNum = ev07wrong.filter(c => parseInt(c.number) > 100)
  console.log(`\n=== Couronne Stellaire — COMMON avec numéro > 100 (${highNum.length}) ===`)
  highNum.forEach(c => console.log(`  #${c.number} ${c.name} [tcgdex: ${c.tcgdexId}]`))

  await prisma.$disconnect()
}
main()
