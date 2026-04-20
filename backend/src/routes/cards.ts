import { Router, Request, Response } from "express";
import { Prisma, CardVersion } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

function parseVersion(value: unknown): CardVersion | undefined {
  if (typeof value !== "string") return undefined;
  const upper = value.toUpperCase();
  return (upper in CardVersion) ? (upper as CardVersion) : undefined;
}

// ─── GET /api/cards/search ────────────────────────────────────
// Public search endpoint — name/number/rarity filtering.
router.get("/search", async (req: Request, res: Response) => {
  try {
    const { q, serieSlug, blocSlug, rarity, limit } = req.query;
    const take = Math.min(Number(limit) || 40, 100);

    const where: Prisma.CardWhereInput = {};
    if (typeof q === "string" && q.trim()) {
      where.OR = [
        { name:   { contains: q, mode: "insensitive" } },
        { number: { contains: q, mode: "insensitive" } },
      ];
    }
    const serieFilter: Prisma.SerieWhereInput = {};
    if (typeof serieSlug === "string") serieFilter.slug = serieSlug;
    if (typeof blocSlug  === "string") serieFilter.bloc = { slug: blocSlug };
    if (Object.keys(serieFilter).length > 0) where.serie = serieFilter;
    if (typeof rarity === "string") {
      where.rarity = rarity as Prisma.EnumCardRarityFilter["equals"];
    }

    const cards = await prisma.card.findMany({
      where,
      take,
      orderBy: [{ serie: { releaseDate: "desc" } }, { number: "asc" }],
      select: {
        id: true, number: true, name: true, rarity: true, imageUrl: true,
        serie: { select: { id: true, name: true, slug: true, bloc: { select: { slug: true } } } },
      },
    });

    res.json({ cards });
  } catch (error) {
    console.error("cards/search error:", error);
    res.status(500).json({ error: "Erreur lors de la recherche" });
  }
});

// ─── GET /api/cards/collection ────────────────────────────────
router.get("/collection", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userCards = await prisma.userCard.findMany({
      where:  { userId: req.userId! },
      orderBy: { createdAt: "desc" },
    });
    res.json({ cards: userCards });
  } catch (error) {
    console.error("cards/collection GET error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/cards/collection ───────────────────────────────
// TODO: Check FREE plan limits (copy logic from src/app/api/cards/collection/route.ts)
router.post("/collection", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { cardId, version, condition, gradeValue, language } = req.body;
    if (!cardId || !version) return res.status(400).json({ error: "cardId et version requis" });

    const parsedVersion = parseVersion(version);
    if (!parsedVersion) return res.status(400).json({ error: "version invalide" });

    const created = await prisma.userCard.create({
      data: {
        userId:     req.userId!,
        cardId,
        version:    parsedVersion,
        condition:  condition ?? "NEAR_MINT",
        gradeValue: gradeValue ?? null,
        language:   language   ?? "FR",
      },
    });
    res.status(201).json({ card: created });
  } catch (error) {
    console.error("cards/collection POST error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── DELETE /api/cards/collection ─────────────────────────────
router.delete("/collection", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { entries } = req.body as { entries?: { cardId: string; version: string }[] };
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "entries[] requis" });
    }

    // Delete one-at-a-time (each (userId, cardId, version) might match >1 row)
    let deleted = 0;
    for (const e of entries) {
      const parsedVersion = parseVersion(e.version);
      if (!parsedVersion) continue;

      const victim = await prisma.userCard.findFirst({
        where:   { userId: req.userId!, cardId: e.cardId, version: parsedVersion },
        orderBy: { createdAt: "desc" },
        select:  { id: true },
      });
      if (victim) {
        await prisma.userCard.delete({ where: { id: victim.id } });
        deleted++;
      }
    }

    res.json({ success: true, deleted });
  } catch (error) {
    console.error("cards/collection DELETE error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/cards/doubles ───────────────────────────────────
router.get("/doubles", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const grouped = await prisma.userCard.groupBy({
      by: ["cardId", "version"],
      where:  { userId: req.userId! },
      _count: { _all: true },
      having: { cardId: { _count: { gt: 1 } } },
    });
    res.json({ doubles: grouped });
  } catch (error) {
    console.error("cards/doubles error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/cards/:cardId/owned ─────────────────────────────
router.get("/:cardId/owned", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { cardId } = req.params;
    const entries = await prisma.userCard.findMany({
      where:   { userId: req.userId!, cardId },
      orderBy: { createdAt: "asc" },
    });
    res.json({ entries });
  } catch (error) {
    console.error("cards/:id/owned error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/cards/:cardId/price-history ─────────────────────
// Schema note: CardPriceHistory has no `version` / `currency` columns.
// The per-version price lives on separate columns (`price`, `priceFr`,
// `priceReverse`). Caller can pick the series they want client-side.
router.get("/:cardId/price-history", async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;

    const history = await prisma.cardPriceHistory.findMany({
      where:   { cardId },
      orderBy: { recordedAt: "asc" },
      select:  {
        recordedAt:   true,
        price:        true,
        priceFr:      true,
        priceReverse: true,
        source:       true,
      },
    });

    res.json({ history });
  } catch (error) {
    console.error("cards/:id/price-history error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
