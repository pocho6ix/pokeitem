import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPointsLeaderboard } from '@/lib/points'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const { searchParams } = req.nextUrl
  const skip = Math.max(0, parseInt(searchParams.get('skip') ?? '0', 10) || 0)
  const take = Math.min(50, Math.max(1, parseInt(searchParams.get('take') ?? '20', 10) || 20))
  const search = searchParams.get('q') ?? ''

  const leaderboard = await getPointsLeaderboard(userId, { skip, take, search })
  return NextResponse.json(leaderboard)
}
