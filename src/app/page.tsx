import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { HeroCTAButtons } from "@/components/ui/HeroCTAButtons";
import { HomepageCTASection } from "@/components/ui/HomepageCTASection";
import { ArrowRight, Star, TrendingUp } from "lucide-react";
import Link from "next/link";

const FAQ_ITEMS = [
  {
    q: "PokeItem est-il gratuit ?",
    a: "Oui, PokeItem est entièrement gratuit. Créez un compte en quelques secondes et commencez à cataloguer votre collection sans aucun frais.",
  },
  {
    q: "Quels produits Pokémon TCG puis-je gérer sur PokeItem ?",
    a: "PokeItem couvre tous les items scellés Pokémon TCG : displays, Elite Trainer Box (ETB), coffrets, boosters, tins et UPC. Le catalogue s'étend des extensions WOTC (Set de Base, 1999) jusqu'aux dernières sorties, en passant par XY, Soleil & Lune, Épée & Bouclier, Écarlate & Violet et Méga-Évolution.",
  },
  {
    q: "Comment fonctionne le suivi de valeur ?",
    a: "PokeItem agrège les prix des principales plateformes de revente (CardMarket, eBay, Vinted) et calcule la valeur estimée de votre collection en temps réel. Un historique vous permet de visualiser l'évolution et d'identifier les meilleures fenêtres d'achat ou de vente.",
  },
  {
    q: "Comment ajouter des items à mon Classeur ?",
    a: "Depuis la page Classeur, parcourez le catalogue par série ou utilisez la recherche. Cliquez sur un item pour l'ajouter, puis renseignez le prix d'achat, la quantité et l'état. Vos données sont sauvegardées instantanément.",
  },
  {
    q: "PokeItem est-il disponible sur mobile ?",
    a: "Une application native iOS et Android est en cours de développement. En attendant, le site est entièrement responsive et s'utilise confortablement sur smartphone et tablette.",
  },
  {
    q: "Mes données de collection sont-elles sécurisées ?",
    a: "Vos données sont stockées de manière sécurisée et ne sont jamais partagées ou revendues à des tiers. Vous pouvez exporter ou supprimer votre compte à tout moment depuis vos paramètres.",
  },
  {
    q: "PokeItem est-il un site officiel Pokémon ?",
    a: "Non, PokeItem est un projet indépendant et n'est pas affilié à Nintendo, GAME FREAK ou The Pokémon Company. Les noms et illustrations Pokémon sont la propriété de leurs auteurs respectifs.",
  },
  {
    q: "Le Scanner de cartes est-il déjà disponible ?",
    a: "Le Scanner alimenté par IA est en cours de développement. Il vous permettra d'identifier instantanément n'importe quelle carte ou item scellé en prenant une simple photo, et de l'ajouter automatiquement à votre Classeur.",
  },
];

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

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* ── Hero — full-width banner at natural aspect ratio, all viewports ── */}
      <div className="-mt-14 md:-mt-16">
        {/* Spacer = header height → tiny dark-bg gap above the image */}
        <div className="h-14 md:h-16" />

        {/* Image at natural ratio → all 3 Pokémon always visible */}
        <div className="relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero-pokemon.jpg"
            alt=""
            className="w-full h-auto block"
          />
          {/* Bottom fade into page bg */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg-primary)]" />
        </div>

        {/* Text content — below the banner on a solid dark background */}
        <div className="bg-[var(--bg-primary)] px-4 pb-6 pt-3 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-default)] px-3 py-1 text-xs font-medium mb-4">
              <Star className="h-3.5 w-3.5 text-yellow-400" />
              La référence des collectionneurs Pokémon.
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight leading-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
              Gérez votre collection{" "}
              <span className="text-yellow-400">Pokémon TCG</span>
            </h1>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm sm:text-base">
              Cataloguez vos cartes et items scellés, suivez leur valeur et regardez votre collection prendre de la hauteur.
            </p>
            <div className="mt-5">
              <HeroCTAButtons />
            </div>
          </div>
        </div>

        {/* Collection value — directly below CTA buttons, only for authenticated users with a collection */}
        {collectionValue && collectionValue.total > 0 && (
          <div className="bg-[var(--bg-primary)] px-4 pb-10 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-xl">
              <Link
                href="/classeur"
                className="group flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-5 py-4 hover:border-emerald-500/40 hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-emerald-500/10 p-2.5 shrink-0">
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">Valeur de ma collection</p>
                    <p className="text-xl font-bold text-emerald-400 font-data">
                      {collectionValue.total.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                      Cartes&nbsp;
                      <span className="font-medium text-[var(--text-secondary)]">
                        {collectionValue.cardsValue.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                      </span>
                      &nbsp;·&nbsp;Scellés&nbsp;
                      <span className="font-medium text-[var(--text-secondary)]">
                        {collectionValue.sealedValue.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                      </span>
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-[var(--text-tertiary)] group-hover:text-emerald-400 transition-colors shrink-0" />
              </Link>
            </div>
          </div>
        )}
      </div>

      <HomepageCTASection />

      {/* FAQ */}
      <section className="py-20 bg-[var(--bg-secondary)]">
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

      <Footer />
      <MobileNav />
    </div>
  );
}
