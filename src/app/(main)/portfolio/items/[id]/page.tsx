import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ItemDetailForm } from "@/components/portfolio/ItemDetailForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Detail page for a single PortfolioItem (sealed-item holding).
 *
 * Ownership is enforced here — if the id doesn't exist or belongs to another
 * user, we treat the row as not found. Never leak which items other users own.
 */
export default async function PortfolioItemDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/connexion");

  const portfolioItem = await prisma.portfolioItem.findFirst({
    where: { id, userId },
    select: {
      id:                    true,
      quantity:              true,
      purchasePrice:         true,
      currentPrice:          true,
      currentPriceUpdatedAt: true,
      purchaseDate:          true,
      notes:                 true,
      createdAt:             true,
      item: {
        select: {
          id:          true,
          name:        true,
          slug:        true,
          type:        true,
          imageUrl:    true,
          retailPrice: true,
          serie:       { select: { name: true, bloc: { select: { name: true } } } },
        },
      },
    },
  });

  if (!portfolioItem) notFound();

  return (
    <ItemDetailForm
      portfolioItem={{
        id:                    portfolioItem.id,
        quantity:              portfolioItem.quantity,
        purchasePrice:         portfolioItem.purchasePrice,
        currentPrice:          portfolioItem.currentPrice,
        currentPriceUpdatedAt: portfolioItem.currentPriceUpdatedAt?.toISOString() ?? null,
        item: {
          id:          portfolioItem.item.id,
          name:        portfolioItem.item.name,
          slug:        portfolioItem.item.slug,
          type:        portfolioItem.item.type,
          imageUrl:    portfolioItem.item.imageUrl,
          retailPrice: portfolioItem.item.retailPrice,
          serieName:   portfolioItem.item.serie?.name ?? null,
          blocName:    portfolioItem.item.serie?.bloc?.name ?? null,
        },
      }}
    />
  );
}
