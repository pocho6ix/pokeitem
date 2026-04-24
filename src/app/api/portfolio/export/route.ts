import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPriceForVersion } from "@/lib/display-price";
import { resolveItemPrice } from "@/lib/portfolio/resolveItemPrice";
import {
  buildCardsCsv,
  buildItemsCsv,
  type CardExportRow,
  type ItemExportRow,
} from "@/lib/export/portfolioCsv";
import {
  CARD_CONDITION_LABELS,
  CARD_VERSION_LABELS,
  ITEM_TYPE_LABELS,
  LANGUAGE_LABELS,
} from "@/lib/export/enumLabels";

// Returns the two portfolio CSVs as JSON so the client can drive the
// download / share flow itself. We keep the heavy lifting (enum mapping,
// price resolution, serie.cardCount lookup) server-side for consistency
// with the other portfolio endpoints and to avoid shipping Prisma enum
// imports into the client bundle.
//
// Response shape:
//   { cartesCsv: string; itemsCsv: string; cardsCount: number; itemsCount: number }

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const [userCards, portfolioItems] = await Promise.all([
    prisma.userCard.findMany({
      where: { userId },
      select: {
        condition: true,
        version: true,
        language: true,
        purchasePrice: true,
        createdAt: true,
        card: {
          select: {
            name: true,
            number: true,
            price: true,
            priceFr: true,
            priceReverse: true,
            priceFirstEdition: true,
            serie: {
              select: {
                name: true,
                cardCount: true,
                bloc: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.portfolioItem.findMany({
      where: { userId },
      select: {
        quantity: true,
        purchasePrice: true,
        currentPrice: true,
        createdAt: true,
        item: {
          select: {
            type: true,
            retailPrice: true,
            serie: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const cardRows: CardExportRow[] = userCards.map((uc) => ({
    name: uc.card.name,
    number: uc.card.number,
    setTotal: uc.card.serie.cardCount,
    serieName: uc.card.serie.name,
    blocName: uc.card.serie.bloc.name,
    condition: CARD_CONDITION_LABELS[uc.condition],
    version: CARD_VERSION_LABELS[uc.version],
    language: LANGUAGE_LABELS[uc.language],
    purchasePrice: uc.purchasePrice,
    currentPrice: getPriceForVersion(uc.card, uc.version),
  }));

  const itemRows: ItemExportRow[] = portfolioItems.map((pi) => ({
    type: ITEM_TYPE_LABELS[pi.item.type],
    serieName: pi.item.serie.name,
    quantity: pi.quantity,
    purchasePrice: pi.purchasePrice,
    currentPrice: resolveItemPrice(pi.currentPrice, pi.item.retailPrice),
  }));

  const cartesCsv = buildCardsCsv(cardRows);
  const itemsCsv = buildItemsCsv(itemRows);

  return NextResponse.json({
    cartesCsv,
    itemsCsv,
    cardsCount: cardRows.length,
    itemsCount: itemRows.length,
  });
}
