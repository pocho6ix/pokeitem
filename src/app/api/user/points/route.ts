import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ACTIVE_QUESTS } from '@/lib/quests'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  // Run independent queries in parallel — 3 round-trips → 1
  const [userPoints, userQuestRows, pointsHistory] = await Promise.all([
    prisma.userPoints.findUnique({ where: { userId } }),
    prisma.userQuest.findMany({
      where: { userId },
      select: { questId: true, completed: true, progress: true, completedAt: true },
    }),
    prisma.pointEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { points: true, source: true, questId: true, createdAt: true },
    }),
  ])

  const totalPoints = userPoints?.total ?? 0

  // Rank needs totalPoints — runs after the parallel batch
  const rank = totalPoints > 0
    ? (await prisma.userPoints.count({ where: { total: { gt: totalPoints } } })) + 1
    : null

  const questStateMap = Object.fromEntries(userQuestRows.map(q => [q.questId, q]))

  const quests = ACTIVE_QUESTS.map(q => {
    const state = questStateMap[q.id]
    return {
      id: q.id,
      title: q.title,
      description: q.description,
      points: q.points,
      icon: q.icon,
      type: q.type,
      target: q.target,
      actionUrl: q.actionUrl,
      actionLabel: q.actionLabel,
      completed: state?.completed ?? false,
      completedAt: state?.completedAt ?? null,
      progress: state?.progress ?? 0,
    }
  })

  return NextResponse.json({ totalPoints, rank, quests, pointsHistory })
}
