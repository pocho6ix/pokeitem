import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { onReferralEmailVerified, getLeaderboard, getReferralStats } from "../lib/referral";

const router = Router();

// ─── POST /api/referral/apply ─────────────────────────────────
// - Caller must not already have a referrer.
// - Cannot self-refer.
// - Must apply within 7 days of signup.
// - Award points immediately if the caller's email is already verified.
router.post("/apply", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { referralCode } = req.body ?? {};
    if (!referralCode) {
      return res.status(400).json({ error: "No referral code" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredById: true, createdAt: true },
    });

    if (user?.referredById) {
      return res.status(400).json({ error: "Already referred" });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (user?.createdAt && user.createdAt < sevenDaysAgo) {
      return res.status(400).json({ error: "Too late to apply referral" });
    }

    const referrer = await prisma.user.findFirst({
      where: {
        OR: [
          { referralCode },
          { username: { equals: referralCode, mode: "insensitive" } },
        ],
        NOT: { id: userId },
      },
      select: { id: true, name: true },
    });
    if (!referrer) {
      return res.status(404).json({ error: "Invalid referral code" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { referredById: referrer.id },
    });

    await onReferralEmailVerified(userId).catch(() => {});

    res.json({ success: true, referrerName: referrer.name });
  } catch (error) {
    console.error("referral/apply error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/referral/stats ──────────────────────────────────
// Shape mirrors `src/app/api/referral/stats/route.ts` (web) so the iOS
// ReferralBlock / QuestsBlock read `referralCode` / `referralLink` /
// `validatedCount` / `pendingCount` exactly like on the web.
router.get("/stats", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getReferralStats(req.userId!);
    res.json(stats);
  } catch (error) {
    console.error("referral/stats error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/referral/leaderboard ────────────────────────────
router.get("/leaderboard", async (req, res: Response) => {
  try {
    // Pass empty string if caller isn't authed — isCurrentUser will just be false.
    const currentUserId = (req as AuthRequest).userId ?? "";
    const leaderboard = await getLeaderboard(currentUserId);
    res.json(leaderboard);
  } catch (error) {
    console.error("referral/leaderboard error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
