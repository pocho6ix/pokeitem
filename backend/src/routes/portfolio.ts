import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

// ─── GET /api/portfolio ───────────────────────────────────────
// Returns all non-card items owned by the user.
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.portfolioItem.findMany({
      where:   { userId: req.userId },
      orderBy: { createdAt: "desc" },
      include: { item: true },
    });
    res.json({ items });
  } catch (error) {
    console.error("portfolio GET error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/portfolio ──────────────────────────────────────
// TODO: Check FREE plan limits (copy from src/app/api/portfolio/route.ts)
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { itemId, purchasePrice, purchaseDate, condition, quantity, notes } = req.body;
    if (!itemId) return res.status(400).json({ error: "itemId requis" });

    const entry = await prisma.portfolioItem.create({
      data: {
        userId:        req.userId!,
        itemId,
        purchasePrice: purchasePrice ?? null,
        purchaseDate:  purchaseDate  ? new Date(purchaseDate) : new Date(),
        condition:     condition     ?? "NEAR_MINT",
        quantity:      quantity      ?? 1,
        notes:         notes         ?? null,
      },
    });
    res.status(201).json({ entry });
  } catch (error) {
    console.error("portfolio POST error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── PUT /api/portfolio/:id ───────────────────────────────────
router.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.portfolioItem.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: "Introuvable" });
    }

    const { purchasePrice, purchaseDate, condition, quantity, notes } = req.body;
    const updated = await prisma.portfolioItem.update({
      where: { id: existing.id },
      data: {
        purchasePrice: purchasePrice ?? existing.purchasePrice,
        purchaseDate:  purchaseDate ? new Date(purchaseDate) : existing.purchaseDate,
        condition:     condition    ?? existing.condition,
        quantity:      quantity     ?? existing.quantity,
        notes:         notes        ?? existing.notes,
      },
    });
    res.json({ entry: updated });
  } catch (error) {
    console.error("portfolio PUT error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── DELETE /api/portfolio/:id ────────────────────────────────
router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.portfolioItem.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: "Introuvable" });
    }
    await prisma.portfolioItem.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (error) {
    console.error("portfolio DELETE error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/portfolio/stats ─────────────────────────────────
router.get("/stats", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [itemCount, cardCount] = await Promise.all([
      prisma.portfolioItem.count({ where: { userId: req.userId! } }),
      prisma.userCard.count({ where: { userId: req.userId! } }),
    ]);
    res.json({ itemCount, cardCount });
  } catch (error) {
    console.error("portfolio/stats error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/portfolio/chart ─────────────────────────────────
// TODO: Copy chart aggregation logic from src/app/api/portfolio/chart/route.ts
router.get("/chart", requireAuth, async (_req: AuthRequest, res: Response) => {
  res.status(501).json({ error: "Not implemented yet — logique à copier" });
});

// ─── GET /api/portfolio/rarities ──────────────────────────────
// TODO: Copy rarity distribution aggregation from src/app/api/portfolio/rarities/route.ts
router.get("/rarities", requireAuth, async (_req: AuthRequest, res: Response) => {
  res.status(501).json({ error: "Not implemented yet — logique à copier" });
});

// ─── POST /api/portfolio/valuation ────────────────────────────
router.post("/valuation", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Recompute the user's total portfolio value snapshot.
    const items = await prisma.portfolioItem.findMany({
      where:   { userId: req.userId },
      include: { item: true },
    });
    const totalValue = items.reduce(
      (acc, row) => acc + (row.item.currentPrice ?? 0) * row.quantity,
      0
    );
    res.json({ totalValue, itemCount: items.length });
  } catch (error) {
    console.error("portfolio/valuation error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
