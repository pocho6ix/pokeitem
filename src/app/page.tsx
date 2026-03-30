import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
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

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--color-primary)] via-blue-600 to-blue-800 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm mb-6">
              <Star className="h-4 w-4 text-yellow-400" />
              La plateforme #1 pour les items scellés Pokémon
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Gérez votre collection{" "}
              <span className="text-yellow-400">Pokémon TCG</span>
            </h1>
            <p className="mt-6 text-lg text-blue-100 max-w-xl">
              PokeItem est le Finary des items scellés Pokémon. Cataloguez, valorisez et suivez
              l&apos;évolution de votre collection de displays, ETB, coffrets et plus.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/inscription"
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-lg hover:bg-blue-50 transition-colors"
              >
                Commencer gratuitement
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/collection"
                className="inline-flex items-center justify-center rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Explorer le catalogue
              </Link>
            </div>
          </div>
        </div>
      </section>

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

      {/* CTA */}
      <section className="py-20 bg-[var(--bg-primary)]">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">
            Prêt à gérer votre collection ?
          </h2>
          <p className="mt-4 text-[var(--text-secondary)]">
            Rejoignez PokeItem et commencez à suivre la valeur de vos items Pokémon scellés dès aujourd&apos;hui.
          </p>
          <Link
            href="/inscription"
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-[var(--color-primary)] px-8 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Créer mon compte gratuitement
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
      <MobileNav />
    </div>
  );
}
