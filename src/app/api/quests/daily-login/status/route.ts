import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getParisStartOfDay, getParisNextMidnight } from "@/lib/paris-time"

/**
 * GET /api/quests/daily-login/status
 * Returns whether the current user has already claimed their daily login quest today.
 * "Today" is determined in Europe/Paris timezone.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const todayStart = getParisStartOfDay()

  const claim = await prisma.dailyQuestClaim.findFirst({
    where: {
      userId,
      questId: "daily_login",
      claimedAt: { gte: todayStart },
    },
    orderBy: { claimedAt: "desc" },
  })

  const claimedToday = !!claim
  const nextClaimAt = getParisNextMidnight()

  return NextResponse.json({
    claimedToday,
    claimedAt: claim?.claimedAt ?? null,
    nextClaimAt: nextClaimAt.toISOString(),
    points: 250,
  })
}
