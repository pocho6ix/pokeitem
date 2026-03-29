import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    const portfolioItems = await prisma.portfolioItem.findMany({
      where: { userId },
      include: {
        item: {
          include: {
            serie: { include: { bloc: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = portfolioItems.map((pi) => {
      const currentPrice = pi.item.currentPrice ?? pi.item.priceTrend ?? 0;
      const purchasePrice = pi.purchasePrice ?? 0;
      const currentValue = currentPrice * pi.quantity;
      const pnl = currentValue - purchasePrice;
      const pnlPercent = purchasePrice > 0 ? (pnl / purchasePrice) * 100 : 0;

      return {
        id: pi.id,
        item: pi.item,
        quantity: pi.quantity,
        purchasePrice,
        purchasePricePerUnit: pi.quantity > 0 ? purchasePrice / pi.quantity : 0,
        purchaseDate: pi.purchaseDate,
        condition: pi.condition,
        currentValue,
        currentValuePerUnit: currentPrice,
        pnl,
        pnlPercent,
        notes: pi.notes,
        createdAt: pi.createdAt,
      };
    });

    const totalInvested = items.reduce((sum, i) => sum + i.purchasePrice, 0);
    const totalCurrentValue = items.reduce((sum, i) => sum + i.currentValue, 0);
    const totalPnl = totalCurrentValue - totalInvested;
    const totalPnlPercent =
      totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    // Distribution by type
    const typeMap = new Map<string, number>();
    for (const i of items) {
      const type = i.item.type;
      typeMap.set(type, (typeMap.get(type) ?? 0) + i.currentValue);
    }
    const totalValue = items.reduce((s, i) => s + i.currentValue, 0);
    const distributionByType = Array.from(typeMap.entries()).map(
      ([type, value]) => ({
        name: type,
        value: totalValue > 0 ? Math.round((value / totalValue) * 100) : 0,
        type,
      })
    );

    // Top performers
    const topPerformers = items
      .filter((i) => i.purchasePrice > 0 && i.currentValuePerUnit > 0)
      .map((i) => ({
        name: i.item.name,
        purchasePrice: i.purchasePricePerUnit,
        currentPrice: i.currentValuePerUnit,
        pl: i.pnlPercent,
      }))
      .sort((a, b) => b.pl - a.pl)
      .slice(0, 5);

    const summary = {
      totalInvested: Math.round(totalInvested * 100) / 100,
      totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
      totalPnl: Math.round(totalPnl * 100) / 100,
      totalPnlPercent: Math.round(totalPnlPercent * 100) / 100,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      uniqueItemCount: items.length,
    };

    return NextResponse.json({
      items,
      summary,
      distributionByType,
      topPerformers,
    });
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const { itemId, quantity, purchasePrice, purchaseDate, notes } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId est requis" },
        { status: 400 }
      );
    }

    if (quantity !== undefined && (typeof quantity !== "number" || quantity < 1)) {
      return NextResponse.json(
        { error: "quantity doit être un nombre positif" },
        { status: 400 }
      );
    }

    const itemExists = await prisma.item.findUnique({ where: { id: itemId } });
    if (!itemExists) {
      return NextResponse.json({ error: "Item non trouvé" }, { status: 404 });
    }

    const portfolioItem = await prisma.portfolioItem.create({
      data: {
        userId,
        itemId,
        quantity: quantity ?? 1,
        purchasePrice: purchasePrice ?? 0,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        notes: notes ?? null,
      },
      include: {
        item: { include: { serie: { include: { bloc: true } } } },
      },
    });

    return NextResponse.json(portfolioItem, { status: 201 });
  } catch (error) {
    console.error("Error adding to portfolio:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'ajout au portfolio" },
      { status: 500 }
    );
  }
}
