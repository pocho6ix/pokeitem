import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q     = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "6", 10), 30);
  const owned = searchParams.get("owned") === "true";

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // ── Owned-only mode: search only cards in the user's collection ──────
  if (owned) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ results: [] });
    const userId = (session.user as { id: string }).id;

    const userCards = await prisma.userCard.findMany({
      where: {
        userId,
        card: {
          OR: [
            { name:   { contains: q, mode: "insensitive" } },
            { number: { contains: q, mode: "insensitive" } },
          ],
        },
      },
      select: {
        cardId: true,
        card: {
          select: {
            id:       true,
            name:     true,
            number:   true,
            imageUrl: true,
            rarity:   true,
            price:    true,
            priceFr:  true,
            serie: { select: { name: true, slug: true } },
          },
        },
      },
      take: 200,
    });

    // Group by cardId and count quantity
    const grouped = new Map<string, { card: typeof userCards[0]["card"]; qty: number }>();
    for (const uc of userCards) {
      const existing = grouped.get(uc.cardId);
      if (existing) {
        existing.qty += 1;
      } else {
        grouped.set(uc.cardId, { card: uc.card, qty: 1 });
      }
    }

    const sorted = [...grouped.values()].sort((a, b) => {
      const aHasImg = a.card.imageUrl ? 1 : 0;
      const bHasImg = b.card.imageUrl ? 1 : 0;
      if (aHasImg !== bHasImg) return bHasImg - aHasImg;
      const aPrice = a.card.priceFr ?? a.card.price ?? 0;
      const bPrice = b.card.priceFr ?? b.card.price ?? 0;
      return bPrice - aPrice;
    });

    const results = sorted.slice(0, limit).map(({ card, qty }) => ({
      ...card,
      qty,
    }));

    return NextResponse.json({ results });
  }

  // ── Default mode: search all cards ───────────────────────────────────
  const raw = await prisma.card.findMany({
    where: {
      OR: [
        { name:   { contains: q, mode: "insensitive" } },
        { number: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id:       true,
      name:     true,
      number:   true,
      imageUrl: true,
      rarity:   true,
      price:    true,
      priceFr:  true,
      serie: { select: { name: true, slug: true } },
    },
    orderBy: [
      { priceFr: { sort: "desc", nulls: "last" } },
      { price:   { sort: "desc", nulls: "last" } },
    ],
    take: 100,
  });

  const sorted = [...raw].sort((a, b) => {
    const aHasImg = a.imageUrl ? 1 : 0;
    const bHasImg = b.imageUrl ? 1 : 0;
    if (aHasImg !== bHasImg) return bHasImg - aHasImg;
    const aPrice = a.priceFr ?? a.price ?? 0;
    const bPrice = b.priceFr ?? b.price ?? 0;
    return bPrice - aPrice;
  });

  return NextResponse.json({ results: sorted.slice(0, limit) });
}
