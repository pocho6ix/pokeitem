import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Period = "1w" | "1m" | "3m" | "6m" | "1y" | "max";

function getStartDate(period: Period, releaseDate: Date | null): Date {
  const now = new Date();
  switch (period) {
    case "1w":  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "1m":  return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case "3m":  return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "6m":  return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "1y":  return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    case "max": return releaseDate ?? new Date(2020, 0, 1);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const { cardId } = await params;
  const period = (request.nextUrl.searchParams.get("period") ?? "3m") as Period;

  // Fetch card with serie release date
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      name: true,
      number: true,
      rarity: true,
      imageUrl: true,
      price: true,
      priceFr: true,
      priceReverse: true,
      isSpecial: true,
      priceUpdatedAt: true,
      cardmarketId: true,
      serie: {
        select: {
          name: true,
          slug: true,
          releaseDate: true,
          imageUrl: true,
        },
      },
    },
  });

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const startDate = getStartDate(period, card.serie.releaseDate);

  // ── DB history ──────────────────────────────────────────────────────────────
  const dbHistory = await prisma.cardPriceHistory.findMany({
    where: {
      cardId,
      recordedAt: { gte: startDate },
    },
    orderBy: { recordedAt: "asc" },
    select: {
      price: true,
      priceFr: true,
      recordedAt: true,
    },
  });

  // Build a date → point map from DB
  const merged = new Map<string, { price: number | null; priceFr: number | null }>();
  for (const h of dbHistory) {
    const date = h.recordedAt.toISOString().slice(0, 10);
    merged.set(date, { price: h.price, priceFr: h.priceFr ?? null });
  }

  // Sort by date ascending
  const points = Array.from(merged.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      price: v.price,
      priceFr: v.priceFr,
    }));

  return NextResponse.json({
    card: {
      id: card.id,
      name: card.name,
      number: card.number,
      rarity: card.rarity,
      imageUrl: card.imageUrl,
      price: card.price,
      priceFr: card.priceFr,
      priceReverse: card.priceReverse,
      isSpecial: card.isSpecial,
      priceUpdatedAt: card.priceUpdatedAt,
      cardmarketId: card.cardmarketId,
    },
    serie: card.serie,
    history: points,
  });
}
