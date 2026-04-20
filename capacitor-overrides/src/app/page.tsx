"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { HomepageCTASection } from "@/components/ui/HomepageCTASection";
import { HomepageFAQ } from "@/components/ui/HomepageFAQ";
import { HeroCTAButtons } from "@/components/ui/HeroCTAButtons";
import { CollectionHeroCard } from "@/components/dashboard/CollectionHeroCard";
import { HeroSearchBar } from "@/components/ui/HeroSearchBar";
import { HideValuesProvider } from "@/components/ui/HideValuesContext";
import { ReferralBlock } from "@/components/profil/ReferralBlock";
import { ClasseurBetaOffer } from "@/components/beta/ClasseurBetaOffer";
import { HomeCardPreview } from "@/components/cards/HomeCardPreview";
import { QuestsBlock } from "@/components/quests/QuestsBlock";
import { useAuth } from "@/lib/auth-context";
import { fetchApi } from "@/lib/api";

type TopCard = {
  cardId: string;
  name: string;
  imageUrl: string;
  price: number;
};

export default function HomePage() {
  const { status, user } = useAuth();
  const authed = status === "authenticated" && user;

  const [totalValue, setTotalValue] = useState<number | null>(null);
  const [firstCardDate, setFirstCardDate] = useState<string | null>(null);
  const [topCards, setTopCards] = useState<TopCard[]>([]);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    (async () => {
      try {
        const [portfolioRes, collectionRes] = await Promise.all([
          fetchApi("/api/portfolio"),
          fetchApi("/api/cards/collection"),
        ]);
        if (cancelled) return;

        let sealedValue = 0;
        if (portfolioRes.ok) {
          const data = await portfolioRes.json();
          sealedValue = data?.summary?.totalCurrentValue ?? 0;
        }

        let cardsValue = 0;
        let earliest: string | null = null;
        const picks: TopCard[] = [];
        if (collectionRes.ok) {
          const data = await collectionRes.json();
          const cards: Array<{
            cardId: string;
            createdAt: string;
            quantity: number;
            version: string;
          }> = data?.cards ?? [];
          for (const c of cards) {
            if (!earliest || c.createdAt < earliest) earliest = c.createdAt;
          }
          // Top cards / cardsValue require joined card price data which the
          // current /api/cards/collection endpoint doesn't expose. Leave
          // empty for now — the dashboard still renders gracefully.
        }

        if (cancelled) return;
        setTotalValue(sealedValue + cardsValue);
        setFirstCardDate(earliest);
        setTopCards(picks);
      } catch (err) {
        console.error("Home dashboard load failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authed]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {authed ? (
        <HideValuesProvider>
          <div className="px-4 pb-2 pt-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-xl">
              <HeroSearchBar />
              {totalValue !== null && (
                <CollectionHeroCard total={totalValue} firstCardDate={firstCardDate} />
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
                <HomeCardPreview cards={topCards} />
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
