import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  let body: { cardIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { cardIds } = body;
  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    return NextResponse.json({ error: "cardIds must be a non-empty array" }, { status: 400 });
  }

  const limited = cardIds.slice(0, 500);

  const cards = await prisma.card.findMany({
    where: { id: { in: limited } },
    select: { id: true, serieId: true },
  });

  if (cards.length === 0) {
    return NextResponse.json({ added: 0 });
  }

  const result = await prisma.cardWishlistItem.createMany({
    data: cards.map((c) => ({
      userId,
      cardId: c.id,
      setId: c.serieId,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({ added: result.count });
}
