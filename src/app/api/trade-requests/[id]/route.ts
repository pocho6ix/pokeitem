import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { TradeRequestStatus } from "@prisma/client";

/**
 * GET /api/trade-requests/:id
 *
 * Returns a single trade-request with card metadata embedded for the
 * recipient's accept/refuse page. Only accessible to the two parties.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const request = await prisma.tradeRequest.findUnique({
    where: { id },
    include: {
      fromUser: { select: { id: true, name: true, image: true, classeurShare: { select: { slug: true } } } },
      toUser:   { select: { id: true, name: true, image: true, classeurShare: { select: { slug: true } } } },
    },
  });
  if (!request) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (request.fromUserId !== userId && request.toUserId !== userId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const allCardIds = [...request.cardsGivenIds, ...request.cardsReceivedIds];
  const cards = allCardIds.length > 0
    ? await prisma.card.findMany({
        where: { id: { in: allCardIds } },
        select: {
          id: true, name: true, number: true, rarity: true, imageUrl: true,
          price: true, priceFr: true,
          serie: { select: { id: true, name: true, abbreviation: true } },
        },
      })
    : [];
  const cardById = new Map(cards.map((c) => [c.id, c]));

  return NextResponse.json({
    id:                    request.id,
    status:                request.status,
    createdAt:             request.createdAt.toISOString(),
    respondedAt:           request.respondedAt?.toISOString() ?? null,
    message:               request.message,
    givenValueCents:       request.givenValueCents,
    receivedValueCents:    request.receivedValueCents,
    compensationCents:     request.compensationCents,
    compensationDirection: request.compensationDirection,
    fromUser: request.fromUser,
    toUser:   request.toUser,
    cardsGiven:    request.cardsGivenIds.map   ((id) => cardById.get(id) ?? null).filter(Boolean),
    cardsReceived: request.cardsReceivedIds.map((id) => cardById.get(id) ?? null).filter(Boolean),
    viewerRole: request.fromUserId === userId ? "sender" : "recipient",
  });
}

/**
 * PATCH /api/trade-requests/:id   { status: "CANCELED" | "ACCEPTED" | "DECLINED" }
 *
 * - "CANCELED" is only valid for the sender, and only while PENDING.
 * - "ACCEPTED"/"DECLINED" are only valid for the recipient, and only while PENDING.
 * Flips status + stamps respondedAt.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json().catch(() => null) as { status?: string } | null;
  const desired = body?.status;
  if (desired !== "CANCELED" && desired !== "ACCEPTED" && desired !== "DECLINED") {
    return NextResponse.json({ error: "status invalide" }, { status: 400 });
  }

  const existing = await prisma.tradeRequest.findUnique({
    where: { id },
    select: { fromUserId: true, toUserId: true, status: true },
  });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (existing.status !== "PENDING") {
    return NextResponse.json({ error: "Cette demande n'est plus en attente" }, { status: 409 });
  }

  const isSender    = existing.fromUserId === userId;
  const isRecipient = existing.toUserId   === userId;

  if (desired === "CANCELED" && !isSender) {
    return NextResponse.json({ error: "Seul le demandeur peut annuler" }, { status: 403 });
  }
  if ((desired === "ACCEPTED" || desired === "DECLINED") && !isRecipient) {
    return NextResponse.json({ error: "Seul le destinataire peut accepter ou refuser" }, { status: 403 });
  }

  const updated = await prisma.tradeRequest.update({
    where: { id },
    data:  {
      status:      desired as TradeRequestStatus,
      respondedAt: new Date(),
    },
    select: { id: true, status: true, respondedAt: true },
  });

  return NextResponse.json({
    id:          updated.id,
    status:      updated.status,
    respondedAt: updated.respondedAt?.toISOString() ?? null,
  });
}
