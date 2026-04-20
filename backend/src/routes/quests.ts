import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

// Matches the schema default on `DailyQuestClaim.pointsAwarded`.
const DAILY_LOGIN_POINTS = 250;
const QUEST_ID            = "daily_login";

/** Returns midnight UTC for "today". */
function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ─── POST /api/quests/daily-login/claim ───────────────────────
router.post("/daily-login/claim", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const today = startOfTodayUtc();

    const alreadyClaimed = await prisma.dailyQuestClaim.findFirst({
      where: {
        userId:    req.userId!,
        questId:   QUEST_ID,
        claimedAt: { gte: today },
      },
      select: { id: true },
    });
    if (alreadyClaimed) {
      return res.status(409).json({ error: "Récompense déjà réclamée aujourd'hui" });
    }

    await prisma.$transaction([
      prisma.dailyQuestClaim.create({
        data: {
          userId:        req.userId!,
          questId:       QUEST_ID,
          pointsAwarded: DAILY_LOGIN_POINTS,
        },
      }),
      prisma.userPoints.upsert({
        where:  { userId: req.userId! },
        create: { userId: req.userId!, total: DAILY_LOGIN_POINTS },
        update: { total: { increment: DAILY_LOGIN_POINTS } },
      }),
    ]);

    res.json({ success: true, points: DAILY_LOGIN_POINTS });
  } catch (error) {
    console.error("quests/daily-login/claim error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/quests/daily-login/status ───────────────────────
router.get("/daily-login/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const today = startOfTodayUtc();
    const claim = await prisma.dailyQuestClaim.findFirst({
      where:  { userId: req.userId!, questId: QUEST_ID, claimedAt: { gte: today } },
      select: { claimedAt: true },
    });
    res.json({ claimed: !!claim, claimedAt: claim?.claimedAt ?? null });
  } catch (error) {
    console.error("quests/daily-login/status error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
