import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "1M";

    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case "7J":
        startDate.setDate(now.getDate() - 7);
        break;
      case "1M":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "3M":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "6M":
        startDate.setMonth(now.getMonth() - 6);
        break;
      case "1A":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case "MAX":
        startDate.setFullYear(2020);
        break;
    }

    const portfolioItems = await prisma.portfolioItem.findMany({
      where: { userId },
      include: {
        item: {
          include: {
            prices: {
              where: { date: { gte: startDate } },
              orderBy: { date: "asc" },
            },
          },
        },
      },
    });

    // Generate daily data points
    const data: Array<{ date: string; value: number; invested: number }> = [];
    const currentDate = new Date(startDate);

    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split("T")[0];
      let totalValue = 0;
      let totalInvested = 0;

      for (const pi of portfolioItems) {
        const purchaseDate = pi.purchaseDate ?? pi.createdAt;
        if (purchaseDate <= currentDate) {
          totalInvested += pi.purchasePrice ?? 0;

          // Find closest price for this date
          const priceAtDate = pi.item.prices
            .filter((ph) => new Date(ph.date) <= currentDate)
            .sort(
              (a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            )[0];

          const price =
            priceAtDate?.price ??
            pi.item.currentPrice ??
            pi.item.priceTrend ??
            0;
          totalValue += price * pi.quantity;
        }
      }

      data.push({
        date: dateStr,
        value: Math.round(totalValue * 100) / 100,
        invested: Math.round(totalInvested * 100) / 100,
      });

      if (period === "7J") {
        currentDate.setHours(currentDate.getHours() + 6);
      } else {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données" },
      { status: 500 }
    );
  }
}
