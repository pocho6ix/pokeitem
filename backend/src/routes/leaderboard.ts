import { Router, Response } from "express";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { getPointsLeaderboard } from "../lib/points";

const router = Router();

// ─── GET /api/leaderboard ─────────────────────────────────────
// Shape mirrors `src/app/api/leaderboard/route.ts` (web) so the iOS
// ReferralBlock reads `rankings` / `currentUser` / `totalParticipants` /
// `hasMore` exactly like on the web. Auth-required because we need the
// caller's userId to compute `isCurrentUser` and the "me" entry.
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const skip = Math.max(0, Number(req.query.skip) || 0);
    const take = Math.min(50, Math.max(1, Number(req.query.take) || 20));
    const search = (req.query.q as string) ?? "";

    const leaderboard = await getPointsLeaderboard(userId, { skip, take, search });
    res.json(leaderboard);
  } catch (error) {
    console.error("leaderboard error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
