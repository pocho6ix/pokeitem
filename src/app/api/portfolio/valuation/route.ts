import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_PRICE_EUR = 1_000_000;

/**
 * Record a user's manually-entered current valuation for an item they own.
 *
 * Writes are scoped to the caller's own `PortfolioItem.currentPrice` — no
 * cross-user shared field is touched. The `ManualValuation` ledger entry is
 * still created so the history stays auditable for a future user-level chart.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { itemId, price, date, note } = await request.json();

    if (!itemId || typeof price !== "number" || !Number.isFinite(price)) {
      return NextResponse.json({ error: "itemId et price sont requis" }, { status: 400 });
    }
    if (price < 0 || price > MAX_PRICE_EUR) {
      return NextResponse.json({ error: "Prix invalide" }, { status: 400 });
    }

    // Ownership check — the user must already own this item in their portfolio
    // before they can record a valuation. Protects against writing rows for
    // items that don't belong to the caller.
    const portfolioItem = await prisma.portfolioItem.findFirst({
      where: { userId, itemId },
      select: { id: true },
    });
    if (!portfolioItem) {
      return NextResponse.json(
        { error: "Cet item n'est pas dans votre collection." },
        { status: 404 },
      );
    }

    const recordedAt = date ? new Date(date) : new Date();

    // Ledger entry (per-user history) + per-user PortfolioItem.currentPrice.
    // Runs in a transaction so a partial write can't leave the history and
    // the current value out of sync.
    const [valuation] = await prisma.$transaction([
      prisma.manualValuation.create({
        data: { userId, itemId, price, date: recordedAt, note: note || null },
      }),
      prisma.portfolioItem.update({
        where: { id: portfolioItem.id },
        data: { currentPrice: price, currentPriceUpdatedAt: recordedAt },
      }),
    ]);

    return NextResponse.json(valuation, { status: 201 });
  } catch (error) {
    console.error("Error creating manual valuation:", error);
    return NextResponse.json(
      { error: "Erreur lors de la valorisation" },
      { status: 500 }
    );
  }
}
