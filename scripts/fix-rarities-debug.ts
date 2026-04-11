import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Fetch sv7 from API — voir les numéros des Double Rare
  const res = await fetch('https://api.pokemontcg.io/v2/cards?q=set.id:sv7%20rarity:%22Double%20Rare%22&select=number,name,rarity&pageSize=50')
  const data = await res.json() as any
  console.log('=== API sv7 Double Rare cards ===')
  data.data.forEach((c: any) => console.log(`  #${c.number} ${c.name}`))

  // Comparer avec nos tcgdexIds pour sv07
  const ourCards = await prisma.card.findMany({
    where: { tcgdexId: { startsWith: 'sv07-' }, rarity: 'COMMON' },
    select: { name: true, number: true, tcgdexId: true },
    orderBy: { number: 'asc' },
  })
  console.log('\n=== Notre DB sv07 COMMON (numéros élevés) ===')
  ourCards.filter(c => parseInt(c.number) > 150).forEach(c =>
    console.log(`  #${c.number} ${c.name} [tcgdex: ${c.tcgdexId}]`)
  )

  await prisma.$disconnect()
}
main()
