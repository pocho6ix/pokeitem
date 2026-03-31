import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { HeroCTAButtons } from "@/components/ui/HeroCTAButtons";
import { HomepageCTASection } from "@/components/ui/HomepageCTASection";
import { Package, TrendingUp, ShoppingBag, BarChart3, ArrowRight, Star } from "lucide-react";

const FEATURES = [
  {
    icon: Package,
    title: "Catalogue complet",
    description:
      "Tous les items scellés Pokémon TCG : displays, ETB, coffrets, boosters, de WOTC à Méga-Évolution.",
  },
  {
    icon: TrendingUp,
    title: "Suivi de valeur",
    description:
      "Suivez la valeur de votre collection en temps réel avec des graphiques et des indicateurs de tendance.",
  },
  {
    icon: ShoppingBag,
    title: "Market intégré",
    description:
      "Trouvez les meilleures offres sur CardMarket, eBay, LeBonCoin et Vinted, centralisées en un seul endroit.",
  },
  {
    icon: BarChart3,
    title: "Dashboard Finary-like",
    description:
      "Visualisez votre patrimoine Pokémon comme un portefeuille d'investissement avec P&L, répartition et historique.",
  },
];

const POPULAR_BLOCS = [
  { name: "Méga-Évolution", slug: "mega-evolution", series: 4, period: "2025 — En cours", image: "/images/blocs/mega-evolution.png" },
  { name: "Écarlate & Violet", slug: "ecarlate-violet", series: 15, period: "2023 — 2025", image: "/images/blocs/ecarlate-violet.png" },
  { name: "Épée & Bouclier", slug: "epee-bouclier", series: 16, period: "2020 — 2023", image: "/images/blocs/epee-bouclier.png" },
];

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

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* ── Hero — full-width banner at natural aspect ratio, all viewports ── */}
      {/* -mt-14/-mt-16 pulls the section behind the transparent sticky header.
          The h-14/h-16 spacer then pushes the image to start exactly at the
          header bottom, so the profile avatar never covers a Pokémon. */}
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
        <div className="bg-[var(--bg-primary)] px-4 pb-10 pt-3 sm:px-6 lg:px-8">
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
      </div>

      {/* Features */}
      <section className="py-20 bg-[var(--bg-primary)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">
              Tout ce qu&apos;il faut pour votre collection
            </h2>
            <p className="mt-3 text-[var(--text-secondary)] max-w-2xl mx-auto">
              PokeItem réunit catalogue, suivi de valeur et market en une seule plateforme.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 hover:shadow-lg transition-shadow"
              >
                <div className="inline-flex rounded-xl bg-[var(--color-primary)]/10 p-3">
                  <feature.icon className="h-6 w-6 text-[var(--color-primary)]" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular blocs */}
      <section className="py-20 bg-[var(--bg-secondary)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Séries populaires</h2>
              <p className="mt-1 text-[var(--text-secondary)]">Explorez les dernières séries Pokémon TCG</p>
            </div>
            <Link
              href="/collection"
              className="text-sm font-medium text-[var(--color-primary)] hover:underline flex items-center gap-1"
            >
              Tout voir <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {POPULAR_BLOCS.map((bloc) => (
              <Link
                key={bloc.slug}
                href={`/collection/produits/${bloc.slug}`}
                className="group rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 hover:shadow-lg hover:border-[var(--color-primary)]/30 transition-all"
              >
                <div className="h-32 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-4 p-4">
                  <Image
                    src={bloc.image}
                    alt={bloc.name}
                    width={240}
                    height={70}
                    className="h-auto max-h-20 w-auto object-contain drop-shadow-md group-hover:scale-105 transition-transform"
                  />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                  {bloc.name}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {bloc.series} extensions &middot; {bloc.period}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

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
