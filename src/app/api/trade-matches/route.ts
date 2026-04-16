import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MIN_BALANCE = 0.7;
const MIN_VALUE_CENTS = 200;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  // Find all viable matches for this user (both A and B sides)
  const matches = await prisma.tradeMatch.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
      balanceScore: { gte: MIN_BALANCE },
      aValueCents: { gte: MIN_VALUE_CENTS },
      bValueCents: { gte: MIN_VALUE_CENTS },
    },
    include: {
      userA: { select: { id: true, name: true, image: true, classeurShare: { select: { slug: true, isActive: true } } } },
      userB: { select: { id: true, name: true, image: true, classeurShare: { select: { slug: true, isActive: true } } } },
    },
    orderBy: { balanceScore: "desc" },
    take: limit,
    skip: offset,
  });

  const formatted = matches.map((m) => {
    const isA = m.userAId === userId;
    const partner = isA ? m.userB : m.userA;
    return {
      id: m.id,
      partner: {
        id: partner.id,
        displayName: partner.name ?? "Dresseur",
        avatarUrl: partner.image,
        slug: partner.classeurShare?.isActive ? partner.classeurShare.slug : null,
      },
      youGiveCount: isA ? m.aGivesCardIds.length : m.bGivesCardIds.length,
      youReceiveCount: isA ? m.bGivesCardIds.length : m.aGivesCardIds.length,
      youGiveValueCents: isA ? m.aValueCents : m.bValueCents,
      youReceiveValueCents: isA ? m.bValueCents : m.aValueCents,
      balanceScore: m.balanceScore,
      computedAt: m.computedAt.toISOString(),
    };
  });

  return NextResponse.json({ matches: formatted, total: formatted.length });
}
