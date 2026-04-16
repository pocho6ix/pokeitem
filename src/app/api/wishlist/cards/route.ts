import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProUser } from "@/lib/requirePro";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  if (!(await isProUser(userId))) {
    return NextResponse.json({ error: "PRO_REQUIRED" }, { status: 403 });
  }

  const items = await prisma.cardWishlistItem.findMany({
    where: { userId },
    orderBy: { addedAt: "desc" },
    include: {
      card: {
        select: {
          id: true,
          number: true,
          name: true,
          rarity: true,
          imageUrl: true,
          price: true,
          priceFr: true,
          priceReverse: true,
          types: true,
          category: true,
          trainerType: true,
          energyType: true,
          serie: {
            select: {
              id: true,
              slug: true,
              name: true,
              abbreviation: true,
              bloc: { select: { slug: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  if (!(await isProUser(userId))) {
    return NextResponse.json({ error: "PRO_REQUIRED" }, { status: 403 });
  }

  let body: { cardId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { cardId } = body;
  if (!cardId || typeof cardId !== "string") {
    return NextResponse.json({ error: "cardId is required" }, { status: 400 });
  }

  // Validate card exists and get setId
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { id: true, serieId: true },
  });
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  // Upsert — idempotent
  const item = await prisma.cardWishlistItem.upsert({
    where: { userId_cardId: { userId, cardId } },
    create: { userId, cardId, setId: card.serieId },
    update: {},
  });

  return NextResponse.json({ item });
}
