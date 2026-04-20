import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

// ─── GET /api/wishlist/cards/ids ──────────────────────────────
// Lightweight — just the IDs, for fast list diffing on the client.
router.get("/cards/ids", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await prisma.cardWishlistItem.findMany({
      where:  { userId: req.userId! },
      select: { cardId: true },
    });
    res.json({ ids: rows.map((r) => r.cardId) });
  } catch (error) {
    console.error("wishlist/cards/ids error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/wishlist/cards ──────────────────────────────────
router.get("/cards", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const entries = await prisma.cardWishlistItem.findMany({
      where:   { userId: req.userId! },
      orderBy: { addedAt: "desc" },
      include: {
        card: { include: { serie: { include: { bloc: true } } } },
      },
    });
    res.json({ entries });
  } catch (error) {
    console.error("wishlist/cards GET error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/wishlist/cards ─────────────────────────────────
router.post("/cards", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { cardId, priority, maxPrice, note } = req.body;
    if (!cardId) return res.status(400).json({ error: "cardId requis" });

    // Need setId to create — fetch it off the Card.
    const card = await prisma.card.findUnique({
      where:  { id: cardId },
      select: { serieId: true },
    });
    if (!card) return res.status(404).json({ error: "Carte introuvable" });

    const entry = await prisma.cardWishlistItem.upsert({
      where:  { userId_cardId: { userId: req.userId!, cardId } },
      create: {
        userId:   req.userId!,
        cardId,
        setId:    card.serieId,
        priority: priority ?? 1,
        maxPrice: maxPrice ?? null,
        note:     note     ?? null,
      },
      update: {
        priority: priority ?? undefined,
        maxPrice: maxPrice ?? undefined,
        note:     note     ?? undefined,
      },
    });

    res.status(201).json({ entry });
  } catch (error) {
    console.error("wishlist/cards POST error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/wishlist/cards/bulk ────────────────────────────
// TODO: Copy bulk-add logic from src/app/api/wishlist/cards/bulk/route.ts
// (handles de-dupe, per-plan limits, etc.)
router.post("/cards/bulk", requireAuth, async (_req: AuthRequest, res: Response) => {
  res.status(501).json({ error: "Not implemented yet — logique à copier" });
});

// ─── DELETE /api/wishlist/cards/:cardId ───────────────────────
router.delete("/cards/:cardId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.cardWishlistItem.deleteMany({
      where: { userId: req.userId!, cardId: req.params.cardId },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("wishlist/cards/:cardId DELETE error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/wishlist/cards/mark-acquired/:cardId ───────────
// Convenience: delete from wishlist AND add to collection in one call.
router.post("/cards/mark-acquired/:cardId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { cardId } = req.params;
    const { version, condition } = req.body;

    await prisma.$transaction([
      prisma.cardWishlistItem.deleteMany({
        where: { userId: req.userId!, cardId },
      }),
      prisma.userCard.create({
        data: {
          userId:    req.userId!,
          cardId,
          version:   version   ?? "NORMAL",
          condition: condition ?? "NEAR_MINT",
          language:  "FR",
        },
      }),
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error("wishlist/cards/mark-acquired error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
