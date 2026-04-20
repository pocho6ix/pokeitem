import { Router, Request, Response } from "express";
import { Prisma, CardVersion, CardRarity } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { checkFeature } from "../lib/subscription";
import { checkProgressiveQuests } from "../lib/points";
import { getPriceForVersion } from "../lib/display-price";

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
// Accepts BOTH shapes so we stay compatible with every caller:
//  - Single card  (mobile "add one card" flow, original contract):
//      { cardId, version, condition?, language?, foil?, purchasePrice?, gradeValue? }
//  - Batch        (web ClasseurCardGrid "add-all-visible" button):
//      { cards: [{ cardId, version, quantity?, ... }, ...] }
// The batch form mirrors the Next.js route schema in the PWA so the client
// doesn't need to know which backend it's talking to.
router.post("/collection", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const body = (req.body ?? {}) as Record<string, unknown>;

    // Normalize to an array so the rest of the handler is shape-agnostic.
    const batch: Array<Record<string, unknown>> = Array.isArray(body.cards)
      ? (body.cards as Array<Record<string, unknown>>)
      : [body];

    if (batch.length === 0) {
      return res.status(400).json({ error: "Aucune carte fournie" });
    }

    // Plan-limit check — single quota look-up covers the whole batch; if
    // it fails we reject the whole request.
    const check = await checkFeature(userId, "ADD_CARD");
    if (!check.allowed) {
      return res.status(403).json({
        error: "LIMIT_REACHED",
        reason: check.reason,
        limit: check.limit,
        current: check.current,
      });
    }

    const results: Array<{
      cardId: string;
      version: string;
      record: { id: string; gradeValue: number | null } | null;
      error?: string;
    }> = [];

    for (const entry of batch) {
      const cardId = entry.cardId as string | undefined;
      const version = entry.version as string | undefined;
      if (!cardId || !version) {
        results.push({ cardId: cardId ?? "", version: version ?? "", record: null, error: "cardId et version requis" });
        continue;
      }
      const parsedVersion = parseVersion(version);
      if (!parsedVersion) {
        results.push({ cardId, version, record: null, error: "version invalide" });
        continue;
      }
      const cardExists = await prisma.card.findUnique({
        where: { id: cardId },
        select: { id: true },
      });
      if (!cardExists) {
        results.push({ cardId, version, record: null, error: "Carte introuvable" });
        continue;
      }

      try {
        const created = await prisma.userCard.create({
          data: {
            userId,
            cardId,
            version:       parsedVersion,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            condition:     ((entry.condition as any) ?? "NEAR_MINT"),
            gradeValue:    (entry.gradeValue as number | null | undefined) ?? null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            language:      ((entry.language as any) ?? "FR"),
            foil:          typeof entry.foil === "boolean" ? (entry.foil as boolean) : false,
            purchasePrice: typeof entry.purchasePrice === "number" ? (entry.purchasePrice as number) : null,
          },
        });
        results.push({
          cardId,
          version: parsedVersion,
          record: { id: created.id, gradeValue: created.gradeValue ?? null },
        });
      } catch (err) {
        console.error("cards/collection POST single error:", err);
        results.push({ cardId, version: parsedVersion, record: null, error: "Insert failed" });
      }
    }

    // Fire-and-forget progressive quest update (runs once per batch)
    checkProgressiveQuests(userId).catch(() => {});

    // Preserve the legacy `{ card }` shape when a single non-batch payload
    // was posted, so existing mobile callers keep working unchanged.
    if (!Array.isArray(body.cards)) {
      const first = results[0];
      if (first?.error) return res.status(400).json({ error: first.error });
      return res.status(201).json({ card: first.record });
    }

    res.status(201).json({ results });
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

// ─── GET /api/cards/cards-by-rarity ───────────────────────────
// Groups the caller's collection by rarity. Per-card display price uses
// `getPriceForVersion` (respects FIRST_EDITION / REVERSE variants). When
// a cardId has multiple rows (different versions), we dedupe on display
// keeping the highest effective price — but the rarity section's total
// value still accounts for all copies × quantity.
router.get("/cards-by-rarity", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const userCards = await prisma.userCard.findMany({
      where:  { userId },
      select: {
        quantity: true,
        version:  true,
        card: {
          select: {
            id: true, name: true, number: true, rarity: true, imageUrl: true,
            price: true, priceFr: true, priceReverse: true,
            serie: { select: { name: true } },
          },
        },
      },
    });

    interface RarityCard {
      id: string;
      name: string;
      number: string;
      rarity: CardRarity;
      imageUrl: string | null;
      price: number;
      priceFr: number | null;
      isFrenchPrice: boolean;
      isReverse: boolean;
      serieName: string;
    }

    const byRarity = new Map<CardRarity, { cards: Map<string, RarityCard>; totalValue: number }>();

    for (const uc of userCards) {
      const rarity = uc.card.rarity as CardRarity;
      const effectivePrice = getPriceForVersion(uc.card, uc.version);
      const isReverse = uc.version !== "NORMAL";
      const isFrenchPrice = !isReverse && uc.card.priceFr != null;

      if (!byRarity.has(rarity)) byRarity.set(rarity, { cards: new Map(), totalValue: 0 });
      const group = byRarity.get(rarity)!;

      group.totalValue += effectivePrice * uc.quantity;

      const existing = group.cards.get(uc.card.id);
      if (!existing || effectivePrice > existing.price) {
        group.cards.set(uc.card.id, {
          id:            uc.card.id,
          name:          uc.card.name,
          number:        uc.card.number,
          rarity,
          imageUrl:      uc.card.imageUrl,
          price:         effectivePrice,
          priceFr:       uc.card.priceFr ?? null,
          isFrenchPrice,
          isReverse,
          serieName:     uc.card.serie.name,
        });
      }
    }

    const result = Array.from(byRarity.entries()).map(([rarityKey, { cards, totalValue }]) => {
      const sortedCards = [...cards.values()].sort((a, b) => b.price - a.price);
      return {
        rarityKey,
        cardCount:  sortedCards.length,
        totalValue: Math.round(totalValue * 100) / 100,
        cards:      sortedCards,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("cards/cards-by-rarity error:", error);
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
