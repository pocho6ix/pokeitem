import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true, betaTrialActivatedAt: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Already used beta trial (even if expired)
  if (user.betaTrialActivatedAt) {
    return NextResponse.json({ error: "already_used" }, { status: 409 });
  }

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      betaTrialActivatedAt: now,
      plan: "PRO",
      planExpiresAt: trialEnd,
      trialEndsAt: trialEnd,
    },
  });

  return NextResponse.json({ success: true, trialEndsAt: trialEnd });
}
