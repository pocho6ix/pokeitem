import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const router = Router();

// ─── GET /api/market ──────────────────────────────────────────
// Latest market prices snapshot — used on the "Cotes" page.
router.get("/", async (req: Request, res: Response) => {
  try {
    const { serieSlug, blocSlug, limit } = req.query;
    const take = Math.min(Number(limit) || 50, 200);

    const where: Prisma.CardWhereInput = { price: { not: null } };
    const serieFilter: Prisma.SerieWhereInput = {};
    if (typeof serieSlug === "string") serieFilter.slug = serieSlug;
    if (typeof blocSlug  === "string") serieFilter.bloc = { slug: blocSlug };
    if (Object.keys(serieFilter).length > 0) where.serie = serieFilter;

    const cards = await prisma.card.findMany({
      where,
      take,
      orderBy: { price: "desc" },
      select: {
        id: true, name: true, number: true, imageUrl: true, rarity: true, price: true,
        priceUpdatedAt: true,
        serie: { select: { name: true, slug: true, bloc: { select: { slug: true } } } },
      },
    });

    res.json({ cards });
  } catch (error) {
    console.error("market error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
