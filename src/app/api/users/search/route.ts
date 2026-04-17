import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MIN_QUERY_LEN = 2;
const MAX_LIMIT     = 20;
const DEFAULT_LIMIT = 10;

// Simple in-process rate limit — 30 req/min per user. Acceptable at the app's
// current scale; swap for a Redis token bucket if horizontal scaling becomes
// relevant. Protects against trivial pseudo scraping.
const RATE_LIMIT_MAX   = 30;
const RATE_LIMIT_WIN_MS = 60_000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimitHit(userId: string): boolean {
  const now = Date.now();
  const entry = rateBuckets.get(userId);
  if (!entry || entry.resetAt < now) {
    rateBuckets.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WIN_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

/**
 * GET /api/users/search?q=<text>&limit=<n>
 *
 * Searches active ClasseurShare owners by displayName (User.name). Case-
 * insensitive substring match (ILIKE). The caller is always excluded from
 * results — no way to stumble into your own profile this way.
 *
 * Response shape is designed for the /echanges search UI — just enough to
 * render a clickable result card (avatar, name, cards/doubles/wishlist
 * counts). The detail view is handled by /u/:slug and the calculator endpoint.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const callerId = (session.user as { id: string }).id;

  if (rateLimitHit(callerId)) {
    return NextResponse.json({ error: "Trop de requêtes, réessaye dans une minute" }, { status: 429 });
  }

  const url   = new URL(req.url);
  const q     = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT)));

  if (q.length < MIN_QUERY_LEN) {
    return NextResponse.json(
      { error: `Minimum ${MIN_QUERY_LEN} caractères`, results: [] },
      { status: 400 },
    );
  }

  // Find active shares whose owner's name matches (case-insensitive).
  const shares = await prisma.classeurShare.findMany({
    where: {
      isActive: true,
      user: {
        AND: [
          { id: { not: callerId } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
    },
    orderBy: { user: { name: "asc" } },
    take:    limit,
    select: {
      slug: true,
      user: { select: { id: true, name: true, image: true } },
    },
  });

  if (shares.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // Batch-fetch counts per user — one query each but grouped, no N+1.
  const userIds = shares.map((s) => s.user.id);
  const [cardRows, doubleRows, wishlistRows] = await Promise.all([
    prisma.userCard.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _count: { _all: true },
    }),
    prisma.userCard.groupBy({
      by:    ["userId"],
      where: { userId: { in: userIds }, quantity: { gt: 1 } },
      _count: { _all: true },
    }),
    prisma.cardWishlistItem.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _count: { _all: true },
    }),
  ]);

  const cardsBy    = new Map(cardRows.map((r) => [r.userId, r._count._all]));
  const doublesBy  = new Map(doubleRows.map((r) => [r.userId, r._count._all]));
  const wishlistBy = new Map(wishlistRows.map((r) => [r.userId, r._count._all]));

  return NextResponse.json({
    results: shares.map((s) => ({
      slug:          s.slug,
      displayName:   s.user.name ?? "Dresseur",
      avatarUrl:     s.user.image,
      cardsCount:    cardsBy.get(s.user.id) ?? 0,
      doublesCount:  doublesBy.get(s.user.id) ?? 0,
      wishlistCount: wishlistBy.get(s.user.id) ?? 0,
    })),
  });
}
