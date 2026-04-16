import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { cardId } = await params;

  await prisma.$transaction([
    prisma.cardWishlistItem.deleteMany({ where: { userId, cardId } }),
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
