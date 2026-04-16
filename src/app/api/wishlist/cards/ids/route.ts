import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ ids: [] });
  }
  const userId = (session.user as { id: string }).id;

  const items = await prisma.cardWishlistItem.findMany({
    where: { userId },
    select: { cardId: true },
  });

  return NextResponse.json({ ids: items.map((i) => i.cardId) });
}
