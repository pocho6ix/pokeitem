import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrComputeMatch } from "@/lib/matching/getOrComputeMatch";
import { getPriceForVersion } from "@/lib/display-price";
import { PublicProfileClient } from "./PublicProfileClient";

export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const share = await prisma.classeurShare.findUnique({
    where: { slug },
    include: { user: { select: { id: true, name: true, image: true, createdAt: true } } },
  });

  if (!share || !share.isActive) notFound();

  const owner = share.user;

  const [cardsRaw, doublesRaw, wishlistRaw] = await Promise.all([
    share.shareCards ? prisma.userCard.findMany({
      where: { userId: owner.id },
      select: {
        quantity: true, version: true,
        card: {
          select: {
            id: true, number: true, name: true, rarity: true, imageUrl: true,
            price: true, priceFr: true, priceReverse: true, types: true,
            serie: { select: { slug: true, name: true, abbreviation: true, bloc: { select: { slug: true } } } },
          },
        },
      },
    }) : Promise.resolve([]),
    share.shareDoubles ? prisma.userCardDouble.findMany({
      where: { userId: owner.id },
      select: {
        quantity: true, cardId: true,
        card: {
          select: {
            id: true, number: true, name: true, rarity: true, imageUrl: true,
            price: true, priceFr: true, priceReverse: true, types: true,
            serie: { select: { slug: true, name: true, abbreviation: true, bloc: { select: { slug: true } } } },
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
  ]);

  const cardsCount = cardsRaw.reduce((s, uc) => s + uc.quantity, 0);
  const cardsValueCents = Math.round(
    cardsRaw.reduce((s, uc) => s + getPriceForVersion(uc.card, uc.version) * uc.quantity, 0) * 100
  );

  const session = await getServerSession(authOptions);
  const visitorId = (session?.user as { id?: string } | undefined)?.id ?? null;

  let match = null;
  let visitorWishlistIds: string[] = [];

  if (visitorId && visitorId !== owner.id) {
    [match, visitorWishlistIds] = await Promise.all([
      getOrComputeMatch(visitorId, owner.id),
      prisma.cardWishlistItem.findMany({
        where: { userId: visitorId },
        select: { cardId: true },
      }).then((items) => items.map((i) => i.cardId)),
    ]);
  }

  // Flatten wishlist cards for client
  const wishlistCards = wishlistRaw.map((wi) => ({
    id: wi.id,
    addedAt: wi.addedAt.toISOString(),
    card: wi.card,
  }));

  return (
    <PublicProfileClient
      profile={{
        slug: share.slug,
        displayName: owner.name ?? "Dresseur",
        avatarUrl: owner.image,
        memberSince: owner.createdAt.toISOString(),
        contact: {
          discord: share.contactDiscord,
          email: share.contactEmail,
          twitter: share.contactTwitter,
        },
      }}
      visibility={{
        cards: share.shareCards,
        doubles: share.shareDoubles,
        wishlist: share.shareWishlist,
        items: share.shareItems,
      }}
      stats={{
        cardsCount,
        cardsValueCents,
        doublesCount: doublesRaw.reduce((s, d) => s + d.quantity, 0),
        wishlistCount: wishlistRaw.length,
      }}
      sections={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cards: cardsRaw as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        doubles: doublesRaw as any,
        wishlist: wishlistCards,
      }}
      match={match}
      isAuthenticated={!!visitorId}
      isOwner={visitorId === owner.id}
      visitorWishlistIds={visitorWishlistIds}
    />
  );
}
