import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { HomepageCTASection } from "@/components/ui/HomepageCTASection";
import Link from "next/link";
import { CollectionHeroCard } from "@/components/dashboard/CollectionHeroCard";
import { HeroSearchBar } from "@/components/ui/HeroSearchBar";
import { ReferralBlock } from "@/components/profil/ReferralBlock";
import { HomeCardPreview } from "@/components/cards/HomeCardPreview"
import { QuestsBlock } from "@/components/quests/QuestsBlock";
import { TelegramBannerButton } from "@/components/ui/TelegramBannerButton";
import { getPriceForVersion } from "@/lib/display-price";


async function getTopCards(userId: string) {
  const userCards = await prisma.userCard.findMany({
    where: { userId },
    select: {
      version: true,
      card: {
        select: {
          id: true,
          name: true,
          number: true,
          imageUrl: true,
          price: true,
          priceFr: true,
          priceReverse: true,
          serie: { select: { slug: true } },
        },
      },
    },
  });

  return userCards
    .map((uc) => ({
      cardId:   uc.card.id,
      name:     uc.card.name,
      number:   uc.card.number,
      imageUrl: uc.card.imageUrl,
      version:  uc.version,
      serieSlug: uc.card.serie.slug,
      price:    getPriceForVersion(uc.card, uc.version),
    }))
    .filter((c) => c.price > 0 && c.imageUrl)
    .sort((a, b) => b.price - a.price)
    .slice(0, 6);
}

async function getCollectionValue(userId: string) {
  // Cards market value
  const userCards = await prisma.userCard.findMany({
    where: { userId },
    select: { quantity: true, version: true, card: { select: { price: true, priceFr: true, priceReverse: true } } },
  });
  const cardsValue = userCards.reduce((sum, uc) => {
    return sum + getPriceForVersion(uc.card, uc.version) * uc.quantity;
  }, 0);

  // Sealed items market value
  const portfolioItems = await prisma.portfolioItem.findMany({
    where: { userId },
    select: { quantity: true, item: { select: { currentPrice: true, priceTrend: true } } },
  });
  const sealedValue = portfolioItems.reduce((sum, pi) => {
    const price = pi.item.currentPrice ?? pi.item.priceTrend ?? 0;
    return sum + price * pi.quantity;
  }, 0);

  return { cardsValue, sealedValue, total: cardsValue + sealedValue };
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const userId  = (session?.user as { id?: string } | undefined)?.id ?? null;
  // Run both user-specific queries in parallel
  const [collectionValue, topCards] = userId
    ? await Promise.all([getCollectionValue(userId), getTopCards(userId)])
    : [null, [] as Awaited<ReturnType<typeof getTopCards>>];


  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* ── Hero — dashboard-style card replacing the old banner ── */}
      <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl">
          <HeroSearchBar />
          {collectionValue && (
            <CollectionHeroCard total={collectionValue.total} />
          )}
        </div>
      </div>

      {/* Top 6 most valuable cards — between hero and referral */}
      {topCards.length > 0 && (
        <section className="px-4 pt-8 pb-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Aperçu de mes cartes
              </h2>
              <Link
                href="/portfolio/cartes"
                className="text-xs font-medium text-[#E7BA76] hover:underline"
              >
                Voir tout
              </Link>
            </div>
            <HomeCardPreview
              cards={topCards.map((c) => ({
                cardId: c.cardId,
                name: c.name,
                imageUrl: c.imageUrl!,
                price: c.price,
              }))}
            />
          </div>
        </section>
      )}

      {/* Referral + Quests blocks — authenticated users only */}
      {userId && (
        <section className={`px-4 pt-3 sm:px-6 lg:px-8 ${topCards.length > 0 ? 'pb-4' : 'pb-28'}`}>
          <div className="mx-auto max-w-xl space-y-4">
            <ReferralBlock />
            <QuestsBlock />
            <TelegramBannerButton />
          </div>
        </section>
      )}

      <HomepageCTASection />

      <MobileNav />
    </div>
  );
}
