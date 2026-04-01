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

  const isTrialing = !!(user?.trialEndsAt && new Date(user.trialEndsAt) > new Date())
  const isPro = isTrialing || (
    user?.plan === 'PRO' &&
    (!user?.planExpiresAt || new Date(user.planExpiresAt) > new Date())
  )

  const now = new Date()
  const resetAt = new Date(user.scanCountResetAt)
  const isNewMonth =
    now.getMonth() !== resetAt.getMonth() ||
    now.getFullYear() !== resetAt.getFullYear()
  const scanCount = isNewMonth ? 0 : user.scanCount

  return NextResponse.json({
    isPro,
    isTrialing,
    trialEndsAt: user?.trialEndsAt ?? null,
    plan: isPro ? 'PRO' : 'FREE',
    planExpiresAt: user.planExpiresAt,
    cancelAtPeriodEnd: false,
    usage: {
      cards: { current: user._count.userCards, limit: isPro ? null : FREE_LIMITS.CARDS },
      sealedItems: { current: user._count.portfolio, limit: isPro ? null : FREE_LIMITS.SEALED_ITEMS },
      scans: { current: scanCount, limit: isPro ? null : FREE_LIMITS.SCANS_PER_MONTH },
    },
  })
}
