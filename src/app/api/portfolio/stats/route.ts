import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPriceForVersion } from "@/lib/display-price";
import { resolveItemPrice } from "@/lib/portfolio/resolveItemPrice";

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
        currentPrice: true,
        item: {
          select: {
            id: true,
            name: true,
            type: true,
            retailPrice: true,
            priceFrom: true,
          },
        },
      },
    });

    // Resolve each row's unit price once — uses the owner's personal valuation
    // falling back to retailPrice.
    const resolvedUnitPrice = portfolioItems.map((pi) =>
      resolveItemPrice(pi.currentPrice, pi.item.retailPrice),
    );

    const totalItems = portfolioItems.reduce((sum, pi) => sum + pi.quantity, 0);

    const itemsValue = portfolioItems.reduce(
      (sum, pi, i) => sum + resolvedUnitPrice[i] * pi.quantity,
      0
    );

    // FR market value — sum of `priceFrom × quantity` for the user's holdings.
    // Only counts items that actually have a CM listing; items still
    // unmatched (priceFrom == null) contribute 0 here, which is the right
    // semantic for "what would I get on Cardmarket today".
    const itemsMarketValue = portfolioItems.reduce(
      (sum, pi) => sum + (pi.item.priceFrom ?? 0) * pi.quantity,
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

    // Card counts
    const cardCount = userCards.reduce((sum, uc) => sum + uc.quantity, 0);
    const doublesCount = userCards.filter((uc) => uc.quantity > 1).length;

    // Wishlist count
    const wishlistCount = await prisma.cardWishlistItem.count({ where: { userId } });

    // Value of extra copies (doubles = quantity - 1 for each card with qty > 1)
    const doublesValue = userCards
      .filter((uc) => uc.quantity > 1)
      .reduce((sum, uc) => sum + getPriceForVersion(uc.card, uc.version) * (uc.quantity - 1), 0);

    // First activity date — earliest of (first userCard, first portfolioItem).
    // Consumers (ClasseurView, CollectionHeroCard) use this to pick the
    // default evolution-chart timeframe: a brand new account defaults to
    // "7J", while a year-old account defaults to "MAX". Two cheap queries
    // (both indexed on userId), ran in parallel.
    const [firstCard, firstItem] = await Promise.all([
      prisma.userCard.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      prisma.portfolioItem.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
    ]);
    const firstActivityDate =
      [firstCard?.createdAt, firstItem?.createdAt]
        .filter((d): d is Date => d instanceof Date)
        .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

    const totalValue = itemsValue + cardsValue;
    const totalInvestedAll = totalInvested + cardsInvested;

    const profitLoss = totalValue - totalInvestedAll;
    const profitLossPercent =
      totalInvestedAll > 0 ? (profitLoss / totalInvestedAll) * 100 : 0;

    // Distribution by type
    const distributionMap = new Map<string, { count: number; value: number }>();
    portfolioItems.forEach((pi, i) => {
      const type = pi.item.type;
      const existing = distributionMap.get(type) ?? { count: 0, value: 0 };
      existing.count += pi.quantity;
      existing.value += resolvedUnitPrice[i] * pi.quantity;
      distributionMap.set(type, existing);
    });
    const distributionByType = Array.from(distributionMap.entries()).map(
      ([type, data]) => ({ type, ...data })
    );

    // Top performers by ROI — only include rows that have both a purchase
    // price and a non-zero current price (either user-set or retail fallback).
    const topPerformers = portfolioItems
      .map((pi, i) => ({ pi, unitPrice: resolvedUnitPrice[i] }))
      .filter(({ pi, unitPrice }) => pi.purchasePrice && pi.purchasePrice > 0 && unitPrice > 0)
      .map(({ pi, unitPrice }) => ({
        id: pi.id,
        itemId: pi.item.id,
        name: pi.item.name,
        type: pi.item.type,
        purchasePrice: pi.purchasePrice!,
        currentPrice: unitPrice,
        roi:
          ((unitPrice - pi.purchasePrice!) / pi.purchasePrice!) *
          100,
      }))
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 10);

    return NextResponse.json({
      totalItems,
      totalValue: Math.round(totalValue * 100) / 100,
      itemsValue: Math.round(itemsValue * 100) / 100,
      itemsMarketValue: Math.round(itemsMarketValue * 100) / 100,
      totalInvested: Math.round(totalInvestedAll * 100) / 100,
      profitLoss: Math.round(profitLoss * 100) / 100,
      profitLossPercent: Math.round(profitLossPercent * 100) / 100,
      distributionByType,
      topPerformers,
      cardCount,
      doublesCount,
      cardValue: Math.round(cardsValue * 100) / 100,
      doublesValue: Math.round(doublesValue * 100) / 100,
      wishlistCount,
      firstActivityDate: firstActivityDate ? firstActivityDate.toISOString() : null,
    });
  } catch (error) {
    console.error("Error fetching portfolio stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio stats" },
      { status: 500 }
    );
  }
}
