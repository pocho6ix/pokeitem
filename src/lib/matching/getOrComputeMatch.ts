import { prisma } from "@/lib/prisma";
import { computeTradeMatch } from "./computeTradeMatch";

export async function getOrComputeMatch(visitorId: string, ownerId: string) {
  if (visitorId === ownerId) return null;

  // Check cache (24h TTL)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const cached = await prisma.tradeMatch.findFirst({
    where: {
      OR: [
        { userAId: visitorId, userBId: ownerId },
        { userAId: ownerId, userBId: visitorId },
      ],
      computedAt: { gt: cutoff },
    },
    orderBy: { computedAt: "desc" },
  });

  if (cached) {
    // normalize to visitor's perspective
    const isAVisitor = cached.userAId === visitorId;
    return {
      youGiveCardIds: isAVisitor ? cached.aGivesCardIds : cached.bGivesCardIds,
      youReceiveCardIds: isAVisitor ? cached.bGivesCardIds : cached.aGivesCardIds,
      youGiveValueCents: isAVisitor ? cached.aValueCents : cached.bValueCents,
      youReceiveValueCents: isAVisitor ? cached.bValueCents : cached.aValueCents,
      balanceScore: cached.balanceScore,
      computedAt: cached.computedAt,
      isViable: cached.balanceScore >= 0.7 && Math.min(cached.aValueCents, cached.bValueCents) >= 200,
    };
  }

  // Compute fresh
  const [visitorDoubles, visitorWishlist, ownerDoubles, ownerWishlist] = await Promise.all([
    prisma.userCardDouble.findMany({ where: { userId: visitorId }, select: { cardId: true } }),
    prisma.cardWishlistItem.findMany({ where: { userId: visitorId }, select: { cardId: true } }),
    prisma.userCardDouble.findMany({ where: { userId: ownerId }, select: { cardId: true } }),
    prisma.cardWishlistItem.findMany({ where: { userId: ownerId }, select: { cardId: true } }),
  ]);

  const result = await computeTradeMatch(
    { userId: visitorId, doubles: visitorDoubles.map(d => d.cardId), wishlist: visitorWishlist.map(w => w.cardId) },
    { userId: ownerId, doubles: ownerDoubles.map(d => d.cardId), wishlist: ownerWishlist.map(w => w.cardId) },
  );

  // Upsert cache (always, even if not viable)
  await prisma.tradeMatch.upsert({
    where: { userAId_userBId: { userAId: visitorId, userBId: ownerId } },
    create: {
      userAId: visitorId, userBId: ownerId,
      aGivesCardIds: result.aGivesCardIds, bGivesCardIds: result.bGivesCardIds,
      aValueCents: result.aValueCents, bValueCents: result.bValueCents,
      balanceScore: result.balanceScore, computedAt: new Date(),
    },
    update: {
      aGivesCardIds: result.aGivesCardIds, bGivesCardIds: result.bGivesCardIds,
      aValueCents: result.aValueCents, bValueCents: result.bValueCents,
      balanceScore: result.balanceScore, computedAt: new Date(),
    },
  }).catch(() => {});

  if (!result.isViable) return null;

  return {
    youGiveCardIds: result.aGivesCardIds,
    youReceiveCardIds: result.bGivesCardIds,
    youGiveValueCents: result.aValueCents,
    youReceiveValueCents: result.bValueCents,
    balanceScore: result.balanceScore,
    computedAt: new Date(),
    isViable: true,
  };
}
