import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { itemId, price, date, note } = await request.json();

    if (!itemId || price === undefined || price < 0) {
      return NextResponse.json(
        { error: "itemId et price sont requis" },
        { status: 400 }
      );
    }

    const valuation = await prisma.manualValuation.create({
      data: {
        userId,
        itemId,
        price,
        date: date ? new Date(date) : new Date(),
        note: note || null,
      },
    });

    // Update item's current price
    await prisma.item.update({
      where: { id: itemId },
      data: {
        currentPrice: price,
        priceUpdatedAt: new Date(),
      },
    });

    // Also add to PriceHistory for chart data
    await prisma.priceHistory.create({
      data: {
        itemId,
        price,
        source: "manual",
        date: date ? new Date(date) : new Date(),
      },
    });

    return NextResponse.json(valuation, { status: 201 });
  } catch (error) {
    console.error("Error creating manual valuation:", error);
    return NextResponse.json(
      { error: "Erreur lors de la valorisation" },
      { status: 500 }
    );
  }
}
