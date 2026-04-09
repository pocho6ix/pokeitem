import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPriceForVersion } from '@/lib/display-price'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id: string }).id

  const rows = await prisma.userCard.findMany({
    where: { userId },
    select: {
      quantity: true,
      version: true,
      card: { select: { rarity: true, price: true, priceFr: true, priceReverse: true } },
    },
  })

  // Aggregate by rarity
  const map = new Map<string, { cardCount: number; totalValue: number }>()
  for (const uc of rows) {
    const key = uc.card.rarity
    if (!key) continue
    const price = getPriceForVersion(uc.card, uc.version)
    const existing = map.get(key) ?? { cardCount: 0, totalValue: 0 }
    existing.cardCount += uc.quantity
    existing.totalValue += price * uc.quantity
    map.set(key, existing)
  }

  const result = Array.from(map.entries()).map(([rarityKey, data]) => ({
    rarityKey,
    cardCount: data.cardCount,
    totalValue: Math.round(data.totalValue * 100) / 100,
  }))

  return NextResponse.json(result)
}
