import { NextRequest, NextResponse } from "next/server";
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

    const items = await prisma.userItem.findMany({
      where: { userId },
      include: {
        item: { include: { serie: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching collection:", error);
    return NextResponse.json(
      { error: "Failed to fetch collection" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await request.json();

    const {
      itemId,
      quantity,
      purchasePrice,
      purchaseDate,
      condition,
      notes,
      forSale,
      forTrade,
      askingPrice,
    } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId is required" },
        { status: 400 }
      );
    }

    if (quantity !== undefined && (typeof quantity !== "number" || quantity < 1)) {
      return NextResponse.json(
        { error: "quantity must be a positive number" },
        { status: 400 }
      );
    }

    const itemExists = await prisma.item.findUnique({ where: { id: itemId } });
    if (!itemExists) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    const userItem = await prisma.userItem.create({
      data: {
        userId,
        itemId,
        quantity: quantity ?? 1,
        purchasePrice: purchasePrice ?? null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        condition: condition ?? "SEALED",
        notes: notes ?? null,
        forSale: forSale ?? false,
        forTrade: forTrade ?? false,
        askingPrice: askingPrice ?? null,
      },
      include: {
        item: { include: { serie: true } },
      },
    });

    return NextResponse.json(userItem, { status: 201 });
  } catch (error) {
    console.error("Error adding to collection:", error);
    return NextResponse.json(
      { error: "Failed to add item to collection" },
      { status: 500 }
    );
  }
}
