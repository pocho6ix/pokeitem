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
// Public search endpoint — name / number / rarity filtering. When
// `serieSlug` is provided the cap is raised to 1000 so the mobile
// `SerieCartesClient` page can load the complete extension (some
// serie go past 250 cards). Without a serie filter we keep the 100
// cap for the home-search autocomplete.
//
// When `owned=true` is passed the handler filters to cards the
// authenticated user actually owns (UserCard rows) and attaches a
// `qty` on each result. Mirrors the "ownedOnly" branch in the web
// Next.js route.
//
// Response shape: `{ cards, results }` — both keys point to the same
// array so either the web (`results`) or the mobile (`cards`) caller
// works without adaptation.
router.get("/search", async (req: Request & { userId?: string }, res: Response) => {
  try {
    const { q, serieSlug, blocSlug, rarity, limit, owned } = req.query;
    const requested = Number(limit);
    const hasSerieFilter = typeof serieSlug === "string";
    const take = Math.min(
      Number.isFinite(requested) && requested > 0 ? requested : hasSerieFilter ? 1000 : 40,
      hasSerieFilter ? 1000 : 100,
    );

    const cardSelect = {
      id:                true,
      number:            true,
      name:              true,
      rarity:            true,
      imageUrl:          true,
      price:             true,
      priceFr:           true,
      priceReverse:      true,
      priceFirstEdition: true,
      isSpecial:         true,
      types:             true,
      category:          true,
      trainerType:       true,
      energyType:        true,
      serie: {
        select: {
          id:           true,
          name:         true,
          slug:         true,
          abbreviation: true,
          cardCount:    true,
          bloc: { select: { slug: true, name: true, abbreviation: true } },
        },
      },
    } satisfies Prisma.CardSelect;

    // ── Owned-only mode: search only cards in the user's collection ──
    if (owned === "true") {
      const userId = (req as AuthRequest).userId;
      if (!userId) {
        return res.json({ cards: [], results: [] });
      }
      const userCards = await prisma.userCard.findMany({
        where: {
          userId,
          card: {
            ...(typeof q === "string" && q.trim()
              ? {
                  OR: [
                    { name:   { contains: q, mode: "insensitive" } },
                    { number: { contains: q, mode: "insensitive" } },
                  ],
                }
              : {}),
            ...(typeof serieSlug === "string" ? { serie: { slug: serieSlug } } : {}),
            ...(typeof blocSlug  === "string" ? { serie: { bloc: { slug: blocSlug } } } : {}),
            ...(typeof rarity    === "string" ? { rarity: rarity as Prisma.EnumCardRarityFilter["equals"] } : {}),
          },
        },
        select: { cardId: true, card: { select: cardSelect } },
        take: 200,
      });
      const grouped = new Map<string, { card: (typeof userCards)[number]["card"]; qty: number }>();
      for (const uc of userCards) {
        const existing = grouped.get(uc.cardId);
        if (existing) existing.qty += 1;
        else grouped.set(uc.cardId, { card: uc.card, qty: 1 });
      }
      const sorted = [...grouped.values()].sort((a, b) => {
        const aImg = a.card.imageUrl ? 1 : 0;
        const bImg = b.card.imageUrl ? 1 : 0;
        if (aImg !== bImg) return bImg - aImg;
        const ap = a.card.priceFr ?? a.card.price ?? 0;
        const bp = b.card.priceFr ?? b.card.price ?? 0;
        return bp - ap;
      });
      const ownedResults = sorted.slice(0, take).map(({ card, qty }) => ({ ...card, qty }));
      return res.json({ cards: ownedResults, results: ownedResults });
    }

    // ── Default mode: search all cards ───────────────────────────────
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

    // Ordering strategy:
    //  - When `serieSlug` is set (serie detail grid) we want the natural
    //    number order inside the extension, most recent extensions first.
    //  - Otherwise (home search autocomplete) the user expects to see the
    //    most expensive / valuable hits at the top, falling back to the
    //    international price, then by serie release date for ties.
    const orderBy: Prisma.CardOrderByWithRelationInput[] = hasSerieFilter
      ? [{ serie: { releaseDate: "desc" } }, { number: "asc" }]
      : [
          { priceFr: { sort: "desc", nulls: "last" } },
          { price:   { sort: "desc", nulls: "last" } },
          { serie: { releaseDate: "desc" } },
        ];

    const cards = await prisma.card.findMany({
      where,
      take,
      orderBy,
      select: cardSelect,
    });

    res.json({ cards, results: cards });
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
// Returns the aggregated bloc/serie breakdown consumed by the mobile
// `/portfolio/doubles` page — mirrors the web RSC that does the same
// aggregation server-side with Prisma.
//
// Previous shape (`{ doubles: Array<groupBy row> }`) was broken: it
// grouped by (cardId, version) and filtered on _count > 1, which is
// always 0 because (userId, cardId, version) is unique in UserCard.
// Doubles are tracked via `UserCard.quantity > 1`.
router.get("/doubles", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const doubles = await prisma.userCard.findMany({
      where: { userId, quantity: { gt: 1 } },
      select: {
        quantity: true,
        version: true,
        card: {
          select: {
            price: true,
            priceFr: true,
            priceReverse: true,
            serie: {
              select: {
                slug: true,
                name: true,
                abbreviation: true,
                imageUrl: true,
                bloc: {
                  select: {
                    slug: true,
                    name: true,
                    abbreviation: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    interface SerieAgg {
      bloc: { slug: string; name: string; abbreviation: string | null };
      serie: {
        slug: string;
        name: string;
        abbreviation: string | null;
        imageUrl: string | null;
      };
      distinctDoubles: number;
      extraCopies: number;
      extraValue: number;
    }
    const bySerie = new Map<string, SerieAgg>();

    let globalExtraCopies = 0;
    let globalExtraValue = 0;

    for (const uc of doubles) {
      const extras = uc.quantity - 1;
      const unit = getPriceForVersion(uc.card, uc.version);
      const extraVal = unit * extras;

      globalExtraCopies += extras;
      globalExtraValue += extraVal;

      const key = uc.card.serie.slug;
      const agg = bySerie.get(key) ?? {
        bloc: {
          slug: uc.card.serie.bloc.slug,
          name: uc.card.serie.bloc.name,
          abbreviation: uc.card.serie.bloc.abbreviation ?? null,
        },
        serie: {
          slug: uc.card.serie.slug,
          name: uc.card.serie.name,
          abbreviation: uc.card.serie.abbreviation ?? null,
          imageUrl: uc.card.serie.imageUrl ?? null,
        },
        distinctDoubles: 0,
        extraCopies: 0,
        extraValue: 0,
      };
      agg.distinctDoubles += 1;
      agg.extraCopies += extras;
      agg.extraValue += extraVal;
      bySerie.set(key, agg);
    }

    // Group by bloc preserving the order of insertion (mirrors web RSC
    // which iterates over the static `BLOCS` list — close enough here).
    const blocMap = new Map<
      string,
      {
        blocSlug: string;
        blocName: string;
        blocAbbreviation: string | null;
        series: Array<{
          serieSlug: string;
          serieName: string;
          serieAbbreviation: string | null;
          serieImageUrl: string | null;
          distinctDoubles: number;
          extraCopies: number;
          extraValue: number;
        }>;
      }
    >();
    for (const agg of bySerie.values()) {
      const bk = agg.bloc.slug;
      if (!blocMap.has(bk)) {
        blocMap.set(bk, {
          blocSlug: agg.bloc.slug,
          blocName: agg.bloc.name,
          blocAbbreviation: agg.bloc.abbreviation,
          series: [],
        });
      }
      blocMap.get(bk)!.series.push({
        serieSlug: agg.serie.slug,
        serieName: agg.serie.name,
        serieAbbreviation: agg.serie.abbreviation,
        serieImageUrl: agg.serie.imageUrl,
        distinctDoubles: agg.distinctDoubles,
        extraCopies: agg.extraCopies,
        extraValue: Math.round(agg.extraValue * 100) / 100,
      });
    }

    res.json({
      blocs: Array.from(blocMap.values()),
      totalDistinct: doubles.length,
      totalSeries: bySerie.size,
      totalExtraCopies: globalExtraCopies,
      totalExtraValue: Math.round(globalExtraValue * 100) / 100,
    });
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
//
// Response shape matches the Next.js `/api/cards/[cardId]/price-history`
// route: `{ card, serie, history }`. The mobile `CardDetailModal`
// consumes all three — missing `card` was why the iOS detail sheet
// rendered as "Chargement…" while the chart loaded fine.
router.get("/:cardId/price-history", async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;
    const period = (req.query.period as string) ?? "3m";

    const card = await prisma.card.findUnique({
      where:  { id: cardId },
      select: {
        id:                 true,
        name:               true,
        number:             true,
        rarity:             true,
        imageUrl:           true,
        price:              true,
        priceFr:            true,
        priceReverse:       true,
        priceFirstEdition:  true,
        isSpecial:          true,
        priceUpdatedAt:     true,
        cardmarketId:       true,
        cardmarketUrl:      true,
        serie: {
          select: {
            name:        true,
            slug:        true,
            releaseDate: true,
            imageUrl:    true,
          },
        },
      },
    });

    if (!card) {
      return res.status(404).json({ error: "Carte introuvable" });
    }

    const now = new Date();
    const startDate = (() => {
      switch (period) {
        case "1w":  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case "1m":  return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        case "3m":  return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        case "6m":  return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        case "1y":  return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        case "max": return card.serie.releaseDate ?? new Date(2020, 0, 1);
        default:    return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      }
    })();

    const dbHistory = await prisma.cardPriceHistory.findMany({
      where:   { cardId, recordedAt: { gte: startDate } },
      orderBy: { recordedAt: "asc" },
      select:  {
        recordedAt:   true,
        price:        true,
        priceFr:      true,
        priceReverse: true,
      },
    });

    const merged = new Map<string, { price: number | null; priceFr: number | null; priceReverse: number | null }>();
    for (const h of dbHistory) {
      const date = h.recordedAt.toISOString().slice(0, 10);
      merged.set(date, {
        price:        h.price,
        priceFr:      h.priceFr      ?? null,
        priceReverse: h.priceReverse ?? null,
      });
    }
    const history = Array.from(merged.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    res.json({
      card: {
        id:                 card.id,
        name:               card.name,
        number:             card.number,
        rarity:             card.rarity,
        imageUrl:           card.imageUrl,
        price:              card.price,
        priceFr:            card.priceFr,
        priceReverse:       card.priceReverse,
        priceFirstEdition:  card.priceFirstEdition,
        isSpecial:          card.isSpecial,
        priceUpdatedAt:     card.priceUpdatedAt,
        cardmarketId:       card.cardmarketId,
        cardmarketUrl:      card.cardmarketUrl,
      },
      serie: card.serie,
      history,
    });
  } catch (error) {
    console.error("cards/:id/price-history error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/cards/:cardId ───────────────────────────────────
// Full card detail — powers the iOS /carte/:cardId page. Must be
// registered AFTER every collision-free more-specific route above
// (`/search`, `/collection`, `/cards-by-rarity`, `/doubles`,
// `/:cardId/owned`, `/:cardId/price-history`) so Express doesn't
// swallow them as `cardId = "search"` etc.
router.get("/:cardId", async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        serie: {
          include: { bloc: true },
        },
      },
    });

    if (!card) {
      return res.status(404).json({ error: "Carte introuvable" });
    }

    res.json({ card });
  } catch (error) {
    console.error("cards/:cardId error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
