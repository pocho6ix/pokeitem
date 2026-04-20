import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

// ─── POST /api/scanner/identify ───────────────────────────────
// TODO: Wire up Anthropic API call (copy from src/app/api/scanner/identify/route.ts).
// Flow: accept image data-URL → call Claude Vision → match against Card catalog
// → return top-N candidates. Enforce per-plan scan quotas (req.user.plan).
router.post("/identify", requireAuth, async (_req: AuthRequest, res: Response) => {
  res.status(501).json({ error: "Not implemented yet — appel Anthropic à brancher" });
});

// ─── POST /api/scanner/correction ─────────────────────────────
// User feedback — the scan picked the wrong card. Persisted to
// `ScanCorrection` for offline analysis of the AI's accuracy.
router.post("/correction", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      aiTopCardId,
      aiTopConfidence,
      userSelectedCardId,
      selectionSource,
      ocrName,
      ocrNumber,
      ocrSetCode,
    } = req.body;

    if (!userSelectedCardId || !selectionSource) {
      return res.status(400).json({ error: "userSelectedCardId et selectionSource requis" });
    }

    const correction = await prisma.scanCorrection.create({
      data: {
        userId:             req.userId!,
        aiTopCardId:        aiTopCardId     ?? null,
        aiTopConfidence:    aiTopConfidence ?? null,
        userSelectedCardId,
        selectionSource,
        ocrName:            ocrName   ?? null,
        ocrNumber:          ocrNumber ?? null,
        ocrSetCode:         ocrSetCode ?? null,
      },
    });

    res.status(201).json({ correction });
  } catch (error) {
    console.error("scanner/correction error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/scanner/search ──────────────────────────────────
// Manual fallback search when the AI can't identify a card.
router.get("/search", async (req: Request, res: Response) => {
  try {
    const { q, limit } = req.query;
    const take = Math.min(Number(limit) || 20, 50);

    if (typeof q !== "string" || !q.trim()) {
      return res.json({ cards: [] });
    }

    const cards = await prisma.card.findMany({
      where: {
        OR: [
          { name:   { contains: q, mode: "insensitive" } },
          { number: { contains: q, mode: "insensitive" } },
        ],
      },
      take,
      select: {
        id: true, number: true, name: true, imageUrl: true,
        serie: { select: { name: true, slug: true } },
      },
    });

    res.json({ cards });
  } catch (error) {
    console.error("scanner/search error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
