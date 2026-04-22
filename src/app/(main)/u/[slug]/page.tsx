import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPriceForVersion } from "@/lib/display-price";
import { PublicProfileClient } from "./PublicProfileClient";

// Public profiles are intentionally excluded from the sitemap AND marked
// noindex/nofollow: product decision to keep user profiles out of search
// engines until we ship a proper opt-in UX. The pages remain reachable via
// direct URL (no 404, no auth wall) — only discoverability is suppressed.
//
// Metadata is nevertheless personalized per slug so that share links
// (Discord, WhatsApp, Twitter cards) show a useful title/description
// preview. We deliberately use the slug — not `owner.name` from the DB —
// to avoid a second Prisma round-trip inside `generateMetadata`: the page
// handler already makes the lookup it needs, and slugs are human-readable
// enough for a preview card.
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const title       = `Profil @${slug}`;
  const description = `Collection Pokémon TCG de ${slug} sur PokeItem — cartes possédées, doublons à échanger et wishlist publique.`;
  const url         = `https://app.pokeitem.fr/u/${slug}`;
  return {
    title,
    description,
    robots:     { index: false, follow: false },
    alternates: { canonical: url },
    openGraph:  { title, description, type: "profile", url },
    twitter:    { card: "summary_large_image", title, description },
  };
}

/**
 * Lightweight server-side loader for a public dresseur profile. Only pulls
 * identity + summary stats; the heavy intersection work (cards a visitor can
 * buy / sell / trade) is deferred to the client-side calculator endpoint,
 * `GET /api/users/:slug/trade-calculator`, which is added in phase 2 of the
 * trade-calculator rewrite.
 */
export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const share = await prisma.classeurShare.findUnique({
    where: { slug },
    include: { user: { select: { id: true, name: true, image: true, createdAt: true } } },
  });

  if (!share || !share.isActive) notFound();

  const owner = share.user;
  const session = await getServerSession(authOptions);
  const visitorId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const isOwner = visitorId === owner.id;

  const [cardsRaw, doublesCount, wishlistCount] = await Promise.all([
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

  const cardsCount      = cardsRaw.length;
  const cardsValueCents = Math.round(
    cardsRaw.reduce(
      (sum, uc) => sum + getPriceForVersion(uc.card, uc.version) * uc.quantity,
      0,
    ) * 100,
  );

  return (
    <PublicProfileClient
      user={{
        slug:        share.slug,
        displayName: owner.name ?? "Dresseur",
        avatarUrl:   owner.image,
        memberSince: owner.createdAt.toISOString(),
        contact: {
          discord: share.contactDiscord,
          email:   share.contactEmail,
          twitter: share.contactTwitter,
        },
      }}
      visibility={{
        cards:    share.shareCards,
        doubles:  share.shareDoubles,
        wishlist: share.shareWishlist,
        items:    share.shareItems,
      }}
      stats={{ cardsCount, cardsValueCents, doublesCount, wishlistCount }}
      viewer={{ isAuthenticated: !!visitorId, isOwner }}
    />
  );
}
