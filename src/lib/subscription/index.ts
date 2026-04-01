import { prisma } from '@/lib/prisma'
import { Plan } from '@prisma/client'

export const FREE_LIMITS = {
  CARDS: 100,
  SEALED_ITEMS: 5,
  SCANS_PER_MONTH: 10,
} as const

export type Feature =
  | 'ADD_CARD'
  | 'ADD_SEALED_ITEM'
  | 'SCAN_CARD'
  | 'VIEW_COLLECTION_VALUE'
  | 'VIEW_PORTFOLIO_CHART'

export type LimitReason =
  | 'PRO_REQUIRED'
  | 'CARD_LIMIT_REACHED'
  | 'SEALED_LIMIT_REACHED'
  | 'SCAN_LIMIT_REACHED'

export interface FeatureCheck {
  allowed: boolean
  reason?: LimitReason
  limit?: number
  current?: number
  isPro: boolean
}

export async function checkFeature(
  userId: string,
  feature: Feature
): Promise<FeatureCheck> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: { select: { userCards: true, portfolio: true } },
    },
  })

  if (!user) return { allowed: false, isPro: false }

  const isTrialing = !!(user.trialEndsAt && user.trialEndsAt > new Date())
  const isPro =
    isTrialing || (user.plan === Plan.PRO && (!user.planExpiresAt || user.planExpiresAt > new Date()))

  if (isPro) return { allowed: true, isPro: true }

  switch (feature) {
    case 'VIEW_COLLECTION_VALUE':
    case 'VIEW_PORTFOLIO_CHART':
      return { allowed: false, reason: 'PRO_REQUIRED', isPro: false }

    case 'ADD_CARD': {
      const current = user._count.userCards
      const allowed = current < FREE_LIMITS.CARDS
      return {
        allowed, isPro: false,
        reason: allowed ? undefined : 'CARD_LIMIT_REACHED',
        limit: FREE_LIMITS.CARDS, current,
      }
    }

    case 'ADD_SEALED_ITEM': {
      const current = user._count.portfolio
      const allowed = current < FREE_LIMITS.SEALED_ITEMS
      return {
        allowed, isPro: false,
        reason: allowed ? undefined : 'SEALED_LIMIT_REACHED',
        limit: FREE_LIMITS.SEALED_ITEMS, current,
      }
    }

    case 'SCAN_CARD': {
      const now = new Date()
      const resetAt = new Date(user.scanCountResetAt)
      const isNewMonth =
        now.getMonth() !== resetAt.getMonth() ||
        now.getFullYear() !== resetAt.getFullYear()

      let current = user.scanCount
      if (isNewMonth) {
        await prisma.user.update({
          where: { id: userId },
          data: { scanCount: 0, scanCountResetAt: now },
        })
        current = 0
      }

      const allowed = current < FREE_LIMITS.SCANS_PER_MONTH
      return {
        allowed, isPro: false,
        reason: allowed ? undefined : 'SCAN_LIMIT_REACHED',
        limit: FREE_LIMITS.SCANS_PER_MONTH, current,
      }
    }

    default:
      return { allowed: true, isPro: false }
  }
}

export async function incrementScanCount(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { scanCount: { increment: 1 } },
  })
}
