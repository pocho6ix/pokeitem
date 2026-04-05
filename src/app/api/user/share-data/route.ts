import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ACTIVE_QUESTS } from '@/lib/quests'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const [points, cardCount, referralCount, userQuests, me] = await Promise.all([
    prisma.userPoints.findUnique({ where: { userId } }),
    prisma.userCard.count({ where: { userId } }),
    prisma.user.count({ where: { referredById: userId, emailVerified: { not: null } } }),
    prisma.userQuest.findMany({ where: { userId, completed: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true, image: true } }),
  ])

  const total = points?.total ?? 0
  const [rank, totalParticipants] = total > 0
    ? await Promise.all([
        prisma.userPoints.count({ where: { total: { gt: total } } }).then(n => n + 1),
        prisma.userPoints.count({ where: { total: { gt: 0 } } }),
      ])
    : [null, await prisma.userPoints.count({ where: { total: { gt: 0 } } })]

  return NextResponse.json({
    rank,
    totalParticipants,
    username: me?.name ?? me?.username ?? 'Dresseur',
    avatar: me ? `/api/avatar/${userId}` : null,
    totalPoints: total,
    cardCount,
    referralCount,
    questsCompleted: userQuests.length,
    questsTotal: ACTIVE_QUESTS.length,
  })
}
