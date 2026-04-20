import { Router, Response } from "express";
import { ItemType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { checkFeature } from "../lib/subscription";
import { resolveItemPrice } from "../lib/portfolio/resolveItemPrice";
import { getPriceForVersion } from "../lib/display-price";
import { SERIES } from "../data/series";
import { BLOCS } from "../data/blocs";

const router = Router();

// ─── GET /api/portfolio ───────────────────────────────────────
// Returns the full user portfolio + aggregated summary/topPerformers.
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const portfolioItems = await prisma.portfolioItem.findMany({
      where: { userId },
      select: {
        id: true,
        quantity: true,
        purchasePrice: true,
        currentPrice: true,
        currentPriceUpdatedAt: true,
        purchaseDate: true,
        condition: true,
        notes: true,
        createdAt: true,
        item: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            imageUrl: true,
            retailPrice: true,
            language: true,
            cardmarketUrl: true,
            serie: {
              select: {
                id: true,
                name: true,
                slug: true,
                abbreviation: true,
                imageUrl: true,
                bloc: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = portfolioItems.map((pi) => {
      const purchasePrice = pi.purchasePrice ?? 0;
      const currentPrice = resolveItemPrice(pi.currentPrice, pi.item.retailPrice);
      const currentValue = currentPrice * pi.quantity;
      const pnl = currentValue - purchasePrice;
      const pnlPercent = purchasePrice > 0 ? (pnl / purchasePrice) * 100 : 0;

      return {
        id: pi.id,
        currentPrice: pi.currentPrice,
        currentPriceUpdatedAt: pi.currentPriceUpdatedAt,
        item: { ...pi.item, currentPrice: null },
        quantity: pi.quantity,
        purchasePrice,
        purchasePricePerUnit: pi.quantity > 0 ? purchasePrice / pi.quantity : 0,
        purchaseDate: pi.purchaseDate,
        condition: pi.condition,
        currentValue,
        currentValuePerUnit: currentPrice,
        pnl,
        pnlPercent,
        notes: pi.notes,
        createdAt: pi.createdAt,
      };
    });

    const totalInvested = items.reduce((sum, i) => sum + i.purchasePrice, 0);
    const totalCurrentValue = items.reduce((sum, i) => sum + i.currentValue, 0);
    const totalPnl = totalCurrentValue - totalInvested;
    const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    const typeMap = new Map<string, number>();
    for (const i of items) {
      typeMap.set(i.item.type, (typeMap.get(i.item.type) ?? 0) + i.currentValue);
    }
    const totalValue = items.reduce((s, i) => s + i.currentValue, 0);
    const distributionByType = Array.from(typeMap.entries()).map(([type, value]) => ({
      name: type,
      value: totalValue > 0 ? Math.round((value / totalValue) * 100) : 0,
      type,
    }));

    const topPerformers = items
      .filter((i) => i.purchasePrice > 0 && i.currentValuePerUnit > 0)
      .map((i) => ({
        name: i.item.name,
        purchasePrice: i.purchasePricePerUnit,
        currentPrice: i.currentValuePerUnit,
        pl: i.pnlPercent,
      }))
      .sort((a, b) => b.pl - a.pl)
      .slice(0, 5);

    const summary = {
      totalInvested: Math.round(totalInvested * 100) / 100,
      totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
      totalPnl: Math.round(totalPnl * 100) / 100,
      totalPnlPercent: Math.round(totalPnlPercent * 100) / 100,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      uniqueItemCount: items.length,
    };

    res.json({ items, summary, distributionByType, topPerformers });
  } catch (error) {
    console.error("portfolio GET error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/portfolio ──────────────────────────────────────
// Enforces FREE plan 5-item limit. Auto-creates Serie/Bloc/Item from static
// data if the caller only has the slug (e.g. mobile "new item" flow).
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const check = await checkFeature(userId, "ADD_SEALED_ITEM");
    if (!check.allowed) {
      return res.status(403).json({
        error: "LIMIT_REACHED",
        reason: check.reason,
        limit: check.limit,
        current: check.current,
      });
    }

    const {
      itemId,
      quantity,
      purchasePrice,
      purchaseDate,
      condition,
      notes,
      serieSlug,
      itemType,
      itemName,
      retailPrice,
    } = req.body ?? {};

    if (quantity !== undefined && (typeof quantity !== "number" || quantity < 1)) {
      return res.status(400).json({ error: "quantity doit être un nombre positif" });
    }

    let resolvedItemId: string | undefined = itemId;

    // Auto-create path: serieSlug + itemType
    if (!resolvedItemId && serieSlug && itemType) {
      let serie = await prisma.serie.findFirst({ where: { slug: serieSlug } });

      if (!serie) {
        const staticSerie = SERIES.find((s) => s.slug === serieSlug);
        if (!staticSerie) {
          return res.status(400).json({ error: "Série introuvable dans les données statiques" });
        }
        const blocSlug = staticSerie.blocSlug;

        let bloc = await prisma.bloc.findFirst({ where: { slug: blocSlug } });
        if (!bloc) {
          const staticBloc = BLOCS.find((b) => b.slug === blocSlug);
          if (!staticBloc) {
            return res.status(400).json({ error: "Bloc introuvable dans les données statiques" });
          }
          bloc = await prisma.bloc.create({
            data: {
              name: staticBloc.name,
              slug: staticBloc.slug,
              abbreviation: staticBloc.abbreviation ?? null,
              order: staticBloc.order,
            },
          });
        }

        serie = await prisma.serie.create({
          data: {
            name: staticSerie.name,
            slug: staticSerie.slug,
            abbreviation: staticSerie.abbreviation ?? null,
            blocId: bloc.id,
          },
        });
      }

      let item = await prisma.item.findFirst({
        where: { serieId: serie.id, type: itemType as ItemType },
      });

      if (!item) {
        const slug = `${serieSlug}-${String(itemType).toLowerCase().replace(/_/g, "-")}`;
        item = await prisma.item.create({
          data: {
            serieId: serie.id,
            name: itemName || `${serie.name} — ${itemType}`,
            slug,
            type: itemType as ItemType,
            retailPrice: retailPrice ?? null,
          },
        });
      }

      resolvedItemId = item.id;
    }

    if (!resolvedItemId) {
      return res.status(400).json({ error: "itemId ou serieSlug + itemType requis" });
    }

    const itemExists = await prisma.item.findUnique({ where: { id: resolvedItemId } });
    if (!itemExists) return res.status(404).json({ error: "Item non trouvé" });

    const entry = await prisma.portfolioItem.create({
      data: {
        userId,
        itemId: resolvedItemId,
        quantity: quantity ?? 1,
        purchasePrice: purchasePrice ?? 0,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        condition: condition ?? "NEAR_MINT",
        notes: notes ?? null,
      },
      include: { item: true },
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
// Rich summary consumed by `PortfolioTiles` (home classeur) and
// `PortfolioMiniStats` (KPI strip). Mirrors the shape of the web
// Next.js route at `src/app/api/portfolio/stats/route.ts` so the
// same UI runs in both builds without client-side adaptation.
router.get("/stats", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const rarity = (req.query.rarity as string | undefined) ?? null;

    // Sealed items are excluded when a rarity filter is active.
    const portfolioItems = rarity
      ? []
      : await prisma.portfolioItem.findMany({
          where: { userId },
          select: {
            id: true,
            quantity: true,
            purchasePrice: true,
            currentPrice: true,
            item: {
              select: {
                id: true,
                name: true,
                type: true,
                retailPrice: true,
              },
            },
          },
        });

    const resolvedUnitPrice = portfolioItems.map((pi) =>
      resolveItemPrice(pi.currentPrice, pi.item.retailPrice),
    );

    const totalItems = portfolioItems.reduce((sum, pi) => sum + pi.quantity, 0);
    const itemsValue = portfolioItems.reduce(
      (sum, pi, i) => sum + resolvedUnitPrice[i] * pi.quantity,
      0,
    );
    const itemsInvested = portfolioItems.reduce(
      (sum, pi) => sum + (pi.purchasePrice ?? 0) * pi.quantity,
      0,
    );

    // Cards
    const userCards = await prisma.userCard.findMany({
      where: {
        userId,
        ...(rarity ? { card: { rarity: rarity as never } } : {}),
      },
      select: {
        quantity: true,
        version: true,
        purchasePrice: true,
        card: {
          select: {
            price: true,
            priceFr: true,
            priceReverse: true,
          },
        },
      },
    });

    const cardsValue = userCards.reduce(
      (sum, uc) => sum + getPriceForVersion(uc.card, uc.version) * uc.quantity,
      0,
    );
    const cardsInvested = userCards.reduce(
      (sum, uc) => sum + (uc.purchasePrice ?? 0) * uc.quantity,
      0,
    );

    const cardCount = userCards.reduce((sum, uc) => sum + uc.quantity, 0);
    const doublesCount = userCards.filter((uc) => uc.quantity > 1).length;
    const doublesValue = userCards
      .filter((uc) => uc.quantity > 1)
      .reduce(
        (sum, uc) =>
          sum + getPriceForVersion(uc.card, uc.version) * (uc.quantity - 1),
        0,
      );

    const wishlistCount = await prisma.cardWishlistItem.count({
      where: { userId },
    });

    const totalValue = itemsValue + cardsValue;
    const totalInvested = itemsInvested + cardsInvested;
    const profitLoss = totalValue - totalInvested;
    const profitLossPercent =
      totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    // Distribution by sealed-item type (web parity)
    const distributionMap = new Map<string, { count: number; value: number }>();
    portfolioItems.forEach((pi, i) => {
      const type = pi.item.type;
      const existing = distributionMap.get(type) ?? { count: 0, value: 0 };
      existing.count += pi.quantity;
      existing.value += resolvedUnitPrice[i] * pi.quantity;
      distributionMap.set(type, existing);
    });
    const distributionByType = Array.from(distributionMap.entries()).map(
      ([type, data]) => ({ type, ...data }),
    );

    // Top performers by ROI
    const topPerformers = portfolioItems
      .map((pi, i) => ({ pi, unitPrice: resolvedUnitPrice[i] }))
      .filter(
        ({ pi, unitPrice }) =>
          pi.purchasePrice && pi.purchasePrice > 0 && unitPrice > 0,
      )
      .map(({ pi, unitPrice }) => ({
        id: pi.id,
        itemId: pi.item.id,
        name: pi.item.name,
        type: pi.item.type,
        purchasePrice: pi.purchasePrice!,
        currentPrice: unitPrice,
        roi: ((unitPrice - pi.purchasePrice!) / pi.purchasePrice!) * 100,
      }))
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 10);

    res.json({
      // Legacy flat counts — kept for backward compat with the old simple shape
      itemCount: totalItems,
      cardCount,
      // Rich shape expected by the PortfolioTiles / PortfolioMiniStats UI
      totalItems,
      totalValue: Math.round(totalValue * 100) / 100,
      itemsValue: Math.round(itemsValue * 100) / 100,
      totalInvested: Math.round(totalInvested * 100) / 100,
      profitLoss: Math.round(profitLoss * 100) / 100,
      profitLossPercent: Math.round(profitLossPercent * 100) / 100,
      distributionByType,
      topPerformers,
      doublesCount,
      cardValue: Math.round(cardsValue * 100) / 100,
      doublesValue: Math.round(doublesValue * 100) / 100,
      wishlistCount,
    });
  } catch (error) {
    console.error("portfolio/stats error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/portfolio/chart ─────────────────────────────────
// period: 7J | 1M | 3M | 6M | 1A | MAX. For 7J we sample every 6h, otherwise daily.
router.get("/chart", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const period = (req.query.period as string) || "1M";
    const serieSlug = (req.query.serie as string) || null;

    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case "7J":  startDate.setDate(now.getDate() - 7); break;
      case "1M":  startDate.setMonth(now.getMonth() - 1); break;
      case "3M":  startDate.setMonth(now.getMonth() - 3); break;
      case "6M":  startDate.setMonth(now.getMonth() - 6); break;
      case "1A":  startDate.setFullYear(now.getFullYear() - 1); break;
      case "MAX": startDate.setFullYear(2020); break;
    }

    const portfolioItems = await prisma.portfolioItem.findMany({
      where: {
        userId,
        ...(serieSlug ? { item: { serie: { slug: serieSlug } } } : {}),
      },
      select: {
        purchaseDate: true,
        createdAt: true,
        purchasePrice: true,
        quantity: true,
        currentPrice: true,
        item: {
          select: {
            retailPrice: true,
            prices: {
              where: { date: { gte: startDate } },
              orderBy: { date: "asc" },
              select: { date: true, price: true },
            },
          },
        },
      },
    });

    const userCards = await prisma.userCard.findMany({
      where: {
        userId,
        ...(serieSlug ? { card: { serie: { slug: serieSlug } } } : {}),
      },
      select: {
        quantity: true,
        version: true,
        createdAt: true,
        purchasePrice: true,
        card: { select: { price: true, priceFr: true, priceReverse: true } },
      },
    });

    const cardContribs = userCards.map((uc) => ({
      addedAt: uc.createdAt,
      value: getPriceForVersion(uc.card, uc.version) * uc.quantity,
      invested: (uc.purchasePrice ?? 0) * uc.quantity,
    }));

    const data: Array<{ date: string; value: number; invested: number }> = [];
    const cursor = new Date(startDate);

    while (cursor <= now) {
      const dateStr = cursor.toISOString().split("T")[0];
      let totalValue = 0;
      let totalInvested = 0;

      for (const pi of portfolioItems) {
        const purchaseDate = pi.purchaseDate ?? pi.createdAt;
        if (purchaseDate <= cursor) {
          totalInvested += pi.purchasePrice ?? 0;
          const priceAtDate = pi.item.prices
            .filter((ph) => new Date(ph.date) <= cursor)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          const price = priceAtDate?.price ?? pi.currentPrice ?? pi.item.retailPrice ?? 0;
          totalValue += price * pi.quantity;
        }
      }

      for (const cc of cardContribs) {
        if (cc.addedAt <= cursor) {
          totalValue += cc.value;
          totalInvested += cc.invested;
        }
      }

      data.push({
        date: dateStr,
        value: Math.round(totalValue * 100) / 100,
        invested: Math.round(totalInvested * 100) / 100,
      });

      if (period === "7J") {
        cursor.setHours(cursor.getHours() + 6);
      } else {
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    const seriesWithCards = await prisma.serie.findMany({
      where: {
        OR: [
          { cards: { some: { userCards: { some: { userId } } } } },
          { items: { some: { portfolioItems: { some: { userId } } } } },
        ],
      },
      select: { slug: true, name: true, abbreviation: true },
      orderBy: { name: "asc" },
    });

    res.json({ data, series: seriesWithCards });
  } catch (error) {
    console.error("portfolio/chart error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/portfolio/rarities ──────────────────────────────
// UserCard groupBy rarity with quantity-weighted valuation.
router.get("/rarities", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const rows = await prisma.userCard.findMany({
      where: { userId },
      select: {
        quantity: true,
        version: true,
        card: { select: { rarity: true, price: true, priceFr: true, priceReverse: true } },
      },
    });

    const map = new Map<string, { cardCount: number; totalValue: number }>();
    for (const uc of rows) {
      const key = uc.card.rarity;
      if (!key) continue;
      const price = getPriceForVersion(uc.card, uc.version);
      const existing = map.get(key) ?? { cardCount: 0, totalValue: 0 };
      existing.cardCount += uc.quantity;
      existing.totalValue += price * uc.quantity;
      map.set(key, existing);
    }

    const result = Array.from(map.entries()).map(([rarityKey, data]) => ({
      rarityKey,
      cardCount: data.cardCount,
      totalValue: Math.round(data.totalValue * 100) / 100,
    }));

    res.json(result);
  } catch (error) {
    console.error("portfolio/rarities error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/portfolio/valuation ────────────────────────────
router.post("/valuation", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.portfolioItem.findMany({
      where: { userId: req.userId },
      include: { item: true },
    });
    const totalValue = items.reduce(
      (acc, row) => acc + resolveItemPrice(row.currentPrice, row.item.retailPrice) * row.quantity,
      0
    );
    res.json({ totalValue, itemCount: items.length });
  } catch (error) {
    console.error("portfolio/valuation error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
