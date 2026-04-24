import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { CardVersion } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkFeature } from "@/lib/subscription";
import { getPriceForVersion } from "@/lib/display-price";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "euro" | "percent";

interface TopPerformanceItem {
  userCardId: string;
  cardId: string;
  cardName: string;
  cardNumber: string;
  cardImageUrl: string | null;
  serieSlug: string;
  blocSlug: string;
  version: CardVersion;
  priceNow: number;
  priceThen: number;
  deltaEuro: number;
  deltaPercent: number;
}

// Row shape returned by the raw SQL history query (camelCase columns
// because the Postgres columns are quoted as such in the schema).
interface HistoryRow {
  cardId: string;
  price: number;
  priceFr: number | null;
  priceReverse: number | null;
  recordedAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * First day of the *current* month at 00:00 UTC. All history entries with
 * `recordedAt < this` are considered "pre-this-month", so the latest one
 * represents the price "at the start of the month" for delta computation.
 */
function startOfCurrentMonthUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Pick the right historical price column for a given card variant, mirroring
 * `getPriceForVersion` but reading from CardPriceHistory (which intentionally
 * does NOT store `priceFirstEdition` — ED1 cards fall back to priceFr/price).
 */
function getHistoryPrice(hist: HistoryRow, version: CardVersion): number {
  if (version === "NORMAL" || version === "FIRST_EDITION") {
    return hist.priceFr ?? hist.price ?? 0;
  }
  // All reverse variants: prefer reverse trend, fall back to FR, then int.
  return hist.priceReverse ?? hist.priceFr ?? hist.price ?? 0;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  // Pro gate — mirrors the logic used by the evolution chart.
  const gate = await checkFeature(userId, "VIEW_TOP_PERFORMANCES");
  if (!gate.isPro) {
    return NextResponse.json({ locked: true, top: [] }, { status: 200 });
  }

  const mode: Mode = req.nextUrl.searchParams.get("mode") === "percent" ? "percent" : "euro";

  // 1) Pull every user card + the live price columns. Dedup by (cardId, version)
  //    — a user can own several copies of the same card (doubles), but we only
  //    rank each unique card once.
  const userCards = await prisma.userCard.findMany({
    where: { userId },
    select: {
      id: true,
      cardId: true,
      version: true,
      card: {
        select: {
          name: true,
          number: true,
          imageUrl: true,
          price: true,
          priceFr: true,
          priceReverse: true,
          priceFirstEdition: true,
          serie: {
            select: {
              slug: true,
              bloc: { select: { slug: true } },
            },
          },
        },
      },
    },
  });

  const uniqueByKey = new Map<string, (typeof userCards)[number]>();
  for (const uc of userCards) {
    const key = `${uc.cardId}:${uc.version}`;
    if (!uniqueByKey.has(key)) uniqueByKey.set(key, uc);
  }
  const uniqueCards = [...uniqueByKey.values()];
  if (uniqueCards.length === 0) {
    return NextResponse.json({ locked: false, top: [] });
  }

  // 2) For each cardId, pull the most recent CardPriceHistory row whose
  //    `recordedAt < startOfMonth`. One SQL with DISTINCT ON — O(N) where N
  //    = number of unique cards the user owns, not the number of history rows.
  const firstOfMonth = startOfCurrentMonthUTC();
  const cardIds = [...new Set(uniqueCards.map((u) => u.cardId))];

  const historyRows = await prisma.$queryRaw<HistoryRow[]>`
    SELECT DISTINCT ON (h."cardId")
      h."cardId"      AS "cardId",
      h.price         AS "price",
      h."priceFr"     AS "priceFr",
      h."priceReverse" AS "priceReverse",
      h."recordedAt"  AS "recordedAt"
    FROM card_price_histories h
    WHERE h."cardId" = ANY(${cardIds}::text[])
      AND h."recordedAt" < ${firstOfMonth}
    ORDER BY h."cardId", h."recordedAt" DESC
  `;
  const historyByCardId = new Map(historyRows.map((h) => [h.cardId, h]));

  // 3) Compute deltas, filter to gainers only (top chart = positives), sort.
  const scored: TopPerformanceItem[] = [];
  for (const uc of uniqueCards) {
    const hist = historyByCardId.get(uc.cardId);
    if (!hist) continue;

    const priceNow = getPriceForVersion(uc.card, uc.version);
    const priceThen = getHistoryPrice(hist, uc.version);
    if (priceNow <= 0 || priceThen <= 0) continue;

    const deltaEuro = priceNow - priceThen;
    if (deltaEuro <= 0) continue; // user asked: "seulement le top", no losers

    const deltaPercent = (deltaEuro / priceThen) * 100;
    scored.push({
      userCardId: uc.id,
      cardId: uc.cardId,
      cardName: uc.card.name,
      cardNumber: uc.card.number,
      cardImageUrl: uc.card.imageUrl,
      serieSlug: uc.card.serie.slug,
      blocSlug: uc.card.serie.bloc.slug,
      version: uc.version,
      priceNow,
      priceThen,
      deltaEuro,
      deltaPercent,
    });
  }

  scored.sort((a, b) =>
    mode === "euro" ? b.deltaEuro - a.deltaEuro : b.deltaPercent - a.deltaPercent,
  );

  return NextResponse.json({
    locked: false,
    mode,
    top: scored.slice(0, 6),
  });
}
