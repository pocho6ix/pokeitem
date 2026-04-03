import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { HeroCTAButtons } from "@/components/ui/HeroCTAButtons";
import { HomepageCTASection } from "@/components/ui/HomepageCTASection";
import { Star } from "lucide-react";
import Link from "next/link";
import { HomeCollectionWidget } from "@/components/dashboard/HomeCollectionWidget";

const FAQ_ITEMS = [
  {
    q: "PokeItem est-il gratuit ?",
    a: "Oui, PokeItem propose une version gratuite complète : jusqu'à 100 cartes dans ta collection, 5 items scellés dans le Classeur et 10 scans par mois. Pour une expérience illimitée, l'abonnement Pro est disponible à 3,99€/mois ou 39,99€/an.",
  },
  {
    q: "Que comprend l'abonnement Pro ?",
    a: "L'abonnement Pro donne accès à : collection de cartes illimitée, items scellés illimités, scans illimités, valeur totale de la collection, graphique d'évolution du Classeur et statistiques avancées avec P&L. Deux formules : 3,99€/mois ou 39,99€/an (soit 3,33€/mois, l'équivalent de 2 mois offerts).",
  },
  {
    q: "Comment résilier l'abonnement Pro ?",
    a: "L'abonnement est sans engagement et peut être annulé à tout moment depuis ton profil, rubrique « Gérer mon abonnement ». Tu gardes l'accès Pro jusqu'à la fin de la période en cours.",
  },
  {
    q: "Quels produits Pokémon TCG puis-je gérer sur PokeItem ?",
    a: "PokeItem couvre deux grandes catégories. Les cartes individuelles : toutes les extensions de tous les blocs, des Wizards of the Coast (Set de Base, 1999) jusqu'à Écarlate & Violet — soit plus de 100 extensions. Les items scellés : booster, display, ETB, coffret collection, UPC, tin, bundle, tripack, duopack, theme deck et trainer kit.",
  },
  {
    q: "Comment fonctionne le suivi de valeur ?",
    a: "Les prix des cartes (normal et reverse) et des items scellés sont synchronisés depuis CardMarket. La valeur de ta collection est calculée automatiquement en multipliant ces prix par tes quantités. Le graphique d'évolution (Pro) te permet de visualiser la progression de ton patrimoine dans le temps.",
  },
  {
    q: "Comment ajouter des items à mon Classeur ?",
    a: "Pour les scellés, parcours le catalogue par série depuis la section Classeur et clique sur un produit pour l'ajouter avec ton prix d'achat et ta quantité. Pour les cartes, utilise la section Collection : recherche par extension et ajoute chaque carte possédée (version normale ou reverse).",
  },
  {
    q: "PokeItem est-il disponible sur mobile ?",
    a: "Le site est entièrement optimisé pour mobile avec une navigation dédiée. Une application native iOS et Android est en cours de développement.",
  },
  {
    q: "Mes données de collection sont-elles sécurisées ?",
    a: "Tes données sont stockées de manière sécurisée et ne sont jamais partagées ou revendues à des tiers. Tu peux supprimer ton compte à tout moment depuis tes paramètres.",
  },
  {
    q: "PokeItem est-il un site officiel Pokémon ?",
    a: "Non, PokeItem est un projet indépendant et n'est pas affilié à Nintendo, GAME FREAK ou The Pokémon Company. Les noms et illustrations Pokémon sont la propriété de leurs auteurs respectifs.",
  },
];

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
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-default)] px-3 py-1 text-xs font-medium mb-5">
              <Star className="h-3.5 w-3.5 text-[#E7BA76]" />
              La référence des collectionneurs Pokémon.
            </div>
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

      {/* Top 10 most valuable cards — authenticated users only */}
      {topCards.length > 0 && (
        <section className="bg-[var(--bg-primary)] px-4 pt-3 pb-10 sm:px-6 lg:px-8">
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
            <div className="grid grid-cols-2 gap-3">
              {topCards.map((card) => (
                <Link
                  key={`${card.cardId}-${card.version}`}
                  href={`/carte/${card.cardId}`}
                  className="group"
                >
                  <div className="relative rounded-xl overflow-hidden border border-[var(--border-default)] bg-[var(--bg-card)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.imageUrl!}
                      alt={card.name}
                      className="w-full h-auto block group-hover:scale-105 transition-transform duration-200"
                    />
                    {/* Price badge */}
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center rounded-full bg-green-400 px-2 py-0.5 text-[10px] font-bold text-black shadow">
                        {card.price.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <HomepageCTASection />

      {/* FAQ */}
      <section className="py-20 bg-[var(--bg-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">Questions fréquentes</h2>
            <p className="mt-3 text-[var(--text-secondary)]">
              Tout ce que vous devez savoir sur PokeItem.
            </p>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-6 py-4 open:pb-5"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-semibold text-[var(--text-primary)] list-none [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="shrink-0 text-[var(--text-tertiary)] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ_ITEMS.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          }),
        }}
      />

      <MobileNav />
    </div>
  );
}
