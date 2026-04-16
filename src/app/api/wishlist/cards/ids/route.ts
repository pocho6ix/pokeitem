import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProUser } from "@/lib/requirePro";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ ids: [] });
  }
  const userId = (session.user as { id: string }).id;

  // FREE users: retourner tableau vide — pas d'erreur, le cœur reste visible
  if (!(await isProUser(userId))) {
    return NextResponse.json({ ids: [] });
  }

  const items = await prisma.cardWishlistItem.findMany({
    where: { userId },
    select: { cardId: true },
  });

  return NextResponse.json({ ids: items.map((i) => i.cardId) });
}
