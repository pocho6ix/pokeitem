import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { QUEST_MAP } from '@/lib/quests'
import { completeQuest } from '@/lib/points'

export async function POST(
  _req: NextRequest,
  { params }: { params: { questId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const { questId } = params
  const quest = QUEST_MAP[questId]

  if (!quest || !quest.active) {
    return NextResponse.json({ error: 'Quest not found' }, { status: 404 })
  }

  // Only action quests can be manually completed
  if (quest.type !== 'action') {
    return NextResponse.json({ error: 'Quest is not manually completable' }, { status: 400 })
  }

  try {
    const newTotal = await completeQuest(userId, questId)
    return NextResponse.json({ success: true, pointsAwarded: quest.points, newTotal })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error'
    if (message === 'Quest already completed') {
      return NextResponse.json({ error: 'Already completed' }, { status: 409 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
