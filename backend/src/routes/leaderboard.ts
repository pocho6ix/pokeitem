import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// ─── GET /api/leaderboard ─────────────────────────────────────
// Top users by total points. Public endpoint — queries `UserPoints` directly
// (faster than joining through User) and hydrates the user once we have the
// winners. Sharing consent is on `ClasseurShare`; we only surface users who
// (a) aren't soft-deleted and (b) have an active public/link share.
router.get("/", async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const take = Math.min(Number(limit) || 50, 200);

    const rows = await prisma.userPoints.findMany({
      where: {
        user: {
          deletedAt:     null,
          classeurShare: { isActive: true, visibility: { in: ["public", "link"] } },
        },
      },
      orderBy: { total: "desc" },
      take,
      select: {
        total: true,
        user:  { select: { id: true, username: true, image: true } },
      },
    });

    const leaderboard = rows.map((r) => ({
      id:       r.user.id,
      username: r.user.username,
      image:    r.user.image,
      points:   r.total,
    }));

    res.json({ leaderboard });
  } catch (error) {
    console.error("leaderboard error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
