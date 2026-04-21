import { Router, Response } from "express";
import Stripe from "stripe";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { QUEST_MAP, ACTIVE_QUESTS } from "../lib/quests";
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
// Shape mirrors `src/app/api/user/points/route.ts` (web) so the iOS
// QuestsBlock reads `totalPoints` / `rank` / `quests` / `pointsHistory`
// exactly like on the web. Quest list is materialised from ACTIVE_QUESTS
// + the user's progress/completion side-tables.
router.get("/points", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const [userPoints, userQuestRows, pointsHistory] = await Promise.all([
      prisma.userPoints.findUnique({ where: { userId } }),
      prisma.userQuest.findMany({
        where: { userId },
        select: { questId: true, completed: true, progress: true, completedAt: true },
      }),
      prisma.pointEvent.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { points: true, source: true, questId: true, createdAt: true },
      }),
    ]);

    const totalPoints = userPoints?.total ?? 0;

    const rank = totalPoints > 0
      ? (await prisma.userPoints.count({ where: { total: { gt: totalPoints } } })) + 1
      : null;

    const questStateMap = Object.fromEntries(userQuestRows.map((q) => [q.questId, q]));

    const quests = ACTIVE_QUESTS.map((q) => {
      const state = questStateMap[q.id];
      return {
        id: q.id,
        title: q.title,
        description: q.description,
        points: q.points,
        icon: q.icon,
        type: q.type,
        target: q.target,
        actionUrl: q.actionUrl,
        actionLabel: q.actionLabel,
        completed: state?.completed ?? false,
        completedAt: state?.completedAt ?? null,
        progress: state?.progress ?? 0,
      };
    });

    res.json({ totalPoints, rank, quests, pointsHistory });
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
// Shape mirrors the Next.js web route at `src/app/api/user/share-data/route.ts`
// — the mobile client's <LeaderboardShareCard> reads flat fields (cardCount,
// totalPoints, …) off the response, so any deviation crashes the hydration
// with `undefined.toLocaleString is not a function`.
router.get("/share-data", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const [points, cardCount, referralCount, userQuests, me] = await Promise.all([
      prisma.userPoints.findUnique({ where: { userId } }),
      prisma.userCard.count({ where: { userId } }),
      prisma.user.count({ where: { referredById: userId, emailVerified: { not: null } } }),
      prisma.userQuest.findMany({ where: { userId, completed: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true, image: true } }),
    ]);

    const total = points?.total ?? 0;
    const [rank, totalParticipants] = total > 0
      ? await Promise.all([
          prisma.userPoints.count({ where: { total: { gt: total } } }).then((n) => n + 1),
          prisma.userPoints.count({ where: { total: { gt: 0 } } }),
        ])
      : [null, await prisma.userPoints.count({ where: { total: { gt: 0 } } })];

    res.json({
      rank,
      totalParticipants,
      username: me?.name ?? me?.username ?? "Dresseur",
      avatar: me ? `/api/avatar/${userId}` : null,
      totalPoints: total,
      cardCount,
      referralCount,
      questsCompleted: userQuests.length,
      questsTotal: ACTIVE_QUESTS.length,
    });
  } catch (error) {
    console.error("user/share-data error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
