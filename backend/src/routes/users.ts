import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { getCardValuesCents } from "../lib/pricing/getCardValueCents";

const router = Router();

// ─── Rate limiting & cache (per-user, in-process) ──────────────
// Simple sliding window — good enough for current scale. Replace with
// Redis if we ever scale horizontally.
const searchRate    = new Map<string, { count: number; resetAt: number }>();
const suggestedRate = new Map<string, { count: number; resetAt: number }>();

function hit(
  bucket: Map<string, { count: number; resetAt: number }>,
  userId: string,
  max: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const entry = bucket.get(userId);
  if (!entry || entry.resetAt < now) {
    bucket.set(userId, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > max;
}

// ─── GET /api/users/search?q=<text>&limit=<n> ─────────────────
// Substring match on User.name for active ClasseurShare owners (excl. caller).
// Returns per-result `cardsCount` + `matchsCount = |myWishlist ∩ theirDoubles|`.
router.get("/search", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const callerId = req.userId!;
    const MIN_Q    = 2;
    const MAX_LIM  = 20;
    const DEF_LIM  = 10;

    if (hit(searchRate, callerId, 30, 60_000)) {
      return res.status(429).json({ error: "Trop de requêtes, réessaye dans une minute" });
    }

    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limit = Math.min(
      MAX_LIM,
      Math.max(1, Number(req.query.limit ?? DEF_LIM) || DEF_LIM),
    );

    if (q.length < MIN_Q) {
      return res.status(400).json({ error: `Minimum ${MIN_Q} caractères`, results: [] });
    }

    const shares = await prisma.classeurShare.findMany({
      where: {
        isActive: true,
        user: {
          AND: [
            { id:   { not: callerId } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        },
      },
      orderBy: { user: { name: "asc" } },
      take:    limit,
      select: {
        slug:         true,
        shareDoubles: true,
        user: { select: { id: true, name: true, image: true } },
      },
    });

    if (shares.length === 0) return res.json({ results: [] });

    const userIds = shares.map((s) => s.user.id);

    const [cardRows, doubleImplicit, doubleExplicit, myWishlist] = await Promise.all([
      prisma.userCard.groupBy({
        by:    ["userId"],
        where: { userId: { in: userIds } },
        _count: { _all: true },
      }),
      prisma.userCard.findMany({
        where:  { userId: { in: userIds }, quantity: { gt: 1 } },
        select: { userId: true, cardId: true },
      }),
      prisma.userCardDouble.findMany({
        where:  { userId: { in: userIds } },
        select: { userId: true, cardId: true },
      }),
      prisma.cardWishlistItem.findMany({
        where:  { userId: callerId },
        select: { cardId: true },
      }),
    ]);

    const myWishSet = new Set(myWishlist.map((w) => w.cardId));
    const cardsBy   = new Map(cardRows.map((r) => [r.userId, r._count._all]));

    const doublesByUser = new Map<string, Set<string>>();
    for (const r of doubleImplicit) {
      let set = doublesByUser.get(r.userId);
      if (!set) { set = new Set(); doublesByUser.set(r.userId, set); }
      set.add(r.cardId);
    }
    for (const r of doubleExplicit) {
      let set = doublesByUser.get(r.userId);
      if (!set) { set = new Set(); doublesByUser.set(r.userId, set); }
      set.add(r.cardId);
    }

    function matchsFor(userId: string): number {
      const theirDoubles = doublesByUser.get(userId);
      if (!theirDoubles || myWishSet.size === 0) return 0;
      let n = 0;
      const [small, big] = theirDoubles.size < myWishSet.size
        ? [theirDoubles, myWishSet]
        : [myWishSet, theirDoubles];
      for (const id of small) if (big.has(id)) n++;
      return n;
    }

    const results = shares
      .map((s) => ({
        slug:        s.slug,
        displayName: s.user.name ?? "Dresseur",
        avatarUrl:   s.user.image,
        cardsCount:  cardsBy.get(s.user.id) ?? 0,
        matchsCount: s.shareDoubles ? matchsFor(s.user.id) : 0,
      }))
      .sort((a, b) => {
        if (b.matchsCount !== a.matchsCount) return b.matchsCount - a.matchsCount;
        return a.displayName.localeCompare(b.displayName);
      });

    res.json({ results });
  } catch (error) {
    console.error("users/search error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/users/suggested?limit=<n> ───────────────────────
// 1 h cache, 10 req/min. Returns active public dresseurs whose
// (cards ∪ doubles) overlap the caller's wishlist, sorted desc.

interface SuggestionRow {
  slug:        string;
  displayName: string;
  avatarUrl:   string | null;
  matchCount:  number;
}
interface SuggestionPayload { suggestions: SuggestionRow[] }

const suggestedCache = new Map<string, { expiresAt: number; payload: SuggestionPayload }>();
const SUGGESTED_TTL_MS = 60 * 60 * 1000;

router.get("/suggested", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const meId = req.userId!;
    const MAX_LIM = 24;
    const DEF_LIM = 12;

    if (hit(suggestedRate, meId, 10, 60_000)) {
      return res.status(429).json({ error: "Trop de requêtes" });
    }

    const limit = Math.min(
      MAX_LIM,
      Math.max(1, Number(req.query.limit ?? DEF_LIM) || DEF_LIM),
    );
    const cacheKey = `${meId}:${limit}`;

    const cached = suggestedCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.set("X-Cache", "HIT");
      return res.json(cached.payload);
    }

    const myWishlist = await prisma.cardWishlistItem.findMany({
      where:  { userId: meId },
      select: { cardId: true },
    });
    if (myWishlist.length === 0) {
      const payload: SuggestionPayload = { suggestions: [] };
      suggestedCache.set(cacheKey, { expiresAt: Date.now() + SUGGESTED_TTL_MS, payload });
      res.set("X-Cache", "MISS");
      return res.json(payload);
    }
    const myWishIds = myWishlist.map((w) => w.cardId);

    const shares = await prisma.classeurShare.findMany({
      where: { isActive: true, userId: { not: meId } },
      select: {
        slug:         true,
        shareCards:   true,
        shareDoubles: true,
        userId:       true,
        user: { select: { id: true, name: true, image: true } },
      },
    });
    if (shares.length === 0) {
      const payload: SuggestionPayload = { suggestions: [] };
      suggestedCache.set(cacheKey, { expiresAt: Date.now() + SUGGESTED_TTL_MS, payload });
      res.set("X-Cache", "MISS");
      return res.json(payload);
    }

    const cardsUserIds   = shares.filter((s) => s.shareCards)  .map((s) => s.userId);
    const doublesUserIds = shares.filter((s) => s.shareDoubles).map((s) => s.userId);

    const [cardRows, doubleRows] = await Promise.all([
      cardsUserIds.length > 0
        ? prisma.userCard.findMany({
            where:  { userId: { in: cardsUserIds }, cardId: { in: myWishIds } },
            select: { userId: true, cardId: true },
          })
        : Promise.resolve([]),
      doublesUserIds.length > 0
        ? prisma.userCardDouble.findMany({
            where:  { userId: { in: doublesUserIds }, cardId: { in: myWishIds } },
            select: { userId: true, cardId: true },
          })
        : Promise.resolve([]),
    ]);

    const matchByUser = new Map<string, Set<string>>();
    for (const r of cardRows) {
      let s = matchByUser.get(r.userId);
      if (!s) { s = new Set(); matchByUser.set(r.userId, s); }
      s.add(r.cardId);
    }
    for (const r of doubleRows) {
      let s = matchByUser.get(r.userId);
      if (!s) { s = new Set(); matchByUser.set(r.userId, s); }
      s.add(r.cardId);
    }

    const suggestions: SuggestionRow[] = shares
      .map((s) => ({
        slug:        s.slug,
        displayName: s.user.name ?? "Dresseur",
        avatarUrl:   s.user.image,
        matchCount:  matchByUser.get(s.user.id)?.size ?? 0,
      }))
      .filter((r) => r.matchCount > 0)
      .sort((a, b) => {
        if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
        return a.displayName.localeCompare(b.displayName);
      })
      .slice(0, limit);

    const payload: SuggestionPayload = { suggestions };
    suggestedCache.set(cacheKey, { expiresAt: Date.now() + SUGGESTED_TTL_MS, payload });
    res.set("X-Cache", "MISS");
    res.json(payload);
  } catch (error) {
    console.error("users/suggested error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/users/:slug/trade-calculator ────────────────────
// Computes canBuy / canSell / trade between the caller and the profile
// owner on the fly. No pre-computation, no TradeMatch table.

type CardSource = "doubles" | "collection";

interface CardPayload {
  cardId:     string;
  name:       string;
  setId:      string;
  setName:    string;
  number:     string;
  imageUrl:   string | null;
  rarity:     string | null;
  valueCents: number;
  source:     CardSource;
}

function mergeOwnership(
  collectionIds: Iterable<string>,
  doubleIds:     Iterable<string>,
): Map<string, CardSource> {
  const map = new Map<string, CardSource>();
  for (const id of collectionIds) map.set(id, "collection");
  for (const id of doubleIds)     map.set(id, "doubles"); // prefer spares
  return map;
}

router.get("/:slug/trade-calculator", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const meId = req.userId!;
    const { slug } = req.params;

    const share = await prisma.classeurShare.findUnique({
      where:  { slug },
      select: {
        isActive:      true,
        shareCards:    true,
        shareDoubles:  true,
        shareWishlist: true,
        userId:        true,
      },
    });
    if (!share || !share.isActive) {
      return res.status(404).json({ error: "Profil introuvable" });
    }

    if (share.userId === meId) {
      return res.json({
        canBuy:  { cards: [], totalValueCents: 0, count: 0 },
        canSell: { cards: [], totalValueCents: 0, count: 0 },
        trade: {
          possible:            false,
          iGive:               { cards: [], totalValueCents: 0 },
          iReceive:            { cards: [], totalValueCents: 0 },
          complementCents:     0,
          complementDirection: "none",
          balancePercent:      100,
        },
        hiddenSections: [],
        isSelf:         true,
      });
    }

    const [
      myWishlist, myCards, myDoubles,
      theirWishlist, theirCards, theirDoubles,
    ] = await Promise.all([
      prisma.cardWishlistItem.findMany({
        where:  { userId: meId },
        select: { cardId: true },
      }),
      prisma.userCard.findMany({
        where:  { userId: meId },
        select: { cardId: true, quantity: true },
      }),
      prisma.userCardDouble.findMany({
        where:  { userId: meId },
        select: { cardId: true },
      }),
      share.shareWishlist
        ? prisma.cardWishlistItem.findMany({
            where:  { userId: share.userId },
            select: { cardId: true },
          })
        : Promise.resolve([]),
      share.shareCards
        ? prisma.userCard.findMany({
            where:  { userId: share.userId },
            select: { cardId: true, quantity: true },
          })
        : Promise.resolve([]),
      share.shareDoubles
        ? prisma.userCardDouble.findMany({
            where:  { userId: share.userId },
            select: { cardId: true },
          })
        : Promise.resolve([]),
    ]);

    const myWishSet    = new Set(myWishlist.map((w) => w.cardId));
    const theirWishSet = new Set(theirWishlist.map((w) => w.cardId));

    const myCardIds   = new Set(myCards.map((c) => c.cardId));
    const myDoubleIds = new Set<string>(myDoubles.map((d) => d.cardId));
    for (const c of myCards) if (c.quantity > 1) myDoubleIds.add(c.cardId);

    const theirCardIds   = new Set(theirCards.map((c) => c.cardId));
    const theirDoubleIds = new Set<string>(theirDoubles.map((d) => d.cardId));
    for (const c of theirCards) if (c.quantity > 1) theirDoubleIds.add(c.cardId);

    const myOwnership    = mergeOwnership(myCardIds, myDoubleIds);
    const theirOwnership = mergeOwnership(theirCardIds, theirDoubleIds);

    const canBuyIds: string[]  = [];
    for (const id of theirOwnership.keys()) if (myWishSet.has(id)) canBuyIds.push(id);

    const canSellIds: string[] = [];
    for (const id of myOwnership.keys()) if (theirWishSet.has(id)) canSellIds.push(id);

    const allIds = Array.from(new Set([...canBuyIds, ...canSellIds]));
    const [cards, values] = await Promise.all([
      allIds.length > 0
        ? prisma.card.findMany({
            where:  { id: { in: allIds } },
            select: {
              id:       true,
              name:     true,
              number:   true,
              rarity:   true,
              imageUrl: true,
              serie: { select: { id: true, name: true, abbreviation: true } },
            },
          })
        : Promise.resolve([]),
      getCardValuesCents(allIds),
    ]);
    const cardsById = new Map(cards.map((c) => [c.id, c]));

    function buildPayload(cardId: string, source: CardSource): CardPayload | null {
      const c = cardsById.get(cardId);
      if (!c) return null;
      return {
        cardId,
        name:       c.name,
        setId:      c.serie.abbreviation ?? c.serie.id,
        setName:    c.serie.name,
        number:     c.number,
        imageUrl:   c.imageUrl,
        rarity:     c.rarity,
        valueCents: values.get(cardId) ?? 0,
        source,
      };
    }

    const canBuyCards = canBuyIds
      .map((id) => buildPayload(id, theirOwnership.get(id) ?? "collection"))
      .filter((p): p is CardPayload => p !== null);

    const canSellCards = canSellIds
      .map((id) => buildPayload(id, myOwnership.get(id) ?? "collection"))
      .filter((p): p is CardPayload => p !== null);

    function sumCents(arr: CardPayload[]): number {
      return arr.reduce((s, p) => (p.valueCents > 0 ? s + p.valueCents : s), 0);
    }

    const canBuyTotal  = sumCents(canBuyCards);
    const canSellTotal = sumCents(canSellCards);

    const tradePossible = canBuyCards.length > 0 && canSellCards.length > 0;
    const giveValue    = canSellTotal;
    const receiveValue = canBuyTotal;
    const deltaCents   = giveValue - receiveValue;

    // Tolerance ±1 € avoids labelling rounding noise as "unbalanced".
    let direction: "me_to_them" | "them_to_me" | "none";
    if (deltaCents > 100)       direction = "them_to_me";
    else if (deltaCents < -100) direction = "me_to_them";
    else                        direction = "none";

    const highest = Math.max(giveValue, receiveValue);
    const lowest  = Math.min(giveValue, receiveValue);
    const balancePercent = highest > 0 ? (lowest / highest) * 100 : 100;

    const hiddenSections: string[] = [];
    if (!share.shareWishlist) hiddenSections.push("wishlist");
    if (!share.shareCards)    hiddenSections.push("cards");
    if (!share.shareDoubles)  hiddenSections.push("doubles");

    res.json({
      canBuy: {
        cards:           canBuyCards,
        totalValueCents: canBuyTotal,
        count:           canBuyCards.length,
      },
      canSell: {
        cards:           canSellCards,
        totalValueCents: canSellTotal,
        count:           canSellCards.length,
      },
      trade: {
        possible:            tradePossible,
        iGive:    { cards: canSellCards, totalValueCents: giveValue },
        iReceive: { cards: canBuyCards,  totalValueCents: receiveValue },
        complementCents:     deltaCents,
        complementDirection: direction,
        balancePercent:      Math.round(balancePercent * 10) / 10,
      },
      hiddenSections,
      isSelf: false,
    });
  } catch (error) {
    console.error("users/:slug/trade-calculator error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
