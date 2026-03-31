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
    const period     = searchParams.get("period") || "1M";
    const serieSlug  = searchParams.get("serie") || null; // optional filter

    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case "7J": startDate.setDate(now.getDate() - 7);          break;
      case "1M": startDate.setMonth(now.getMonth() - 1);        break;
      case "3M": startDate.setMonth(now.getMonth() - 3);        break;
      case "6M": startDate.setMonth(now.getMonth() - 6);        break;
      case "1A": startDate.setFullYear(now.getFullYear() - 1);  break;
      case "MAX": startDate.setFullYear(2020);                   break;
    }

    // ── Sealed items (PortfolioItem) ─────────────────────────────────────────
    const portfolioItems = await prisma.portfolioItem.findMany({
      where: {
        userId,
        ...(serieSlug
          ? { item: { serie: { slug: serieSlug } } }
          : {}),
      },
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

    // ── Cards (UserCard) — current prices treated as constant baseline ───────
    // Cards have no price history, so we use their current price as a flat
    // contribution added to every data point once the card was acquired.
    const userCards = await prisma.userCard.findMany({
      where: {
        userId,
        ...(serieSlug
          ? { card: { serie: { slug: serieSlug } } }
          : {}),
      },
      select: {
        quantity:  true,
        version:   true,
        createdAt: true,
        card: { select: { price: true, priceReverse: true } },
      },
    });

    // Build card contributions: { addedAt, valuePerUnit }
    const cardContribs = userCards.map((uc) => ({
      addedAt: uc.createdAt,
      value:
        (uc.version === "REVERSE"
          ? (uc.card.priceReverse ?? uc.card.price ?? 0)
          : (uc.card.price ?? 0)) * uc.quantity,
    }));

    // ── Generate daily data points ───────────────────────────────────────────
    const data: Array<{ date: string; value: number; invested: number }> = [];
    const currentDate = new Date(startDate);

    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split("T")[0];
      let totalValue    = 0;
      let totalInvested = 0;

      // Sealed items
      for (const pi of portfolioItems) {
        const purchaseDate = pi.purchaseDate ?? pi.createdAt;
        if (purchaseDate <= currentDate) {
          totalInvested += pi.purchasePrice ?? 0;

          const priceAtDate = pi.item.prices
            .filter((ph) => new Date(ph.date) <= currentDate)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

          const price =
            priceAtDate?.price ?? pi.item.currentPrice ?? pi.item.priceTrend ?? 0;
          totalValue += price * pi.quantity;
        }
      }

      // Cards (no historical prices — add current value if card was acquired by this date)
      for (const cc of cardContribs) {
        if (cc.addedAt <= currentDate) {
          totalValue += cc.value;
        }
      }

      data.push({
        date:     dateStr,
        value:    Math.round(totalValue    * 100) / 100,
        invested: Math.round(totalInvested * 100) / 100,
      });

      if (period === "7J") {
        currentDate.setHours(currentDate.getHours() + 6);
      } else {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // ── Available series for the filter dropdown ─────────────────────────────
    // Return only series that the user actually has cards or items in.
    const seriesWithCards = await prisma.serie.findMany({
      where: {
        OR: [
          { cards: { some: { userCards: { some: { userId } } } } },
          { items: { some: { portfolioItems: { some: { userId } } } } },
        ],
      },
      select: { slug: true, name: true, abbreviation: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data, series: seriesWithCards });
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données" },
      { status: 500 }
    );
  }
}
