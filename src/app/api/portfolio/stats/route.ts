import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPriceForVersion } from "@/lib/display-price";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const rarity = new URL(req.url).searchParams.get("rarity") ?? null;

    // ── Sealed items (portfolio) — excluded when rarity filter is active ───
    const portfolioItems = rarity ? [] : await prisma.portfolioItem.findMany({
      where: { userId },
      select: {
        id: true,
        quantity: true,
        purchasePrice: true,
        item: {
          select: {
            id: true,
            name: true,
            type: true,
            currentPrice: true,
          },
        },
      },
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

    // ── Cards (collection) ─────────────────────────────────────────────────
    const userCards = await prisma.userCard.findMany({
      where: {
        userId,
        ...(rarity ? { card: { rarity: rarity as never } } : {}),
      },
      select: { quantity: true, version: true, purchasePrice: true, card: { select: { price: true, priceFr: true, priceReverse: true } } },
    });

    const cardsValue = userCards.reduce((sum, uc) => {
      return sum + getPriceForVersion(uc.card, uc.version) * uc.quantity
    }, 0);

    const cardsInvested = userCards.reduce(
      (sum, uc) => sum + (uc.purchasePrice ?? 0) * uc.quantity,
      0
    );

    const totalValue = itemsValue + cardsValue;
    const totalInvestedAll = totalInvested + cardsInvested;

    const profitLoss = totalValue - totalInvestedAll;
    const profitLossPercent =
      totalInvestedAll > 0 ? (profitLoss / totalInvestedAll) * 100 : 0;

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
      totalInvested: Math.round(totalInvestedAll * 100) / 100,
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
