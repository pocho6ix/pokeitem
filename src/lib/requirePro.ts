import { prisma } from "@/lib/prisma";
import { Plan } from "@prisma/client";

/**
 * Returns true if the user has an active PRO plan or trial.
 * Pass the userId (already auth-checked before calling this).
 */
export async function isProUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true, trialEndsAt: true },
  });
  if (!user) return false;
  const isTrialing = !!(user.trialEndsAt && user.trialEndsAt > new Date());
  return (
    isTrialing ||
    (user.plan === Plan.PRO &&
      (!user.planExpiresAt || user.planExpiresAt > new Date()))
  );
}
