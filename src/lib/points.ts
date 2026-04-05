import { prisma } from '@/lib/prisma'
import { QUEST_MAP, REFERRAL_POINTS } from '@/lib/quests'

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
      card: { select: { price: true, priceReverse: true } },
    },
  })
  const totalValue = userCardsWithPrices.reduce((sum, uc) => {
    const price = uc.version === 'REVERSE'
      ? (uc.card.priceReverse ?? uc.card.price ?? 0)
      : (uc.card.price ?? 0)
    return sum + price * uc.quantity
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

export async function getPointsLeaderboard(currentUserId: string) {
  const top = await prisma.userPoints.findMany({
    where: { total: { gt: 0 } },
    orderBy: [{ total: 'desc' }, { updatedAt: 'asc' }],
    take: 10,
    select: {
      userId: true,
      total: true,
      user: { select: { id: true, name: true, username: true, image: true } },
    },
  })

  const rankings: PointsLeaderboardEntry[] = top.map((row, i) => ({
    rank: i + 1,
    userId: row.userId,
    username: row.user.name ?? row.user.username ?? 'Utilisateur',
    image: row.user.image ?? null,
    totalPoints: row.total,
    isCurrentUser: row.userId === currentUserId,
  }))

  // Current user rank (even if outside top 10)
  const currentUserEntry = rankings.find(r => r.isCurrentUser)
  let currentUserRank: PointsLeaderboardEntry | null = currentUserEntry ?? null

  if (!currentUserRank) {
    // Fetch their rank
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
        currentUserRank = {
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

  const totalParticipants = await prisma.userPoints.count({ where: { total: { gt: 0 } } })

  return { rankings, currentUser: currentUserRank, totalParticipants }
}
