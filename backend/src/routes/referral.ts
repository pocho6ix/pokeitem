import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

// ─── POST /api/referral/apply ─────────────────────────────────
// TODO: Reward logic — grant points to both parties, enforce single-use per
// user, etc. Copy from src/app/api/referral/apply/route.ts.
router.post("/apply", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { referralCode } = req.body;
    if (!referralCode) return res.status(400).json({ error: "referralCode requis" });

    const referrer = await prisma.user.findUnique({
      where:  { referralCode },
      select: { id: true },
    });
    if (!referrer) return res.status(404).json({ error: "Code de parrainage invalide" });

    await prisma.user.update({
      where: { id: req.userId! },
      data:  { referredById: referrer.id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("referral/apply error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/referral/stats ──────────────────────────────────
router.get("/stats", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.user.count({
      where: { referredById: req.userId! },
    });
    res.json({ referrals: count });
  } catch (error) {
    console.error("referral/stats error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/referral/leaderboard ────────────────────────────
// TODO: Copy leaderboard logic from src/app/api/referral/leaderboard/route.ts.
router.get("/leaderboard", async (_req, res: Response) => {
  res.status(501).json({ error: "Not implemented yet — logique à copier" });
});

export default router;
