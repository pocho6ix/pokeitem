import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CardVersion } from "@/data/card-versions";
import { getPriceForVersion } from "@/lib/display-price";
import { DoublesGrid } from "@/components/cards/DoublesGrid";
import { HeroSearchBar } from "@/components/ui/HeroSearchBar";
import type { BlocGroup } from "@/components/cards/DoublesGrid";

export const metadata: Metadata = {
  title: "Doubles — Mon Classeur | PokeItem",
  description: "Consultez vos cartes en doublon (quantité > 1) dans votre collection.",
};

export const revalidate = 0;

export default async function PortfolioDoublesPage() {
  const session = await getServerSession(authOptions);
  const userId  = (session?.user as { id?: string } | undefined)?.id ?? null;

  if (!userId) redirect("/connexion");

  const doubles = await prisma.userCard.findMany({
    where: { userId, quantity: { gt: 1 } },
    select: {
      id:       true,
      cardId:   true,
      quantity: true,
      version:  true,
      card: {
        select: {
          name:      true,
          number:    true,
          imageUrl:  true,
          price:        true,
          priceFr:      true,
          priceReverse: true,
          isSpecial:    true,
          serie: {
            select: {
              slug: true,
              name: true,
              bloc: { select: { slug: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: [
      { card: { serie: { bloc: { name: "asc" } } } },
      { card: { serie: { name: "asc" } } },
      { card: { number: "asc" } },
    ],
  });

  const rows = doubles.map((uc) => {
    const version = (uc.version ?? CardVersion.NORMAL) as CardVersion;
    const isFrenchPrice =
      version === CardVersion.NORMAL && uc.card.priceFr != null;
    return {
      id:           uc.id,
      cardId:       uc.cardId,
      cardName:     uc.card.name,
      cardNumber:   uc.card.number,
      cardImageUrl:  uc.card.imageUrl,
      cardPrice:     getPriceForVersion(uc.card, version) || null,
      isFrenchPrice,
      cardIsSpecial: uc.card.isSpecial,
      serieSlug:    uc.card.serie.slug,
      serieName:    uc.card.serie.name,
      blocSlug:     uc.card.serie.bloc.slug,
      blocName:     uc.card.serie.bloc.name,
      version,
      quantity:     uc.quantity,
    };
  });

  const blocMap = new Map<string, BlocGroup>();
  for (const row of rows) {
    if (!blocMap.has(row.blocSlug)) {
      blocMap.set(row.blocSlug, { blocSlug: row.blocSlug, blocName: row.blocName, series: [] });
    }
    const bloc = blocMap.get(row.blocSlug)!;
    let serie = bloc.series.find((s) => s.serieSlug === row.serieSlug);
    if (!serie) {
      serie = { serieSlug: row.serieSlug, serieName: row.serieName, cards: [] };
      bloc.series.push(serie);
    }
    serie.cards.push(row);
  }

  const blocs = Array.from(blocMap.values());
  const totalSeries = blocs.reduce((s, b) => s + b.series.length, 0);

  return (
    <>
      <Link href="/portfolio" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Classeur
      </Link>
      <div className="mb-4 max-w-xl">
        <HeroSearchBar ownedOnly />
      </div>
      <DoublesGrid blocs={blocs} totalDoubles={rows.length} totalSeries={totalSeries} />
    </>
  );
}
