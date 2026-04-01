import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { FREE_LIMITS } from '@/lib/subscription'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { userCards: true, portfolio: true } } },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isPro = user.plan === 'PRO' && (!user.planExpiresAt || user.planExpiresAt > new Date())

  return NextResponse.json({
    plan: isPro ? 'PRO' : 'FREE',
    planExpiresAt: user.planExpiresAt,
    cardCount: user._count.userCards,
    sealedCount: user._count.portfolio,
    scanCount: user.scanCount,
    limits: FREE_LIMITS,
  })
}
