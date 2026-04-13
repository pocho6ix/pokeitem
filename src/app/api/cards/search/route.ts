import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q     = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "6", 10), 30);

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const cards = await prisma.card.findMany({
    where: {
      OR: [
        { name:   { contains: q, mode: "insensitive" } },
        { number: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id:        true,
      name:      true,
      number:    true,
      imageUrl:  true,
      rarity:    true,
      price:     true,
      priceFr:   true,
      serie: {
        select: { name: true, slug: true },
      },
    },
    orderBy: [
      { priceFr: "desc" },
      { price:   "desc" },
    ],
    take: limit,
  });

  return NextResponse.json({ results: cards });
}
