import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { QUEST_MAP, REFERRAL_POINTS } from '@/lib/quests'
import { getPriceForVersion } from '@/lib/display-price'

// ─── Recalculate and cache a user's total points ──────────────────────────────

export async function recalculateUserPoints(userId: string): Promise<number> {
  const agg = await prisma.pointEvent.aggregate({
    where: { userId },
    _sum: { points: true },
  })
  const total = agg._sum.points ?? 0

  await prisma.userPoints.upsert({
    where: { userId },
    update: { total, updatedAt: new Date() },
    create: { userId, total },
  })

  return total
}

// ─── Award points for a referral ─────────────────────────────────────────────

export async function awardReferralPoints(referrerId: string, referredUserId: string) {
  // Idempotent: skip if already awarded for this referred user
  const existing = await prisma.pointEvent.findFirst({
    where: {
      userId: referrerId,
      source: 'referral',
      metadata: { path: ['referredUserId'], equals: referredUserId },
    },
  })
  if (existing) return

  await prisma.pointEvent.create({
    data: {
      userId: referrerId,
      points: REFERRAL_POINTS,
      source: 'referral',
      metadata: { referredUserId },
    },
  })

  await recalculateUserPoints(referrerId)
}

// ─── Complete a quest and award points ───────────────────────────────────────

export async function completeQuest(userId: string, questId: string): Promise<number> {
  const quest = QUEST_MAP[questId]
  if (!quest || !quest.active) throw new Error('Quest not found or inactive')

  // Check not already completed
  const existing = await prisma.userQuest.findUnique({
    where: { userId_questId: { userId, questId } },
  })
  if (existing?.completed) throw new Error('Quest already completed')

  const now = new Date()

  // Mark quest completed
  await prisma.userQuest.upsert({
    where: { userId_questId: { userId, questId } },
    update: { completed: true, completedAt: now },
    create: { userId, questId, completed: true, progress: quest.target ?? 0, completedAt: now },
  })

  // Award points
  await prisma.pointEvent.create({
    data: {
      userId,
      points: quest.points,
      source: 'quest',
      questId,
    },
  })

  return await recalculateUserPoints(userId)
}

// ─── Idempotent quest completion (safe to call multiple times) ───────────────

export async function completeQuestIfNotDone(userId: string, questId: string) {
  const quest = QUEST_MAP[questId]
  if (!quest || !quest.active) return

  const existing = await prisma.userQuest.findUnique({
    where: { userId_questId: { userId, questId } },
  })
  if (existing?.completed) return

  const now = new Date()

  await prisma.userQuest.upsert({
    where: { userId_questId: { userId, questId } },
    update: { completed: true, completedAt: now },
    create: { userId, questId, completed: true, progress: quest.target ?? 1, completedAt: now },
  })

  await prisma.pointEvent.create({
    data: { userId, points: quest.points, source: 'quest', questId },
  })

  await recalculateUserPoints(userId)
}

// ─── Check and update progressive quests ─────────────────────────────────────

export async function checkProgressiveQuests(userId: string) {
  // ── add_500_cards ─────────────────────────────────────────────────────────
  const cardCount = await prisma.userCard.count({ where: { userId } })

  const questCards = await prisma.userQuest.upsert({
    where: { userId_questId: { userId, questId: 'add_500_cards' } },
    update: { progress: cardCount },
    create: { userId, questId: 'add_500_cards', progress: cardCount },
  })

  if (cardCount >= 500 && !questCards.completed) {
    await completeQuest(userId, 'add_500_cards').catch(() => {})
  }

  // ── collection_1000 ───────────────────────────────────────────────────────
  const userCardsWithPrices = await prisma.userCard.findMany({
    where: { userId },
    select: {
      quantity: true,
      version:  true,
      card: { select: { price: true, priceFr: true, priceReverse: true } },
    },
  })
  const totalValue = userCardsWithPrices.reduce((sum, uc) => {
    return sum + getPriceForVersion(uc.card, uc.version) * uc.quantity
  }, 0)
  const progressValue = Math.min(Math.round(totalValue), 1000)

  const quest1000 = await prisma.userQuest.upsert({
    where: { userId_questId: { userId, questId: 'collection_1000' } },
    update: { progress: progressValue },
    create: { userId, questId: 'collection_1000', progress: progressValue },
  })

  if (totalValue >= 1000 && !quest1000.completed) {
    await completeQuestIfNotDone(userId, 'collection_1000').catch(() => {})
  }

  // ── three_extensions ──────────────────────────────────────────────────────
  const userCardsForSeries = await prisma.userCard.findMany({
    where: { userId },
    select: { card: { select: { serieId: true } } },
  })
  const setCount = new Set(userCardsForSeries.map(uc => uc.card.serieId)).size
  const progressSets = Math.min(setCount, 3)

  const questSets = await prisma.userQuest.upsert({
    where: { userId_questId: { userId, questId: 'three_extensions' } },
    update: { progress: progressSets },
    create: { userId, questId: 'three_extensions', progress: progressSets },
  })

  if (setCount >= 3 && !questSets.completed) {
    await completeQuestIfNotDone(userId, 'three_extensions').catch(() => {})
  }
}

// ─── Leaderboard (top 10 by total points) ────────────────────────────────────

export interface PointsLeaderboardEntry {
  rank: number
  userId: string
  username: string
  image: string | null
  totalPoints: number
  isCurrentUser: boolean
}

export async function getPointsLeaderboard(
  currentUserId: string,
  opts: { skip?: number; take?: number; search?: string } = {},
) {
  const skip = opts.skip ?? 0
  const take = opts.take ?? 20
  const search = opts.search?.trim() ?? ''

  const where: Prisma.UserPointsWhereInput = { total: { gt: 0 } }

  if (search) {
    where.user = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ],
    }
  }

  const [rows, totalParticipants, filteredCount] = await Promise.all([
    prisma.userPoints.findMany({
      where,
      orderBy: [{ total: 'desc' }, { updatedAt: 'asc' }],
      skip,
      take,
      select: {
        userId: true,
        total: true,
        user: { select: { id: true, name: true, username: true, image: true } },
      },
    }),
    prisma.userPoints.count({ where: { total: { gt: 0 } } }),
    search ? prisma.userPoints.count({ where }) : Promise.resolve(0),
  ])

  // For ranking: if searching, we need the true rank of each user
  let rankings: PointsLeaderboardEntry[]

  if (search) {
    // Single query to build rank map — avoids N COUNT queries (one per result row)
    const allPoints = await prisma.userPoints.findMany({
      where: { total: { gt: 0 } },
      orderBy: { total: 'desc' },
      select: { userId: true, total: true },
    })
    const rankMap = new Map<string, number>()
    let rank = 1
    for (let i = 0; i < allPoints.length; i++) {
      if (i > 0 && allPoints[i].total < allPoints[i - 1].total) rank = i + 1
      rankMap.set(allPoints[i].userId, rank)
    }

    rankings = rows.map((row) => ({
      rank: rankMap.get(row.userId) ?? 0,
      userId: row.userId,
      username: row.user.name ?? row.user.username ?? 'Utilisateur',
      image: row.user.image ?? null,
      totalPoints: row.total,
      isCurrentUser: row.userId === currentUserId,
    }))
  } else {
    rankings = rows.map((row, i) => ({
      rank: skip + i + 1,
      userId: row.userId,
      username: row.user.name ?? row.user.username ?? 'Utilisateur',
      image: row.user.image ?? null,
      totalPoints: row.total,
      isCurrentUser: row.userId === currentUserId,
    }))
  }

  // Current user rank (always computed from full leaderboard)
  const currentUserEntry = rankings.find(r => r.isCurrentUser)
  let currentUser: PointsLeaderboardEntry | null = currentUserEntry ?? null

  if (!currentUser) {
    const myPoints = await prisma.userPoints.findUnique({
      where: { userId: currentUserId },
      select: { total: true },
    })
    if (myPoints && myPoints.total > 0) {
      const rank =
        (await prisma.userPoints.count({
          where: { total: { gt: myPoints.total } },
        })) + 1

      const me = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { name: true, username: true, image: true },
      })
      if (me) {
        currentUser = {
          rank,
          userId: currentUserId,
          username: me.name ?? me.username ?? 'Utilisateur',
          image: me.image ?? null,
          totalPoints: myPoints.total,
          isCurrentUser: true,
        }
      }
    }
  }

  const hasMore = search
    ? skip + take < filteredCount
    : skip + take < totalParticipants

  return { rankings, currentUser, totalParticipants, hasMore }
}
