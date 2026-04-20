import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

// ─── GET /api/user/me ─────────────────────────────────────────
// Full user profile — richer than /api/auth/me (includes relations & points).
router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where:   { id: req.userId! },
      include: {
        userPoints: { select: { total: true } },
        _count:     { select: { userCards: true, portfolio: true } },
      },
    });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    const { passwordHash: _pwd, ...safe } = user;
    res.json({ user: safe });
  } catch (error) {
    console.error("user/me error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── PUT /api/user/username ───────────────────────────────────
router.put("/username", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { username } = req.body;
    if (!username || typeof username !== "string") {
      return res.status(400).json({ error: "username requis" });
    }

    const taken = await prisma.user.findFirst({
      where:  { username, NOT: { id: req.userId! } },
      select: { id: true },
    });
    if (taken) return res.status(409).json({ error: "Ce pseudo est déjà pris" });

    const user = await prisma.user.update({
      where:  { id: req.userId! },
      data:   { username },
      select: { id: true, username: true },
    });
    res.json({ user });
  } catch (error) {
    console.error("user/username error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/user/points ─────────────────────────────────────
// Points live on the `UserPoints` side-table (one row per user).
router.get("/points", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const row = await prisma.userPoints.findUnique({
      where:  { userId: req.userId! },
      select: { total: true },
    });
    res.json({ points: row?.total ?? 0 });
  } catch (error) {
    console.error("user/points error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/user/quests/:questId/complete ──────────────────
// TODO: Validate quest conditions before granting reward (copy from
// src/app/api/user/quests/[questId]/complete/route.ts).
router.post("/quests/:questId/complete", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { questId } = req.params;

    // Stub: mark quest complete without checking conditions.
    const existing = await prisma.userQuest.findFirst({
      where: { userId: req.userId!, questId },
    });

    if (existing?.completedAt) {
      return res.status(409).json({ error: "Quête déjà complétée" });
    }

    const completion = existing
      ? await prisma.userQuest.update({
          where: { id: existing.id },
          data:  { completed: true, completedAt: new Date() },
        })
      : await prisma.userQuest.create({
          data: { userId: req.userId!, questId, completed: true, completedAt: new Date() },
        });

    res.json({ completion });
  } catch (error) {
    console.error("user/quests/:id/complete error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── DELETE /api/user/delete ──────────────────────────────────
// Soft-delete only — a cron hard-deletes after the retention window.
// TODO: Stripe cleanup (cancel subscription, delete customer) — copy from
// src/app/api/user/delete/route.ts.
router.delete("/delete", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.userId! },
      data:  { deletedAt: new Date() },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("user/delete error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/user/share-data ─────────────────────────────────
// Sharing settings live on `ClasseurShare` (1:1 with User, optional).
router.get("/share-data", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.userId! },
      select: {
        username:      true,
        image:         true,
        classeurShare: true,
      },
    });
    res.json({ user });
  } catch (error) {
    console.error("user/share-data error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
