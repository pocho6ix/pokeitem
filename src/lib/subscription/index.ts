import { prisma } from '@/lib/prisma'
import { Plan } from '@prisma/client'

export const FREE_LIMITS = {
  CARDS: 100,
  SEALED_ITEMS: 5,
  SCANS_PER_MONTH: 10,
} as const

export type Feature =
  | 'VIEW_COLLECTION_VALUE'
  | 'ADD_CARD'
  | 'ADD_SEALED_ITEM'
  | 'SCAN_CARD'
  | 'PORTFOLIO_CHART'

export interface FeatureCheck {
  allowed: boolean
  reason?: string
  limit?: number
  current?: number
}

export async function checkFeature(userId: string, feature: Feature): Promise<FeatureCheck> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: { select: { userCards: true, portfolio: true } },
    },
  })

  if (!user) return { allowed: false, reason: 'User not found' }

  const isPro =
    user.plan === Plan.PRO && (!user.planExpiresAt || user.planExpiresAt > new Date())

  if (isPro) return { allowed: true }

  switch (feature) {
    case 'VIEW_COLLECTION_VALUE':
    case 'PORTFOLIO_CHART':
      return { allowed: false, reason: 'PRO_REQUIRED' }

    case 'ADD_CARD': {
      const count = user._count.userCards
      return {
        allowed: count < FREE_LIMITS.CARDS,
        reason: count >= FREE_LIMITS.CARDS ? 'CARD_LIMIT_REACHED' : undefined,
        limit: FREE_LIMITS.CARDS,
        current: count,
      }
    }

    case 'ADD_SEALED_ITEM': {
      const count = user._count.portfolio
      return {
        allowed: count < FREE_LIMITS.SEALED_ITEMS,
        reason: count >= FREE_LIMITS.SEALED_ITEMS ? 'SEALED_LIMIT_REACHED' : undefined,
        limit: FREE_LIMITS.SEALED_ITEMS,
        current: count,
      }
    }

    case 'SCAN_CARD': {
      const now = new Date()
      const resetAt = new Date(user.scanCountResetAt)
      const isNewMonth =
        now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()
      if (isNewMonth) {
        await prisma.user.update({
          where: { id: userId },
          data: { scanCount: 0, scanCountResetAt: now },
        })
        return { allowed: true, limit: FREE_LIMITS.SCANS_PER_MONTH, current: 0 }
      }
      return {
        allowed: user.scanCount < FREE_LIMITS.SCANS_PER_MONTH,
        reason: user.scanCount >= FREE_LIMITS.SCANS_PER_MONTH ? 'SCAN_LIMIT_REACHED' : undefined,
        limit: FREE_LIMITS.SCANS_PER_MONTH,
        current: user.scanCount,
      }
    }

    default:
      return { allowed: true }
  }
}

export async function incrementScanCount(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { scanCount: { increment: 1 } },
  })
}
