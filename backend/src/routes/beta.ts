import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

// ─── POST /api/beta/activate ──────────────────────────────────
// One-shot 30-day PRO trial — guarded by `betaTrialActivatedAt`
// so each user can only claim it once (even if already expired).
router.post("/activate", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { plan: true, planExpiresAt: true, betaTrialActivatedAt: true },
    });
    if (!user) return res.status(404).json({ error: "Not found" });

    if (user.betaTrialActivatedAt) {
      return res.status(409).json({ error: "already_used" });
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: {
        betaTrialActivatedAt: now,
        plan:                 "PRO",
        planExpiresAt:        trialEnd,
        trialEndsAt:          trialEnd,
      },
    });

    res.json({ success: true, trialEndsAt: trialEnd });
  } catch (error) {
    console.error("beta/activate error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
