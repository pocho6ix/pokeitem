import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { HomepageCTASection } from "@/components/ui/HomepageCTASection";
import { HeroCTAButtons } from "@/components/ui/HeroCTAButtons";
import Link from "next/link";
import Image from "next/image";
import { CollectionHeroCard } from "@/components/dashboard/CollectionHeroCard";
import { HeroSearchBar } from "@/components/ui/HeroSearchBar";
import { HideValuesProvider } from "@/components/ui/HideValuesContext";
import { ReferralBlock } from "@/components/profil/ReferralBlock";
import { HomeCardPreview } from "@/components/cards/HomeCardPreview";
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

async function getFirstCardDate(userId: string): Promise<Date | null> {
  const first = await prisma.userCard.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  return first?.createdAt ?? null;
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

  const [collectionValue, topCards, firstCardDate] = userId
    ? await Promise.all([getCollectionValue(userId), getTopCards(userId), getFirstCardDate(userId)])
    : [null, [] as Awaited<ReturnType<typeof getTopCards>>, null];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {userId ? (
        /* ── Authenticated: dashboard-style hero ── */
        <HideValuesProvider>
          <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-xl">
              <HeroSearchBar />
              {collectionValue && (
                <CollectionHeroCard total={collectionValue.total} firstCardDate={firstCardDate?.toISOString() ?? null} />
              )}
            </div>
          </div>

          {topCards.length > 0 && (
            <section className="px-4 pt-3 pb-4 sm:px-6 lg:px-8">
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

          <section className={`px-4 pt-3 sm:px-6 lg:px-8 ${topCards.length > 0 ? "pb-4" : "pb-28"}`}>
            <div className="mx-auto max-w-xl space-y-4">
              <ReferralBlock />
              <QuestsBlock />
              <TelegramBannerButton />
            </div>
          </section>
        </HideValuesProvider>
      ) : (
        /* ── Guest: original hero with Pokémon image + CTA ── */
        <div>
          <div className="relative overflow-hidden">
            <Image
              src="/images/hero-pokemon.png"
              alt=""
              width={869}
              height={287}
              priority
              sizes="100vw"
              className="w-full h-auto block"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#07111f]" />
          </div>

          <div className="px-4 pb-10 pt-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-xl">
              <h1 className="text-3xl font-extrabold tracking-tight leading-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
                Gérez votre collection{" "}
                <span className="text-[#E7BA76]">Pokémon TCG</span>
              </h1>
              <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm sm:text-base">
                Cataloguez vos cartes et items scellés, suivez leur valeur et regardez votre collection prendre de la hauteur.
              </p>
              <div className="mt-6">
                <HeroCTAButtons />
              </div>
            </div>
          </div>
        </div>
      )}

      <HomepageCTASection />

      <MobileNav />
    </div>
  );
}
