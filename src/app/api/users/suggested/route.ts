import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT    = 12;
const MAX_LIMIT        = 24;
const CACHE_TTL_MS     = 60 * 60 * 1000; // 1 hour — brief says "sufficient for MVP"
const RATE_LIMIT_MAX   = 10;
const RATE_LIMIT_WIN_MS = 60_000;

// ─── In-process cache & rate limiter ────────────────────────────────────────
// One Map keyed by "userId:limit" — small, no eviction needed at current scale.

interface CacheEntry {
  expiresAt: number;
  payload:   SuggestionPayload;
}
const cache       = new Map<string, CacheEntry>();
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface SuggestionRow {
  slug:        string;
  displayName: string;
  avatarUrl:   string | null;
  matchCount:  number;
}
interface SuggestionPayload {
  suggestions: SuggestionRow[];
}

// ─── Handler ─────────────────────────────────────────────────────────────────

/**
 * GET /api/users/suggested?limit=<n>
 *
 * Returns active public dresseurs whose collection overlaps the caller's
 * wishlist the most, sorted by overlap size descending. Zero-overlap users
 * are filtered out entirely. Cached 1 h per (userId, limit) pair.
 *
 * Logic mirrors the search endpoint's "matchs count" rule:
 *   matchCount(u) = | my wishlist ∩ (u.cards ∪ u.doubles) |
 * Visibility gates: shareCards/shareDoubles on the target's ClasseurShare
 * naturally zero-out the contributing source.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const meId = (session.user as { id: string }).id;

  if (rateLimitHit(meId)) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const url   = new URL(req.url);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT)));
  const cacheKey = `${meId}:${limit}`;

  // Cache hit
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload, { headers: { "X-Cache": "HIT" } });
  }

  // ── Early exits ──────────────────────────────────────────────────────
  // No wishlist → no possible match; short-circuit without touching the
  // shares table.
  const myWishlist = await prisma.cardWishlistItem.findMany({
    where: { userId: meId },
    select: { cardId: true },
  });
  if (myWishlist.length === 0) {
    const payload = { suggestions: [] };
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
    return NextResponse.json(payload, { headers: { "X-Cache": "MISS" } });
  }
  const myWishIds = myWishlist.map((w) => w.cardId);

  // Active public shares (except me), with the per-source gates already
  // resolved into { cardsAllowed, doublesAllowed } booleans we'll use below.
  const shares = await prisma.classeurShare.findMany({
    where: { isActive: true, userId: { not: meId } },
    select: {
      slug:         true,
      shareCards:   true,
      shareDoubles: true,
      userId:       true,
      user: { select: { id: true, name: true, image: true } },
    },
  });
  if (shares.length === 0) {
    const payload = { suggestions: [] };
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
    return NextResponse.json(payload, { headers: { "X-Cache": "MISS" } });
  }

  // Partition user IDs by which source(s) they expose. We then run two
  // narrow queries — one for cards, one for doubles — only against the
  // users who actually allow that source. Union in memory, with per-user
  // Sets so a card present in both cards AND doubles counts once.
  const cardsUserIds   = shares.filter((s) => s.shareCards)  .map((s) => s.userId);
  const doublesUserIds = shares.filter((s) => s.shareDoubles).map((s) => s.userId);

  const [cardRows, doubleRows] = await Promise.all([
    cardsUserIds.length > 0
      ? prisma.userCard.findMany({
          where:  { userId: { in: cardsUserIds }, cardId: { in: myWishIds } },
          select: { userId: true, cardId: true },
        })
      : Promise.resolve([]),
    doublesUserIds.length > 0
      ? prisma.userCardDouble.findMany({
          where:  { userId: { in: doublesUserIds }, cardId: { in: myWishIds } },
          select: { userId: true, cardId: true },
        })
      : Promise.resolve([]),
  ]);

  // Per-user Set<cardId>; Set membership handles dedup across sources.
  const matchByUser = new Map<string, Set<string>>();
  for (const r of cardRows) {
    let s = matchByUser.get(r.userId);
    if (!s) { s = new Set(); matchByUser.set(r.userId, s); }
    s.add(r.cardId);
  }
  for (const r of doubleRows) {
    let s = matchByUser.get(r.userId);
    if (!s) { s = new Set(); matchByUser.set(r.userId, s); }
    s.add(r.cardId);
  }

  const suggestions: SuggestionRow[] = shares
    .map((s) => ({
      slug:        s.slug,
      displayName: s.user.name ?? "Dresseur",
      avatarUrl:   s.user.image,
      matchCount:  matchByUser.get(s.user.id)?.size ?? 0,
    }))
    .filter((r) => r.matchCount > 0)
    .sort((a, b) => {
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      return a.displayName.localeCompare(b.displayName);
    })
    .slice(0, limit);

  const payload = { suggestions };
  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
  return NextResponse.json(payload, { headers: { "X-Cache": "MISS" } });
}
