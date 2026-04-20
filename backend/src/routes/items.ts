import { Router, Request, Response } from "express";
import { Prisma, ItemType } from "@prisma/client";
import { prisma } from "../lib/prisma";

const router = Router();

// Schema note: there is NO `category` string on Item — product categorisation
// is the `type` enum (BOOSTER, ETB, TIN, …). Current price is `currentPrice`.

function parseItemType(value: unknown): ItemType | undefined {
  if (typeof value !== "string") return undefined;
  const upper = value.toUpperCase();
  return (upper in ItemType) ? (upper as ItemType) : undefined;
}

// ─── GET /api/items ───────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const { type, limit } = req.query;
    const take = Math.min(Number(limit) || 40, 100);

    const where: Prisma.ItemWhereInput = {};
    const parsedType = parseItemType(type);
    if (parsedType) where.type = parsedType;

    const items = await prisma.item.findMany({
      where,
      take,
      orderBy: { name: "asc" },
    });

    res.json({ items });
  } catch (error) {
    console.error("items GET error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/items/search ────────────────────────────────────
router.get("/search", async (req: Request, res: Response) => {
  try {
    const { q, limit } = req.query;
    const take = Math.min(Number(limit) || 40, 100);

    const items = await prisma.item.findMany({
      where: typeof q === "string" && q.trim()
        ? { name: { contains: q, mode: "insensitive" } }
        : undefined,
      take,
      orderBy: { name: "asc" },
    });

    res.json({ items });
  } catch (error) {
    console.error("items/search error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/items/:id ───────────────────────────────────────
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const item = await prisma.item.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "Item introuvable" });
    res.json({ item });
  } catch (error) {
    console.error("items/:id error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/items/:id/price ─────────────────────────────────
router.get("/:id/price", async (req: Request, res: Response) => {
  try {
    const item = await prisma.item.findUnique({
      where:  { id: req.params.id },
      select: { id: true, currentPrice: true, priceUpdatedAt: true },
    });
    if (!item) return res.status(404).json({ error: "Item introuvable" });
    res.json(item);
  } catch (error) {
    console.error("items/:id/price error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
