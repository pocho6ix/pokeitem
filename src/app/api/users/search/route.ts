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
const RATE_LIMIT_MAX    = 30;
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
 * Each result carries:
 *   - cardsCount     — total UserCard rows (size of their collection)
 *   - matchsCount    — |my wishlist ∩ their doubles|
 *                      A "double" is any card they hold with quantity > 1
 *                      OR any UserCardDouble row. This is the count that
 *                      actually tells me whether opening the profile is
 *                      worth it — it's how many of my wants they can spare.
 *
 * Results are sorted by `matchsCount DESC, displayName ASC` so profiles with
 * real overlap surface first. Zero-match profiles are still returned (the UI
 * greys them out).
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
      slug:         true,
      shareDoubles: true,
      user: { select: { id: true, name: true, image: true } },
    },
  });

  if (shares.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const userIds = shares.map((s) => s.user.id);

  // Batch reads in parallel. Order of magnitude: one grouped query each
  // (no N+1), plus a single pull of my wishlist card IDs to drive the
  // intersection in memory.
  const [cardRows, doubleImplicitRows, doubleExplicitRows, myWishlist] = await Promise.all([
    prisma.userCard.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _count: { _all: true },
    }),
    // Implicit doubles = UserCard rows with quantity > 1. Pulled as raw
    // (userId, cardId) tuples so we can intersect with my wishlist.
    prisma.userCard.findMany({
      where:  { userId: { in: userIds }, quantity: { gt: 1 } },
      select: { userId: true, cardId: true },
    }),
    // Explicit UserCardDouble rows — same deal.
    prisma.userCardDouble.findMany({
      where:  { userId: { in: userIds } },
      select: { userId: true, cardId: true },
    }),
    prisma.cardWishlistItem.findMany({
      where:  { userId: callerId },
      select: { cardId: true },
    }),
  ]);

  const myWishSet = new Set(myWishlist.map((w) => w.cardId));
  const cardsBy   = new Map(cardRows.map((r) => [r.userId, r._count._all]));

  // Build per-user double-cardId sets (union of implicit + explicit).
  const doublesByUser = new Map<string, Set<string>>();
  for (const r of doubleImplicitRows) {
    let set = doublesByUser.get(r.userId);
    if (!set) { set = new Set(); doublesByUser.set(r.userId, set); }
    set.add(r.cardId);
  }
  for (const r of doubleExplicitRows) {
    let set = doublesByUser.get(r.userId);
    if (!set) { set = new Set(); doublesByUser.set(r.userId, set); }
    set.add(r.cardId);
  }

  // For each candidate, compute |myWishlist ∩ theirDoubles|.
  function matchsFor(userId: string): number {
    const theirDoubles = doublesByUser.get(userId);
    if (!theirDoubles || myWishSet.size === 0) return 0;
    let n = 0;
    // Iterate over the smaller set for cheaper intersection.
    const [small, big] = theirDoubles.size < myWishSet.size
      ? [theirDoubles, myWishSet]
      : [myWishSet, theirDoubles];
    for (const id of small) if (big.has(id)) n++;
    return n;
  }

  const results = shares
    .map((s) => ({
      slug:          s.slug,
      displayName:   s.user.name ?? "Dresseur",
      avatarUrl:     s.user.image,
      cardsCount:    cardsBy.get(s.user.id) ?? 0,
      // If the owner hid their doubles entirely, we can't compute a real
      // match count — degrade to 0 rather than leaking information.
      matchsCount:   s.shareDoubles ? matchsFor(s.user.id) : 0,
    }))
    // Show the most actionable profiles first; break ties alphabetically.
    .sort((a, b) => {
      if (b.matchsCount !== a.matchsCount) return b.matchsCount - a.matchsCount;
      return a.displayName.localeCompare(b.displayName);
    });

  return NextResponse.json({ results });
}
