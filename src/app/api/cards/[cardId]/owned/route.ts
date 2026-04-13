import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ owned: false, count: 0 });

  const { cardId } = await params;
  const userId = (session.user as { id: string }).id;

  const count = await prisma.userCard.count({ where: { userId, cardId } });

  return NextResponse.json({ owned: count > 0, count });
}
