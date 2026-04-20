import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// ─── GET /api/prices?itemId=<id>&period=<7d|30d|90d|1y|all> ───
// Returns the PriceHistory rows within the period plus the current
// price and the % change vs. the oldest sample. No auth required.
router.get("/", async (req: Request, res: Response) => {
  try {
    const itemId = typeof req.query.itemId === "string" ? req.query.itemId : undefined;
    const period = typeof req.query.period === "string" ? req.query.period : "30d";

    if (!itemId) {
      return res.status(400).json({ error: "itemId is required" });
    }

    let dateFrom: Date | null = null;
    const now = new Date();

    switch (period) {
      case "7d":  dateFrom = new Date(now.getTime() - 7   * 24 * 60 * 60 * 1000); break;
      case "30d": dateFrom = new Date(now.getTime() - 30  * 24 * 60 * 60 * 1000); break;
      case "90d": dateFrom = new Date(now.getTime() - 90  * 24 * 60 * 60 * 1000); break;
      case "1y":  dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
      case "all": dateFrom = null; break;
      default:    dateFrom = new Date(now.getTime() - 30  * 24 * 60 * 60 * 1000);
    }

    const where: { itemId: string; date?: { gte: Date } } = { itemId };
    if (dateFrom) where.date = { gte: dateFrom };

    const prices = await prisma.priceHistory.findMany({
      where,
      orderBy: { date: "asc" },
    });

    const item = await prisma.item.findUnique({
      where:  { id: itemId },
      select: { currentPrice: true },
    });

    const currentPrice = item?.currentPrice ?? null;
    let priceChange: number | null = null;

    if (prices.length >= 2 && currentPrice !== null) {
      const oldestPrice = prices[0].price;
      priceChange = oldestPrice > 0
        ? ((currentPrice - oldestPrice) / oldestPrice) * 100
        : null;
    }

    res.json({
      prices,
      currentPrice,
      priceChange: priceChange !== null ? Math.round(priceChange * 100) / 100 : null,
    });
  } catch (error) {
    console.error("prices GET error:", error);
    res.status(500).json({ error: "Failed to fetch price history" });
  }
});

export default router;
