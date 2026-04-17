import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCardValuesCents } from "@/lib/pricing/getCardValueCents";

/**
 * GET /api/users/:slug/trade-calculator
 *
 * Computes, on the fly, three independent sets between the caller (Me) and
 * the profile owner (Them):
 *
 *   canBuy  = Me.wishlist ∩ (Them.cards ∪ Them.doubles)
 *   canSell = Them.wishlist ∩ (Me.cards ∪ Me.doubles)
 *   trade   = derived from the two above, with €-complement + balance
 *
 * No pre-computation, no TradeMatch table. Four Prisma reads (my wishlist,
 * their wishlist, my cards/doubles, their cards/doubles) + one batched price
 * lookup. Intersections are Sets, O(n) each. Comfortable well under 500 ms
 * even for 2k-card collections.
 *
 * Visibility enforcement: if the owner has disabled a flag on their share,
 * the corresponding source is simply empty (and the section name is recorded
 * in `hiddenSections` so the UI can explain why).
 */

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Merge the two ownership sources for a user into a single per-cardId map.
 * A card present in both collection AND doubles is flagged as "doubles" —
 * that's the exemplar we'd actually trade. Dedupes implicitly via Map.
 */
function mergeOwnership(
  collectionIds: Iterable<string>,
  doubleIds:     Iterable<string>,
): Map<string, CardSource> {
  const map = new Map<string, CardSource>();
  for (const id of collectionIds) map.set(id, "collection");
  // doubles override — prefer the "spare" source for trade display
  for (const id of doubleIds) map.set(id, "doubles");
  return map;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const meId = (session.user as { id: string }).id;

  const { slug } = await params;
  const share = await prisma.classeurShare.findUnique({
    where: { slug },
    select: {
      isActive:     true,
      shareCards:   true,
      shareDoubles: true,
      shareWishlist: true,
      userId:       true,
    },
  });
  if (!share || !share.isActive) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  // Trading with yourself makes no sense — short-circuit with a canonical
  // empty calculator so the client can render a "c'est ton profil" state.
  if (share.userId === meId) {
    return NextResponse.json({
      canBuy:  { cards: [], totalValueCents: 0, count: 0 },
      canSell: { cards: [], totalValueCents: 0, count: 0 },
      trade: {
        possible:           false,
        iGive:              { cards: [], totalValueCents: 0 },
        iReceive:           { cards: [], totalValueCents: 0 },
        complementCents:     0,
        complementDirection: "none",
        balancePercent:      100,
      },
      hiddenSections: [],
      isSelf:         true,
    });
  }

  // ── Load the four ownership/wish sets in parallel ─────────────────────
  const [myWishlist, myCards, myDoubles, theirWishlist, theirCards, theirDoubles] = await Promise.all([
    prisma.cardWishlistItem.findMany({
      where: { userId: meId },
      select: { cardId: true },
    }),
    prisma.userCard.findMany({
      where: { userId: meId },
      select: { cardId: true, quantity: true },
    }),
    prisma.userCardDouble.findMany({
      where: { userId: meId },
      select: { cardId: true },
    }),
    share.shareWishlist
      ? prisma.cardWishlistItem.findMany({
          where: { userId: share.userId },
          select: { cardId: true },
        })
      : Promise.resolve([]),
    share.shareCards
      ? prisma.userCard.findMany({
          where: { userId: share.userId },
          select: { cardId: true, quantity: true },
        })
      : Promise.resolve([]),
    share.shareDoubles
      ? prisma.userCardDouble.findMany({
          where: { userId: share.userId },
          select: { cardId: true },
        })
      : Promise.resolve([]),
  ]);

  const myWishSet     = new Set(myWishlist.map((w) => w.cardId));
  const theirWishSet  = new Set(theirWishlist.map((w) => w.cardId));

  // A user's "cards" = every UserCard row (including qty=1 originals).
  // A user's "doubles" = every UserCardDouble row (explicit spares). Older
  // UserCard rows with qty>1 are ALSO treated as doubles implicitly, matching
  // the wishlist UI's own definition.
  const myCardIds     = new Set(myCards.map((c) => c.cardId));
  const myDoubleIds   = new Set<string>(myDoubles.map((d) => d.cardId));
  for (const c of myCards) if (c.quantity > 1) myDoubleIds.add(c.cardId);

  const theirCardIds   = new Set(theirCards.map((c) => c.cardId));
  const theirDoubleIds = new Set<string>(theirDoubles.map((d) => d.cardId));
  for (const c of theirCards) if (c.quantity > 1) theirDoubleIds.add(c.cardId);

  const myOwnership    = mergeOwnership(myCardIds, myDoubleIds);
  const theirOwnership = mergeOwnership(theirCardIds, theirDoubleIds);

  // ── Intersections ─────────────────────────────────────────────────────
  const canBuyIds: string[]  = [];
  for (const id of theirOwnership.keys()) if (myWishSet.has(id)) canBuyIds.push(id);

  const canSellIds: string[] = [];
  for (const id of myOwnership.keys()) if (theirWishSet.has(id)) canSellIds.push(id);

  // ── Enrich: pull card metadata + prices in ONE query pair ─────────────
  const allIds = Array.from(new Set([...canBuyIds, ...canSellIds]));
  const [cards, values] = await Promise.all([
    allIds.length > 0
      ? prisma.card.findMany({
          where: { id: { in: allIds } },
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

  // ── Totals. Cards with valueCents === 0 are excluded from complement so a
  // missing price doesn't poison the balance. The UI already hints that zero-
  // price cards still appear but don't count toward the euro total. ───────
  function sumCents(arr: CardPayload[]): number {
    return arr.reduce((s, p) => (p.valueCents > 0 ? s + p.valueCents : s), 0);
  }

  const canBuyTotal  = sumCents(canBuyCards);
  const canSellTotal = sumCents(canSellCards);

  // ── Trade section ─────────────────────────────────────────────────────
  const tradePossible = canBuyCards.length > 0 && canSellCards.length > 0;
  const iGive    = canSellCards;
  const iReceive = canBuyCards;
  const giveValue    = canSellTotal;
  const receiveValue = canBuyTotal;
  const deltaCents   = giveValue - receiveValue;

  // deltaCents = giveValue - receiveValue.
  // Positive delta → I'm giving MORE value than I'm receiving, so THEY owe
  // me the difference. Negative delta → the reverse: I owe them.
  // Tolerance ±100 cents avoids labelling a 0.50 € rounding noise as "unbalanced".
  let direction: "me_to_them" | "them_to_me" | "none";
  if (deltaCents > 100)       direction = "them_to_me"; // They owe me
  else if (deltaCents < -100) direction = "me_to_them"; // I owe them
  else                        direction = "none";

  const highest = Math.max(giveValue, receiveValue);
  const lowest  = Math.min(giveValue, receiveValue);
  const balancePercent = highest > 0 ? (lowest / highest) * 100 : 100;

  // ── Hidden sections (for UI explanation) ──────────────────────────────
  const hiddenSections: string[] = [];
  if (!share.shareWishlist) hiddenSections.push("wishlist");
  if (!share.shareCards)    hiddenSections.push("cards");
  if (!share.shareDoubles)  hiddenSections.push("doubles");

  return NextResponse.json({
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
      iGive:    { cards: iGive,    totalValueCents: giveValue },
      iReceive: { cards: iReceive, totalValueCents: receiveValue },
      complementCents:     deltaCents,
      complementDirection: direction,
      balancePercent:      Math.round(balancePercent * 10) / 10,
    },
    hiddenSections,
    isSelf: false,
  });
}
