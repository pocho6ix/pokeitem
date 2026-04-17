import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPriceForVersion } from "@/lib/display-price";

/**
 * Lightweight public profile endpoint. The old response embedded full cards,
 * doubles, wishlist arrays AND a pre-computed match — all ripped out for the
 * new trade-calculator flow. This endpoint now only exposes identity, privacy
 * flags, and summary stats; the calculator is fetched separately from
 * `GET /api/users/:slug/trade-calculator`.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const share = await prisma.classeurShare.findUnique({
    where: { slug },
    include: { user: { select: { id: true, name: true, image: true, createdAt: true } } },
  });

  if (!share || !share.isActive) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const owner = share.user;

  // Stats — counts + total card value. We only pull quantity/version + price
  // fields; everything else used to live on this endpoint has moved to the
  // dedicated trade-calculator endpoint.
  const [cardsRaw, doublesRaw, wishlistCount] = await Promise.all([
    share.shareCards
      ? prisma.userCard.findMany({
          where: { userId: owner.id },
          select: {
            quantity: true,
            version:  true,
            card: { select: { price: true, priceFr: true, priceReverse: true } },
          },
        })
      : Promise.resolve([]),
    share.shareDoubles
      ? prisma.userCard.count({ where: { userId: owner.id, quantity: { gt: 1 } } })
      : Promise.resolve(0),
    share.shareWishlist
      ? prisma.cardWishlistItem.count({ where: { userId: owner.id } })
      : Promise.resolve(0),
  ]);

  const cardsCount = cardsRaw.length;
  const cardsValueCents = Math.round(
    cardsRaw.reduce(
      (sum, uc) => sum + getPriceForVersion(uc.card, uc.version) * uc.quantity,
      0,
    ) * 100,
  );

  return NextResponse.json({
    user: {
      slug:        share.slug,
      displayName: owner.name ?? "Dresseur",
      avatarUrl:   owner.image,
      memberSince: owner.createdAt.toISOString(),
      contact: {
        discord: share.contactDiscord,
        email:   share.contactEmail,
        twitter: share.contactTwitter,
      },
    },
    visibility: {
      cards:    share.shareCards,
      doubles:  share.shareDoubles,
      wishlist: share.shareWishlist,
      items:    share.shareItems,
    },
    stats: {
      cardsCount,
      cardsValueCents,
      doublesCount: doublesRaw,
      wishlistCount,
    },
  });
}
