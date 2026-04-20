import { Router, Response } from "express";
import Stripe from "stripe";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { QUEST_MAP } from "../lib/quests";
import { completeQuest } from "../lib/points";

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
// Only "action" quests are manually completable. Progressive quests
// (add_500_cards, collection_1000, three_extensions) are auto-completed
// by checkProgressiveQuests() — this endpoint rejects them with 400.
router.post("/quests/:questId/complete", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { questId } = req.params;

    const quest = QUEST_MAP[questId];
    if (!quest || !quest.active) {
      return res.status(404).json({ error: "Quest not found" });
    }
    if (quest.type !== "action") {
      return res.status(400).json({ error: "Quête progressive — pas de validation manuelle" });
    }

    const existing = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
    });
    if (existing?.completed) {
      return res.status(409).json({ error: "Quête déjà complétée" });
    }

    try {
      const total = await completeQuest(userId, questId);
      res.json({ success: true, totalPoints: total });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur";
      res.status(400).json({ error: msg });
    }
  } catch (error) {
    console.error("user/quests/:id/complete error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── DELETE /api/user/delete ──────────────────────────────────
// Soft-delete + cancel Stripe subscription at period end (if any).
router.delete("/delete", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeSubscriptionId: true, deletedAt: true },
    });

    if (user?.deletedAt) {
      return res.status(409).json({ error: "Compte déjà supprimé" });
    }

    if (user?.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: "2026-03-25.dahlia" as Stripe.LatestApiVersion,
        });
        await stripe.subscriptions.update(user.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      } catch (err) {
        console.error("[user/delete] stripe cancel failed:", err);
        // Do not block the deletion if Stripe fails.
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
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
