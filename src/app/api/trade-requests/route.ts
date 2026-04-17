import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCardValuesCents } from "@/lib/pricing/getCardValueCents";
import { sendTradeRequestEmail } from "@/lib/email/sendTradeRequest";
import type { TradeCompensationDirection } from "@prisma/client";

const MAX_CARDS_PER_SIDE = 500;

/**
 * POST /api/trade-requests
 *
 * Body: {
 *   toSlug:              string,
 *   cardsGivenIds:       string[],
 *   cardsReceivedIds:    string[],
 *   givenValueCents:     number,  // client's view, re-verified server-side
 *   receivedValueCents:  number,
 *   message?:            string
 * }
 *
 * Server re-validates the intersections and the values, then snapshots the
 * request into `TradeRequest` (status = PENDING) and fires the transactional
 * email. Email failure does NOT roll back the request — the recipient can
 * still see it in `/echanges/recues/:id` via the direct link.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const fromUserId = (session.user as { id: string }).id;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const {
    toSlug,
    cardsGivenIds,
    cardsReceivedIds,
    message,
  } = body as {
    toSlug?: unknown;
    cardsGivenIds?: unknown;
    cardsReceivedIds?: unknown;
    message?: unknown;
  };

  // ── Shape validation ─────────────────────────────────────────────────
  if (typeof toSlug !== "string" || !toSlug) {
    return NextResponse.json({ error: "toSlug manquant" }, { status: 400 });
  }
  if (!Array.isArray(cardsGivenIds) || !Array.isArray(cardsReceivedIds)) {
    return NextResponse.json({ error: "cardsGivenIds/cardsReceivedIds manquants" }, { status: 400 });
  }
  if (cardsGivenIds.length === 0 || cardsReceivedIds.length === 0) {
    return NextResponse.json(
      { error: "Il faut au moins une carte de chaque côté" },
      { status: 400 },
    );
  }
  if (cardsGivenIds.length > MAX_CARDS_PER_SIDE || cardsReceivedIds.length > MAX_CARDS_PER_SIDE) {
    return NextResponse.json({ error: "Trop de cartes dans la demande" }, { status: 400 });
  }
  if (!cardsGivenIds.every((x): x is string => typeof x === "string") ||
      !cardsReceivedIds.every((x): x is string => typeof x === "string")) {
    return NextResponse.json({ error: "IDs de cartes invalides" }, { status: 400 });
  }

  // ── Recipient lookup ─────────────────────────────────────────────────
  const share = await prisma.classeurShare.findUnique({
    where: { slug: toSlug },
    select: {
      isActive:      true,
      shareCards:    true,
      shareDoubles:  true,
      shareWishlist: true,
      userId:        true,
      user: { select: { email: true, name: true } },
    },
  });
  if (!share || !share.isActive) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }
  if (share.userId === fromUserId) {
    return NextResponse.json({ error: "Impossible de s'envoyer une demande" }, { status: 400 });
  }

  // ── Intersection re-verification (defence in depth) ──────────────────
  // Re-compute what the calculator would have shown at this moment, so a
  // stale client can't smuggle IDs that don't actually match the overlap.
  const [myWishlist, myCards, myDoubles, theirCards, theirDoubles] = await Promise.all([
    prisma.cardWishlistItem.findMany({ where: { userId: fromUserId },     select: { cardId: true } }),
    prisma.userCard.findMany({         where: { userId: fromUserId },     select: { cardId: true, quantity: true } }),
    prisma.userCardDouble.findMany({   where: { userId: fromUserId },     select: { cardId: true } }),
    share.shareCards
      ? prisma.userCard.findMany({       where: { userId: share.userId }, select: { cardId: true, quantity: true } })
      : Promise.resolve([]),
    share.shareDoubles
      ? prisma.userCardDouble.findMany({ where: { userId: share.userId }, select: { cardId: true } })
      : Promise.resolve([]),
  ]);
  const theirWishlist = share.shareWishlist
    ? await prisma.cardWishlistItem.findMany({ where: { userId: share.userId }, select: { cardId: true } })
    : [];

  const myWishSet    = new Set(myWishlist.map((w) => w.cardId));
  const theirWishSet = new Set(theirWishlist.map((w) => w.cardId));

  const myOwn = new Set<string>(myDoubles.map((d) => d.cardId));
  for (const c of myCards) myOwn.add(c.cardId);

  const theirOwn = new Set<string>(theirDoubles.map((d) => d.cardId));
  for (const c of theirCards) theirOwn.add(c.cardId);

  const validGive    = cardsGivenIds.every(   (id) => myOwn.has(id)   && theirWishSet.has(id));
  const validReceive = cardsReceivedIds.every((id) => theirOwn.has(id) && myWishSet.has(id));
  if (!validGive || !validReceive) {
    return NextResponse.json(
      { error: "Certaines cartes ne font plus partie de l'échange possible" },
      { status: 409 },
    );
  }

  // ── Price snapshot — server-side, canonical ──────────────────────────
  const priceMap = await getCardValuesCents([
    ...new Set([...cardsGivenIds, ...cardsReceivedIds]),
  ]);
  const givenValueCents    = cardsGivenIds.reduce(   (s, id) => s + (priceMap.get(id) ?? 0), 0);
  const receivedValueCents = cardsReceivedIds.reduce((s, id) => s + (priceMap.get(id) ?? 0), 0);
  const deltaCents         = givenValueCents - receivedValueCents;

  let direction: TradeCompensationDirection;
  if (deltaCents > 100)       direction = "TO_TO_FROM"; // gave more → recipient owes me
  else if (deltaCents < -100) direction = "FROM_TO_TO"; // gave less → I owe recipient
  else                        direction = "NONE";

  // ── Persist + dispatch email ─────────────────────────────────────────
  const request = await prisma.tradeRequest.create({
    data: {
      fromUserId,
      toUserId:              share.userId,
      cardsGivenIds:         cardsGivenIds,
      cardsReceivedIds:      cardsReceivedIds,
      givenValueCents,
      receivedValueCents,
      compensationCents:     Math.abs(deltaCents),
      compensationDirection: direction,
      status:                "PENDING",
      message:               typeof message === "string" ? message.slice(0, 2000) : null,
    },
    select: { id: true, createdAt: true },
  });

  // Pull the minimal card metadata needed for the email — names + images.
  const cardsForEmail = await prisma.card.findMany({
    where: { id: { in: [...cardsGivenIds, ...cardsReceivedIds] } },
    select: { id: true, name: true, imageUrl: true, rarity: true },
  });
  const cardById = new Map(cardsForEmail.map((c) => [c.id, c]));

  const sender = await prisma.user.findUnique({
    where: { id: fromUserId },
    select: { name: true, image: true },
  });

  let emailSent = false;
  if (share.user.email) {
    emailSent = await sendTradeRequestEmail({
      requestId:             request.id,
      senderName:            sender?.name ?? "Un dresseur",
      senderAvatarUrl:       sender?.image ?? null,
      recipientEmail:        share.user.email,
      recipientName:         share.user.name ?? "Dresseur",
      cardsGiven:            cardsGivenIds.map((id) => {
        const c = cardById.get(id);
        return { name: c?.name ?? "", imageUrl: c?.imageUrl ?? null, rarity: c?.rarity ?? null };
      }),
      cardsReceived:         cardsReceivedIds.map((id) => {
        const c = cardById.get(id);
        return { name: c?.name ?? "", imageUrl: c?.imageUrl ?? null, rarity: c?.rarity ?? null };
      }),
      givenValueCents,
      receivedValueCents,
      compensationCents:     Math.abs(deltaCents),
      compensationDirection: direction,
    });
  }

  return NextResponse.json({
    id:        request.id,
    status:    "PENDING",
    createdAt: request.createdAt.toISOString(),
    emailSent,
  }, { status: 201 });
}

/**
 * GET /api/trade-requests?direction=sent|received&status=PENDING|…
 *
 * Lists the caller's outgoing (`sent`) or incoming (`received`) requests.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const url = new URL(req.url);
  const dir = (url.searchParams.get("direction") ?? "sent") as "sent" | "received";
  const statusParam = url.searchParams.get("status");

  const where = dir === "received"
    ? { toUserId:   userId, ...(statusParam ? { status: statusParam as never } : {}) }
    : { fromUserId: userId, ...(statusParam ? { status: statusParam as never } : {}) };

  const requests = await prisma.tradeRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take:    50,
    select: {
      id:                    true,
      status:                true,
      createdAt:             true,
      respondedAt:           true,
      cardsGivenIds:         true,
      cardsReceivedIds:      true,
      givenValueCents:       true,
      receivedValueCents:    true,
      compensationCents:     true,
      compensationDirection: true,
      fromUser: { select: { id: true, name: true, image: true, classeurShare: { select: { slug: true } } } },
      toUser:   { select: { id: true, name: true, image: true, classeurShare: { select: { slug: true } } } },
    },
  });

  return NextResponse.json({ requests });
}
