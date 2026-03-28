import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const itemId = searchParams.get("itemId");
    const period = searchParams.get("period") || "30d";

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId is required" },
        { status: 400 }
      );
    }

    // Calculate date range
    let dateFrom: Date | null = null;
    const now = new Date();

    switch (period) {
      case "7d":
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "all":
        dateFrom = null;
        break;
      default:
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const where: { itemId: string; date?: { gte: Date } } = { itemId };
    if (dateFrom) {
      where.date = { gte: dateFrom };
    }

    const prices = await prisma.priceHistory.findMany({
      where,
      orderBy: { date: "asc" },
    });

    // Calculate price change
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { currentPrice: true },
    });

    const currentPrice = item?.currentPrice ?? null;
    let priceChange: number | null = null;

    if (prices.length >= 2 && currentPrice !== null) {
      const oldestPrice = prices[0].price;
      priceChange =
        oldestPrice > 0
          ? ((currentPrice - oldestPrice) / oldestPrice) * 100
          : null;
    }

    return NextResponse.json({
      prices,
      currentPrice,
      priceChange: priceChange !== null ? Math.round(priceChange * 100) / 100 : null,
    });
  } catch (error) {
    console.error("Error fetching price history:", error);
    return NextResponse.json(
      { error: "Failed to fetch price history" },
      { status: 500 }
    );
  }
}
