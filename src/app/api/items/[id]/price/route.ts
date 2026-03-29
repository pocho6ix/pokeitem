import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scrapeCardMarketPrice } from "@/lib/scraper/cardmarket";

/**
 * GET /api/items/[id]/price — Fetch latest CardMarket price for an item
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;

    const item = await prisma.item.findUnique({
      where: { id },
      include: { serie: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Item non trouvé" }, { status: 404 });
    }

    // Scrape from CardMarket
    const cmPrice = await scrapeCardMarketPrice(
      item.name,
      item.serie.name,
      item.cardmarketUrl
    );

    if (!cmPrice || (cmPrice.priceTrend === null && cmPrice.priceFrom === null)) {
      return NextResponse.json({
        found: false,
        message: "Prix CardMarket non disponible",
        item: { id: item.id, name: item.name },
      });
    }

    const bestPrice = cmPrice.priceTrend ?? cmPrice.priceFrom ?? 0;

    // Update item with scraped price
    await prisma.item.update({
      where: { id },
      data: {
        priceTrend: cmPrice.priceTrend,
        priceFrom: cmPrice.priceFrom,
        currentPrice: bestPrice,
        priceUpdatedAt: new Date(),
        availableSellers: cmPrice.availableSellers,
        cardmarketUrl: cmPrice.productUrl,
        lastScrapedAt: new Date(),
      },
    });

    // Record in price history
    await prisma.priceHistory.create({
      data: {
        itemId: id,
        price: bestPrice,
        priceFrom: cmPrice.priceFrom,
        source: "cardmarket",
        date: new Date(),
      },
    });

    return NextResponse.json({
      found: true,
      priceTrend: cmPrice.priceTrend,
      priceFrom: cmPrice.priceFrom,
      availableSellers: cmPrice.availableSellers,
      productUrl: cmPrice.productUrl,
      lastUpdated: cmPrice.lastUpdated,
    });
  } catch (error) {
    console.error("Error fetching CardMarket price:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du prix" },
      { status: 500 }
    );
  }
}
