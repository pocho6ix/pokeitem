import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const cards = await prisma.card.findMany({
    where: {
      name: { contains: q, mode: "insensitive" },
    },
    select: {
      id: true,
      name: true,
      number: true,
      imageUrl: true,
      price: true,
      rarity: true,
      serie: {
        select: {
          id: true,
          slug: true,
          name: true,
          bloc: { select: { slug: true } },
        },
      },
    },
    orderBy: [{ serie: { name: "asc" } }, { number: "asc" }],
    take: 20,
  });

  return NextResponse.json({ results: cards });
}
