import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrComputeMatch } from "@/lib/matching/getOrComputeMatch";
import { getPriceForVersion } from "@/lib/display-price";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const share = await prisma.classeurShare.findUnique({
    where: { slug },
    include: { user: { select: { id: true, name: true, image: true, createdAt: true } } },
  });

  if (!share || !share.isActive) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const owner = share.user;

  // Stats
  const [cardsRaw, doublesRaw, wishlistRaw, itemsRaw] = await Promise.all([
    share.shareCards ? prisma.userCard.findMany({
      where: { userId: owner.id },
      select: {
        quantity: true, version: true,
        card: {
          select: {
            price: true, priceFr: true, priceReverse: true, serieId: true,
            id: true, number: true, name: true, rarity: true, imageUrl: true,
            types: true,
            serie: { select: { slug: true, name: true, abbreviation: true, bloc: { select: { slug: true } } } },
          },
        },
      },
    }) : Promise.resolve([]),
    share.shareDoubles ? prisma.userCard.findMany({
      where: { userId: owner.id, quantity: { gt: 1 } },
      orderBy: [{ card: { serie: { name: "asc" } } }, { card: { number: "asc" } }],
      select: {
        quantity: true, version: true,
        card: {
          select: {
            id: true, number: true, name: true, rarity: true, imageUrl: true,
            price: true, priceFr: true, priceReverse: true, types: true,
            serie: { select: { id: true, slug: true, name: true, abbreviation: true, bloc: { select: { slug: true } } } },
          },
        },
      },
    }) : Promise.resolve([]),
    share.shareWishlist ? prisma.cardWishlistItem.findMany({
      where: { userId: owner.id },
      orderBy: { addedAt: "desc" },
      select: {
        id: true, addedAt: true,
        card: {
          select: {
            id: true, number: true, name: true, rarity: true, imageUrl: true,
            price: true, priceFr: true, priceReverse: true, types: true,
            serie: { select: { id: true, slug: true, name: true, abbreviation: true, bloc: { select: { slug: true } } } },
          },
        },
      },
    }) : Promise.resolve([]),
    share.shareItems ? prisma.portfolioItem.findMany({
      where: { userId: owner.id },
      select: { quantity: true, item: { select: { currentPrice: true } } },
    }) : Promise.resolve([]),
  ]);

  const cardsCount = cardsRaw.length; // unique (cardId, version) entries
  const cardsValueCents = Math.round(
    cardsRaw.reduce((s, uc) => s + getPriceForVersion(uc.card, uc.version) * uc.quantity, 0) * 100
  );

  // Check visitor auth + compute match
  const session = await getServerSession(authOptions);
  const visitorId = (session?.user as { id?: string } | undefined)?.id ?? null;
  let match = null;
  if (visitorId && visitorId !== owner.id) {
    match = await getOrComputeMatch(visitorId, owner.id);
  }

  // itemsRaw used only for potential future stats
  const itemsCount = itemsRaw.reduce((s, i) => s + i.quantity, 0);

  return NextResponse.json({
    user: {
      slug: share.slug,
      displayName: owner.name ?? "Dresseur",
      avatarUrl: owner.image,
      memberSince: owner.createdAt.toISOString(),
      contact: {
        discord: share.contactDiscord,
        email: share.contactEmail,
        twitter: share.contactTwitter,
      },
    },
    visibility: {
      cards: share.shareCards,
      doubles: share.shareDoubles,
      wishlist: share.shareWishlist,
      items: share.shareItems,
    },
    stats: {
      cardsCount,
      cardsValueCents,
      doublesCount: doublesRaw.length, // unique (cardId, version) rows with qty > 1
      wishlistCount: wishlistRaw.length,
      itemsCount,
    },
    sections: {
      cards: share.shareCards ? cardsRaw : [],
      doubles: share.shareDoubles ? doublesRaw : [],
      wishlist: share.shareWishlist ? wishlistRaw : [],
    },
    match,
  });
}
