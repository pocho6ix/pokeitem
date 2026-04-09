import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SERIES } from "@/data/series";
import { BLOCS } from "@/data/blocs";
import { checkFeature } from "@/lib/subscription";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    const portfolioItems = await prisma.portfolioItem.findMany({
      where: { userId },
      select: {
        id:            true,
        quantity:      true,
        purchasePrice: true,
        purchaseDate:  true,
        condition:     true,
        notes:         true,
        createdAt:     true,
        item: {
          select: {
            id:             true,
            name:           true,
            slug:           true,
            type:           true,
            imageUrl:       true,
            currentPrice:   true,
            priceTrend:     true,
            retailPrice:    true,
            language:       true,
            cardmarketUrl:  true,
            serie: {
              select: {
                id:           true,
                name:         true,
                slug:         true,
                abbreviation: true,
                imageUrl:     true,
                bloc: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = portfolioItems.map((pi) => {
      const currentPrice = pi.item.currentPrice ?? pi.item.priceTrend ?? 0;
      const purchasePrice = pi.purchasePrice ?? 0;
      const currentValue = currentPrice * pi.quantity;
      const pnl = currentValue - purchasePrice;
      const pnlPercent = purchasePrice > 0 ? (pnl / purchasePrice) * 100 : 0;

      return {
        id: pi.id,
        item: pi.item,
        quantity: pi.quantity,
        purchasePrice,
        purchasePricePerUnit: pi.quantity > 0 ? purchasePrice / pi.quantity : 0,
        purchaseDate: pi.purchaseDate,
        condition: pi.condition,
        currentValue,
        currentValuePerUnit: currentPrice,
        pnl,
        pnlPercent,
        notes: pi.notes,
        createdAt: pi.createdAt,
      };
    });

    const totalInvested = items.reduce((sum, i) => sum + i.purchasePrice, 0);
    const totalCurrentValue = items.reduce((sum, i) => sum + i.currentValue, 0);
    const totalPnl = totalCurrentValue - totalInvested;
    const totalPnlPercent =
      totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    // Distribution by type
    const typeMap = new Map<string, number>();
    for (const i of items) {
      const type = i.item.type;
      typeMap.set(type, (typeMap.get(type) ?? 0) + i.currentValue);
    }
    const totalValue = items.reduce((s, i) => s + i.currentValue, 0);
    const distributionByType = Array.from(typeMap.entries()).map(
      ([type, value]) => ({
        name: type,
        value: totalValue > 0 ? Math.round((value / totalValue) * 100) : 0,
        type,
      })
    );

    // Top performers
    const topPerformers = items
      .filter((i) => i.purchasePrice > 0 && i.currentValuePerUnit > 0)
      .map((i) => ({
        name: i.item.name,
        purchasePrice: i.purchasePricePerUnit,
        currentPrice: i.currentValuePerUnit,
        pl: i.pnlPercent,
      }))
      .sort((a, b) => b.pl - a.pl)
      .slice(0, 5);

    const summary = {
      totalInvested: Math.round(totalInvested * 100) / 100,
      totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
      totalPnl: Math.round(totalPnl * 100) / 100,
      totalPnlPercent: Math.round(totalPnlPercent * 100) / 100,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      uniqueItemCount: items.length,
    };

    return NextResponse.json({
      items,
      summary,
      distributionByType,
      topPerformers,
    });
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    const check = await checkFeature(userId, 'ADD_SEALED_ITEM')
    if (!check.allowed) {
      return NextResponse.json({ error: 'LIMIT_REACHED', reason: check.reason, limit: check.limit, current: check.current }, { status: 403 })
    }

    const body = await request.json();
    const {
      itemId,
      quantity,
      purchasePrice,
      purchaseDate,
      notes,
      // For auto-creating items not yet in DB
      serieSlug,
      itemType,
      itemName,
      retailPrice,
    } = body;

    if (quantity !== undefined && (typeof quantity !== "number" || quantity < 1)) {
      return NextResponse.json(
        { error: "quantity doit être un nombre positif" },
        { status: 400 }
      );
    }

    let resolvedItemId = itemId;

    // If no itemId, find or create the item based on serie + type
    if (!resolvedItemId && serieSlug && itemType) {
      // Find the serie in DB
      let serie = await prisma.serie.findFirst({
        where: { slug: serieSlug },
      });

      // If serie doesn't exist, create it from static data
      if (!serie) {
        // Look up serie in static data to get the correct blocSlug
        const staticSerie = SERIES.find((s) => s.slug === serieSlug);
        const blocSlug = staticSerie?.blocSlug;

        if (!blocSlug) {
          return NextResponse.json(
            { error: "Série introuvable dans les données statiques" },
            { status: 400 }
          );
        }

        // Find or create the bloc in DB
        let bloc = await prisma.bloc.findFirst({ where: { slug: blocSlug } });
        if (!bloc) {
          const staticBloc = BLOCS.find((b) => b.slug === blocSlug);
          if (!staticBloc) {
            return NextResponse.json(
              { error: "Bloc introuvable dans les données statiques" },
              { status: 400 }
            );
          }
          bloc = await prisma.bloc.create({
            data: {
              name: staticBloc.name,
              slug: staticBloc.slug,
              abbreviation: staticBloc.abbreviation ?? null,
              order: staticBloc.order,
            },
          });
        }

        serie = await prisma.serie.create({
          data: {
            name: staticSerie.name,
            slug: staticSerie.slug,
            abbreviation: staticSerie.abbreviation ?? null,
            blocId: bloc.id,
          },
        });
      }

      // Find existing item by serie + type
      let item = await prisma.item.findFirst({
        where: { serieId: serie.id, type: itemType as import("@prisma/client").ItemType },
      });

      // Create item if it doesn't exist
      if (!item) {
        const slug = `${serieSlug}-${itemType.toLowerCase().replace(/_/g, "-")}`;
        item = await prisma.item.create({
          data: {
            serieId: serie.id,
            name: itemName || `${serie.name} — ${itemType}`,
            slug,
            type: itemType as import("@prisma/client").ItemType,
            retailPrice: retailPrice ?? null,
          },
        });
      }

      resolvedItemId = item.id;
    }

    if (!resolvedItemId) {
      return NextResponse.json(
        { error: "itemId ou serieSlug + itemType requis" },
        { status: 400 }
      );
    }

    const itemExists = await prisma.item.findUnique({
      where: { id: resolvedItemId },
    });
    if (!itemExists) {
      return NextResponse.json({ error: "Item non trouvé" }, { status: 404 });
    }

    const portfolioItem = await prisma.portfolioItem.create({
      data: {
        userId,
        itemId: resolvedItemId,
        quantity: quantity ?? 1,
        purchasePrice: purchasePrice ?? 0,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        notes: notes ?? null,
      },
      select: {
        id:            true,
        quantity:      true,
        purchasePrice: true,
        purchaseDate:  true,
        condition:     true,
        notes:         true,
        createdAt:     true,
        item: {
          select: {
            id:             true,
            name:           true,
            slug:           true,
            type:           true,
            imageUrl:       true,
            currentPrice:   true,
            priceTrend:     true,
            retailPrice:    true,
            language:       true,
            cardmarketUrl:  true,
            serie: {
              select: {
                id:           true,
                name:         true,
                slug:         true,
                abbreviation: true,
                imageUrl:     true,
                bloc: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(portfolioItem, { status: 201 });
  } catch (error) {
    console.error("Error adding to portfolio:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'ajout au portfolio" },
      { status: 500 }
    );
  }
}
