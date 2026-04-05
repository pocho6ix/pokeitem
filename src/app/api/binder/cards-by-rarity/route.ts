import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CardRarity } from '@/types/card'

export interface RarityCard {
  id: string
  name: string
  imageUrl: string | null
  price: number
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
          rarity: true,
          imageUrl: true,
          price: true,
          priceReverse: true,
          serie: { select: { name: true } },
        },
      },
    },
  })

  type CardEntry = { id: string; name: string; imageUrl: string | null; price: number; serieName: string }
  const byRarity = new Map<CardRarity, { cards: Map<string, CardEntry>; totalValue: number }>()

  for (const uc of userCards) {
    const rarity = uc.card.rarity as CardRarity
    const effectivePrice =
      uc.version === 'REVERSE'
        ? (uc.card.priceReverse ?? uc.card.price ?? 0)
        : (uc.card.price ?? 0)

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
        imageUrl: uc.card.imageUrl,
        price: effectivePrice,
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
