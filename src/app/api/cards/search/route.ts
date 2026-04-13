import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q     = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "6", 10), 30);

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Fetch more than needed so we can re-sort with image priority
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
    take: 100, // over-fetch then re-sort
  });

  // Cards with an image first, then by price desc, no-image last
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
