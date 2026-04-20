import { prisma } from "./prisma";
import { awardReferralPoints } from "./points";

export async function getReferralLink(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, referralCode: true },
  });
  const code = user?.username ?? user?.referralCode ?? "";
  const base = process.env.NEXTAUTH_URL ?? "https://app.pokeitem.fr";
  return `${base}/inscription?ref=${encodeURIComponent(code)}`;
}

export async function validateReferralCode(code: string) {
  return prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true, name: true, plan: true },
  });
}

export async function getReferralStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      referralCode: true,
      username: true,
      referrals: {
        select: { id: true, emailVerified: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user) return null;

  const validatedCount = user.referrals.filter((r) => r.emailVerified != null).length;
  const pendingCount = user.referrals.filter((r) => r.emailVerified == null).length;

  return {
    referralCode: user.referralCode,
    referralLink: await getReferralLink(userId),
    validatedCount,
    pendingCount,
  };
}

/**
 * Called when a referral is applied and the referee's email is already verified.
 * Idempotent: awardReferralPoints checks against existing PointEvents.
 */
export async function onReferralEmailVerified(refereeId: string) {
  const referee = await prisma.user.findUnique({
    where: { id: refereeId },
    select: { referredById: true, emailVerified: true },
  });

  if (!referee?.referredById || !referee.emailVerified) return;

  const referrer = await prisma.user.findUnique({
    where: { id: referee.referredById },
    select: { id: true },
  });
  if (!referrer) return;

  await awardReferralPoints(referee.referredById, refereeId).catch((err) => {
    console.error("[referral] awardReferralPoints failed:", err);
  });
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  image: string | null;
  referralCount: number;
  isCurrentUser: boolean;
}

export async function getLeaderboard(currentUserId: string) {
  const usersWithStats = await prisma.user.findMany({
    where: {
      referrals: { some: { emailVerified: { not: null } } },
    },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      referrals: {
        where: { emailVerified: { not: null } },
        select: { emailVerified: true },
        orderBy: { emailVerified: "desc" },
        take: 1,
      },
      _count: {
        select: {
          referrals: { where: { emailVerified: { not: null } } },
        },
      },
    },
  });

  const sorted = usersWithStats.sort((a, b) => {
    const diff = b._count.referrals - a._count.referrals;
    if (diff !== 0) return diff;
    const aDate = a.referrals[0]?.emailVerified?.getTime() ?? 0;
    const bDate = b.referrals[0]?.emailVerified?.getTime() ?? 0;
    return bDate - aDate;
  });

  const rankings: LeaderboardEntry[] = sorted.map((u, i) => ({
    rank: i + 1,
    userId: u.id,
    username: u.name ?? u.username ?? "Utilisateur",
    image: u.image ?? null,
    referralCount: u._count.referrals,
    isCurrentUser: u.id === currentUserId,
  }));

  const top10 = rankings.slice(0, 10);
  const currentUserRank = rankings.find((r) => r.userId === currentUserId) ?? null;

  return {
    rankings: top10,
    currentUser: currentUserRank,
    totalParticipants: rankings.length,
  };
}
