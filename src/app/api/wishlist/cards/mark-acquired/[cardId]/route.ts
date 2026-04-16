import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProUser } from "@/lib/requirePro";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  if (!(await isProUser(userId))) {
    return NextResponse.json({ error: "PRO_REQUIRED" }, { status: 403 });
  }
  const { cardId } = await params;

  await prisma.$transaction([
    // Remove from wishlist
    prisma.cardWishlistItem.deleteMany({ where: { userId, cardId } }),
    // Upsert to user_cards
    prisma.userCard.upsert({
      where: { userId_cardId_version: { userId, cardId, version: "NORMAL" } },
      create: {
        userId,
        cardId,
        quantity: 1,
        condition: "NEAR_MINT",
        language: "FR",
        version: "NORMAL",
        purchasePrice: null,
      },
      update: {
        quantity: { increment: 1 },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
