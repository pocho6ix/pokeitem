import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeTradeMatch } from "@/lib/matching/computeTradeMatch";

const RATE_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const cutoff = new Date(Date.now() - RATE_LIMIT_MS);
  const recentMatch = await prisma.tradeMatch.findFirst({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
      computedAt: { gt: cutoff },
      balanceScore: { gt: 0 },
    },
    orderBy: { computedAt: "desc" },
  });

  if (recentMatch) {
    const nextAt = new Date(recentMatch.computedAt.getTime() + RATE_LIMIT_MS);
    return NextResponse.json({
      error: "rate_limited",
      nextRecomputeAt: nextAt.toISOString(),
    }, { status: 429 });
  }

  // Load current user's data — doubles = UserCard with quantity > 1
  const [myDoubles, myWishlist] = await Promise.all([
    prisma.userCard.findMany({ where: { userId, quantity: { gt: 1 } }, select: { cardId: true }, distinct: ["cardId"] }),
    prisma.cardWishlistItem.findMany({ where: { userId }, select: { cardId: true } }),
  ]);

  // Get all active public profiles (excluding self)
  const activeShares = await prisma.classeurShare.findMany({
    where: { isActive: true, userId: { not: userId } },
    select: { userId: true },
  });

  let matchesFound = 0;
  const totalChecked = activeShares.length;

  for (const { userId: partnerId } of activeShares) {
    const [partnerDoubles, partnerWishlist] = await Promise.all([
      prisma.userCard.findMany({ where: { userId: partnerId, quantity: { gt: 1 } }, select: { cardId: true }, distinct: ["cardId"] }),
      prisma.cardWishlistItem.findMany({ where: { userId: partnerId }, select: { cardId: true } }),
    ]);

    const result = await computeTradeMatch(
      { userId, doubles: myDoubles.map(d => d.cardId), wishlist: myWishlist.map(w => w.cardId) },
      { userId: partnerId, doubles: partnerDoubles.map(d => d.cardId), wishlist: partnerWishlist.map(w => w.cardId) },
    );

    await prisma.tradeMatch.upsert({
      where: { userAId_userBId: { userAId: userId, userBId: partnerId } },
      create: {
        userAId: userId, userBId: partnerId,
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

    if (result.isViable) matchesFound++;
  }

  const nextRecomputeAt = new Date(Date.now() + RATE_LIMIT_MS).toISOString();
  return NextResponse.json({ matchesFound, totalChecked, nextRecomputeAt });
}
