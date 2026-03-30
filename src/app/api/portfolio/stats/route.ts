import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    // ── Sealed items (portfolio) ────────────────────────────────────────────
    const portfolioItems = await prisma.portfolioItem.findMany({
      where: { userId },
      include: { item: true },
    });

    const totalItems = portfolioItems.reduce((sum, pi) => sum + pi.quantity, 0);

    const itemsValue = portfolioItems.reduce(
      (sum, pi) => sum + (pi.item.currentPrice ?? 0) * pi.quantity,
      0
    );

    const totalInvested = portfolioItems.reduce(
      (sum, pi) => sum + (pi.purchasePrice ?? 0) * pi.quantity,
      0
    );

    // ── Cards (collection) — market value only, purchase cost TBD ──────────
    const userCards = await prisma.userCard.findMany({
      where: { userId },
      select: { quantity: true, card: { select: { price: true } } },
    });

    const cardsValue = userCards.reduce(
      (sum, uc) => sum + (uc.card.price ?? 0) * uc.quantity,
      0
    );

    const totalValue = itemsValue + cardsValue;

    const profitLoss = totalValue - totalInvested;
    const profitLossPercent =
      totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    // Distribution by type
    const distributionMap = new Map<string, { count: number; value: number }>();
    for (const pi of portfolioItems) {
      const type = pi.item.type;
      const existing = distributionMap.get(type) ?? { count: 0, value: 0 };
      existing.count += pi.quantity;
      existing.value += (pi.item.currentPrice ?? 0) * pi.quantity;
      distributionMap.set(type, existing);
    }
    const distributionByType = Array.from(distributionMap.entries()).map(
      ([type, data]) => ({ type, ...data })
    );

    // Top performers by ROI
    const topPerformers = portfolioItems
      .filter((pi) => pi.purchasePrice && pi.purchasePrice > 0 && pi.item.currentPrice)
      .map((pi) => ({
        id: pi.id,
        itemId: pi.item.id,
        name: pi.item.name,
        type: pi.item.type,
        purchasePrice: pi.purchasePrice!,
        currentPrice: pi.item.currentPrice!,
        roi:
          ((pi.item.currentPrice! - pi.purchasePrice!) / pi.purchasePrice!) *
          100,
      }))
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 10);

    return NextResponse.json({
      totalItems,
      totalValue: Math.round(totalValue * 100) / 100,
      totalInvested: Math.round(totalInvested * 100) / 100,
      profitLoss: Math.round(profitLoss * 100) / 100,
      profitLossPercent: Math.round(profitLossPercent * 100) / 100,
      distributionByType,
      topPerformers,
    });
  } catch (error) {
    console.error("Error fetching portfolio stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio stats" },
      { status: 500 }
    );
  }
}
