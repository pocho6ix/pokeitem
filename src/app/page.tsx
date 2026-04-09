import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { HeroCTAButtons } from "@/components/ui/HeroCTAButtons";
import { HomepageCTASection } from "@/components/ui/HomepageCTASection";
import Link from "next/link";
import { HomeCollectionWidget } from "@/components/dashboard/HomeCollectionWidget";
import { ReferralBlock } from "@/components/profil/ReferralBlock";
import { HomeCardPreview } from "@/components/cards/HomeCardPreview"
import { QuestsBlock } from "@/components/quests/QuestsBlock";
import { TelegramBannerButton } from "@/components/ui/TelegramBannerButton";


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
      price:
        uc.version === "REVERSE"
          ? (uc.card.priceReverse ?? uc.card.price ?? 0)
          : (uc.card.price ?? 0),
    }))
    .filter((c) => c.price > 0 && c.imageUrl)
    .sort((a, b) => b.price - a.price)
    .slice(0, 10);
}

async function getCollectionValue(userId: string) {
  // Cards market value
  const userCards = await prisma.userCard.findMany({
    where: { userId },
    select: { quantity: true, version: true, card: { select: { price: true, priceReverse: true } } },
  });
  const cardsValue = userCards.reduce((sum, uc) => {
    const price =
      uc.version === "REVERSE"
        ? (uc.card.priceReverse ?? uc.card.price ?? 0)
        : (uc.card.price ?? 0);
    return sum + price * uc.quantity;
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
  const collectionValue = userId ? await getCollectionValue(userId) : null;
  const topCards        = userId ? await getTopCards(userId)        : [];


  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* ── Hero — full-width banner at natural aspect ratio, all viewports ── */}
      <div className="-mt-14 md:-mt-16">
        {/* Spacer = header height → tiny dark-bg gap above the image */}
        <div className="h-14 md:h-16" />

        {/* Image at natural ratio → all 3 Pokémon always visible */}
        <div className="relative overflow-hidden bg-[var(--bg-primary)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero-pokemon.png"
            alt=""
            className="w-full h-auto block"
          />
          {/* Bottom fade into page bg */}
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)]/10 via-transparent to-[var(--bg-primary)]" />
        </div>

        {/* Text content — below the banner on a solid dark background */}
        <div className="bg-[var(--bg-primary)] px-4 pb-10 pt-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl">

            <h1 className="text-3xl font-extrabold tracking-tight leading-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
              Gérez votre collection{" "}
              <span className="text-[#E7BA76]">Pokémon TCG</span>
            </h1>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm sm:text-base">
              Cataloguez vos cartes et items scellés, suivez leur valeur et regardez votre collection prendre de la hauteur.
            </p>
            {/* Collection value widget — above CTA buttons, only for authenticated users */}
            {collectionValue && (
              <div className="mt-6">
                <HomeCollectionWidget
                  total={collectionValue.total}
                  cardsValue={collectionValue.cardsValue}
                  sealedValue={collectionValue.sealedValue}
                />
              </div>
            )}
            <div className={collectionValue ? "mt-4" : "mt-6"}>
              <HeroCTAButtons />
            </div>
          </div>
        </div>
      </div>

      {/* Referral + Quests blocks — authenticated users only */}
      {userId && (
        <section className={`bg-[var(--bg-primary)] px-4 pt-3 sm:px-6 lg:px-8 ${topCards.length > 0 ? 'pb-4' : 'pb-28'}`}>
          <div className="mx-auto max-w-xl space-y-4">
            <ReferralBlock />
            <QuestsBlock />
            <TelegramBannerButton />
          </div>
        </section>
      )}

      {/* Top 10 most valuable cards — authenticated users only */}
      {topCards.length > 0 && (
        <section className="bg-[var(--bg-primary)] px-4 pt-3 pb-28 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
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

      <HomepageCTASection />

      <MobileNav />
    </div>
  );
}
