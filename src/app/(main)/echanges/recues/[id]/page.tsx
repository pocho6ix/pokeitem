import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IncomingRequestClient } from "./IncomingRequestClient";

/**
 * Recipient-side view for a single trade request. This is where the "trade
 * request" email link lands. Shows the exact snapshot of what was sent and
 * offers Accepter / Refuser buttons while the status is PENDING.
 */
export default async function IncomingRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/connexion?next=${encodeURIComponent(`/echanges/recues/${id}`)}`);
  const userId = (session.user as { id: string }).id;

  const request = await prisma.tradeRequest.findUnique({
    where: { id },
    include: {
      fromUser: { select: { id: true, name: true, image: true, classeurShare: { select: { slug: true } } } },
      toUser:   { select: { id: true, name: true, image: true } },
    },
  });
  if (!request) notFound();
  if (request.fromUserId !== userId && request.toUserId !== userId) notFound();

  const allCardIds = [...request.cardsGivenIds, ...request.cardsReceivedIds];
  const cards = allCardIds.length > 0
    ? await prisma.card.findMany({
        where: { id: { in: allCardIds } },
        select: {
          id: true, name: true, number: true, rarity: true, imageUrl: true,
          serie: { select: { id: true, name: true, abbreviation: true } },
        },
      })
    : [];
  const cardById = new Map(cards.map((c) => [c.id, c]));

  return (
    <IncomingRequestClient
      request={{
        id:                    request.id,
        status:                request.status,
        createdAt:             request.createdAt.toISOString(),
        respondedAt:           request.respondedAt?.toISOString() ?? null,
        message:               request.message,
        givenValueCents:       request.givenValueCents,
        receivedValueCents:    request.receivedValueCents,
        compensationCents:     request.compensationCents,
        compensationDirection: request.compensationDirection,
        fromUser: {
          name:      request.fromUser.name ?? "Un dresseur",
          avatarUrl: request.fromUser.image,
          slug:      request.fromUser.classeurShare?.slug ?? null,
        },
        cardsGiven:    request.cardsGivenIds.map   ((cid) => cardById.get(cid)).filter((c): c is NonNullable<typeof c> => !!c),
        cardsReceived: request.cardsReceivedIds.map((cid) => cardById.get(cid)).filter((c): c is NonNullable<typeof c> => !!c),
      }}
      viewerRole={request.fromUserId === userId ? "sender" : "recipient"}
    />
  );
}
