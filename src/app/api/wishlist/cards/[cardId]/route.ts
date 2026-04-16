import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProUser } from "@/lib/requirePro";

export async function DELETE(
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

  // Idempotent — no error if not found
  await prisma.cardWishlistItem.deleteMany({
    where: { userId, cardId },
  });

  return NextResponse.json({ ok: true });
}
