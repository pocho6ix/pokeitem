import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { HomepageCTASection } from "@/components/ui/HomepageCTASection";
import { HomepageFAQ } from "@/components/ui/HomepageFAQ";
import { HeroCTAButtons } from "@/components/ui/HeroCTAButtons";
import Link from "next/link";
import Image from "next/image";
import { CollectionHeroCard } from "@/components/dashboard/CollectionHeroCard";
import { HeroSearchBar } from "@/components/ui/HeroSearchBar";
import { HideValuesProvider } from "@/components/ui/HideValuesContext";
import { ReferralBlock } from "@/components/profil/ReferralBlock";
import { ClasseurBetaOffer } from "@/components/beta/ClasseurBetaOffer";
import { HomeCardPreview } from "@/components/cards/HomeCardPreview";
import { QuestsBlock } from "@/components/quests/QuestsBlock";
import { getPriceForVersion } from "@/lib/display-price";
import { resolveItemPrice } from "@/lib/portfolio/resolveItemPrice";


async function getTopCards(userId: string) {
  try {
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
  } catch (err) {
    console.error("getTopCards failed:", err);
    return [];
  }
}

async function getFirstCardDate(userId: string): Promise<Date | null> {
  try {
    const first = await prisma.userCard.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    return first?.createdAt ?? null;
  } catch (err) {
    console.error("getFirstCardDate failed:", err);
    return null;
  }
}

/**
 * Compute the current collection market value. Never throws: if the database
 * hiccups (Neon cold-start, transient P1001), we degrade to zeros so the home
 * dashboard still renders. The daily cron / next page load corrects the
 * figures — better than a full 500 for the user.
 */
async function getCollectionValue(userId: string) {
  try {
    const [userCards, portfolioItems] = await Promise.all([
      prisma.userCard.findMany({
        where: { userId },
        select: { quantity: true, version: true, card: { select: { price: true, priceFr: true, priceReverse: true } } },
      }),
      prisma.portfolioItem.findMany({
        where: { userId },
        select: {
          quantity:     true,
          currentPrice: true,
          item: { select: { retailPrice: true } },
        },
      }),
    ]);

    const cardsValue = userCards.reduce(
      (sum, uc) => sum + getPriceForVersion(uc.card, uc.version) * uc.quantity,
      0,
    );
    const sealedValue = portfolioItems.reduce(
      (sum, pi) => sum + resolveItemPrice(pi.currentPrice, pi.item.retailPrice) * pi.quantity,
      0,
    );

    return { cardsValue, sealedValue, total: cardsValue + sealedValue };
  } catch (err) {
    console.error("getCollectionValue failed, returning zeros:", err);
    return { cardsValue: 0, sealedValue: 0, total: 0 };
  }
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
          <div className="px-4 pb-2 pt-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-xl">
              <HeroSearchBar />
              {collectionValue && (
                <CollectionHeroCard total={collectionValue.total} firstCardDate={firstCardDate?.toISOString() ?? null} />
              )}
            </div>
          </div>

          <div className="px-4 pt-3 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-xl">
              <ClasseurBetaOffer />
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

          <section className="px-4 pt-3 pb-32 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-xl space-y-4">
              <ReferralBlock />
              <QuestsBlock />
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

          <HomepageFAQ />
        </div>
      )}

      <HomepageCTASection />

      <MobileNav />
    </div>
  );
}
