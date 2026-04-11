import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getParisStartOfDay, getParisNextMidnight } from "@/lib/paris-time"
import { recalculateUserPoints } from "@/lib/points"

const DAILY_POINTS = 250
const QUEST_ID = "daily_login"

/**
 * POST /api/quests/daily-login/claim
 * Claims the daily login quest for the current user.
 * Idempotent per calendar day (Europe/Paris timezone).
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const todayStart = getParisStartOfDay()

  // Check if already claimed today — inside a transaction to prevent race conditions
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.dailyQuestClaim.findFirst({
      where: {
        userId,
        questId: QUEST_ID,
        claimedAt: { gte: todayStart },
      },
    })

    if (existing) {
      return { alreadyClaimed: true, claim: existing }
    }

    const claim = await tx.dailyQuestClaim.create({
      data: {
        userId,
        questId: QUEST_ID,
        pointsAwarded: DAILY_POINTS,
      },
    })

    await tx.pointEvent.create({
      data: {
        userId,
        points: DAILY_POINTS,
        source: "quest",
        questId: QUEST_ID,
        metadata: { date: todayStart.toISOString() },
      },
    })

    return { alreadyClaimed: false, claim }
  })

  if (result.alreadyClaimed) {
    return NextResponse.json({ error: "Already claimed today" }, { status: 409 })
  }

  // Recalculate points outside the transaction (non-critical if it fails)
  const newTotal = await recalculateUserPoints(userId).catch(() => null)

  return NextResponse.json({
    ok: true,
    pointsAwarded: DAILY_POINTS,
    claimedAt: result.claim.claimedAt,
    nextClaimAt: getParisNextMidnight().toISOString(),
    newTotal,
  })
}
