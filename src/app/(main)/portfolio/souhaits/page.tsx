import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WishlistPageClient } from "./WishlistPageClient";

export const metadata: Metadata = {
  title: "Liste de souhaits",
  description:
    "Votre wishlist de cartes Pokémon TCG : suivez les cartes que vous souhaitez acquérir, consultez leur prix Cardmarket actuel et comparez-les facilement.",
  robots: { index: false, follow: true },
};

export const revalidate = 0;

export default async function WishlistPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/connexion");
  }
  const userId = (session.user as { id: string }).id;

  const rawItems = await prisma.cardWishlistItem.findMany({
    where: { userId },
    orderBy: { addedAt: "desc" },
    include: {
      card: {
        select: {
          id: true,
          number: true,
          name: true,
          rarity: true,
          imageUrl: true,
          price: true,
          priceFr: true,
          priceReverse: true,
          types: true,
          category: true,
          trainerType: true,
          energyType: true,
          serie: {
            select: {
              id: true,
              slug: true,
              name: true,
              abbreviation: true,
              bloc: { select: { slug: true } },
            },
          },
        },
      },
    },
  });

  const items = rawItems.map((wi) => ({
    wishlistId: wi.id,
    addedAt: wi.addedAt.toISOString(),
    priority: wi.priority,
    maxPrice: wi.maxPrice,
    note: wi.note,
    card: {
      ...wi.card,
      rarity: wi.card.rarity as string,
    },
  }));

  return <WishlistPageClient items={items} />;
}
