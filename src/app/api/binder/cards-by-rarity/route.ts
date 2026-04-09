import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPriceForVersion } from '@/lib/display-price'
import { CardRarity } from '@/types/card'

export interface RarityCard {
  id: string
  name: string
  number: string
  rarity: CardRarity
  imageUrl: string | null
  price: number
  priceFr: number | null
  serieName: string
}

export interface RaritySection {
  rarityKey: CardRarity
  cardCount: number
  totalValue: number
  cards: RarityCard[]
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const userCards = await prisma.userCard.findMany({
    where: { userId },
    select: {
      quantity: true,
      version: true,
      card: {
        select: {
          id: true,
          name: true,
          number: true,
          rarity: true,
          imageUrl: true,
          price: true,
          priceFr: true,
          priceReverse: true,
          serie: { select: { name: true } },
        },
      },
    },
  })

  type CardEntry = RarityCard
  const byRarity = new Map<CardRarity, { cards: Map<string, CardEntry>; totalValue: number }>()

  for (const uc of userCards) {
    const rarity = uc.card.rarity as CardRarity
    const effectivePrice = getPriceForVersion(uc.card, uc.version)

    if (!byRarity.has(rarity)) byRarity.set(rarity, { cards: new Map(), totalValue: 0 })
    const group = byRarity.get(rarity)!

    // Total value accounts for quantity
    group.totalValue += effectivePrice * uc.quantity

    // Display: deduplicate by cardId, keep highest effective price
    const existing = group.cards.get(uc.card.id)
    if (!existing || effectivePrice > existing.price) {
      group.cards.set(uc.card.id, {
        id: uc.card.id,
        name: uc.card.name,
        number: uc.card.number,
        rarity,
        imageUrl: uc.card.imageUrl,
        price: effectivePrice,
        priceFr: uc.card.priceFr ?? null,
        serieName: uc.card.serie.name,
      })
    }
  }

  const result: RaritySection[] = Array.from(byRarity.entries()).map(([rarityKey, { cards, totalValue }]) => {
    const sortedCards = [...cards.values()].sort((a, b) => b.price - a.price)
    return {
      rarityKey,
      cardCount: sortedCards.length,
      totalValue: Math.round(totalValue * 100) / 100,
      cards: sortedCards,
    }
  })

  return NextResponse.json(result)
}
