import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OutgoingRequestsClient } from "./OutgoingRequestsClient";

/**
 * "Mes demandes envoyées" — lists the caller's outgoing TradeRequest rows,
 * grouped implicitly by status in the UI. Shipped as a server page so the
 * initial markup is already populated (no loader flash).
 */
export default async function OutgoingRequestsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/connexion");
  const userId = (session.user as { id: string }).id;

  const requests = await prisma.tradeRequest.findMany({
    where: { fromUserId: userId },
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
      toUser: {
        select: {
          id:            true,
          name:          true,
          image:         true,
          classeurShare: { select: { slug: true } },
        },
      },
    },
  });

  return (
    <OutgoingRequestsClient
      requests={requests.map((r) => ({
        id:                    r.id,
        status:                r.status,
        createdAt:             r.createdAt.toISOString(),
        respondedAt:           r.respondedAt?.toISOString() ?? null,
        givenCount:            r.cardsGivenIds.length,
        receivedCount:         r.cardsReceivedIds.length,
        givenValueCents:       r.givenValueCents,
        receivedValueCents:    r.receivedValueCents,
        compensationCents:     r.compensationCents,
        compensationDirection: r.compensationDirection,
        recipient: {
          slug:        r.toUser.classeurShare?.slug ?? null,
          name:        r.toUser.name ?? "Dresseur",
          avatarUrl:   r.toUser.image ?? null,
        },
      }))}
    />
  );
}
