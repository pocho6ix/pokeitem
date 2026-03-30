import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ShoppingBag, Sparkles, TrendingUp, Link2, BarChart3 } from "lucide-react";

export const metadata: Metadata = {
  title: "Market — PokeItem",
  description: "Retrouvez les meilleurs prix pour vos items Pokémon TCG sur toutes les plateformes : CardMarket, eBay, et plus encore.",
};

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Prix en temps réel",
    description: "Comparez les prix de vos items scellés Pokémon sur toutes les plateformes : CardMarket, eBay, Vinted et plus.",
  },
  {
    icon: BarChart3,
    title: "Historique des prix",
    description: "Visualisez l'évolution des prix dans le temps pour identifier les meilleures opportunités d'achat et de vente.",
  },
  {
    icon: Link2,
    title: "Liens directs",
    description: "Accédez directement aux annonces des vendeurs sur chaque plateforme. Achetez au meilleur prix en un clic.",
  },
  {
    icon: ShoppingBag,
    title: "Alertes de prix",
    description: "Recevez une notification quand un item de votre wishlist atteint votre prix cible sur l'une des plateformes.",
  },
];

export default async function MarketPage() {
  const session = await getServerSession(authOptions);
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">

      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-1.5 text-sm font-medium text-[var(--text-secondary)] mb-6">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          Bientôt disponible
        </div>

        <div className="flex justify-center mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
            <ShoppingBag className="h-10 w-10 text-white" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">
          Market PokeItem
        </h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
          Comparez les prix de vos items Pokémon TCG sur toutes les plateformes de vente. Achetez au meilleur prix, vendez au bon moment.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-16">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30 mb-4">
              <feature.icon className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">{feature.title}</h3>
            <p className="text-sm text-[var(--text-secondary)]">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Platforms */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 mb-16">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 text-center">
          Plateformes intégrées
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {["CardMarket", "eBay", "Vinted", "Rakuten", "Leboncoin"].map((platform) => (
            <span
              key={platform}
              className="rounded-full border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-1.5 text-sm font-medium text-[var(--text-secondary)]"
            >
              {platform}
            </span>
          ))}
          <span className="rounded-full border border-dashed border-[var(--border-default)] px-4 py-1.5 text-sm text-[var(--text-tertiary)]">
            + d'autres à venir
          </span>
        </div>
      </div>

      {/* CTA */}
      {!session && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 text-center">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            Soyez notifié au lancement
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Le Market est en cours de développement. Créez un compte pour être informé dès son ouverture.
          </p>
          <a
            href="/inscription"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Créer un compte gratuit
          </a>
        </div>
      )}

      {/* FAQ SEO */}
      <div className="mt-16 border-t border-[var(--border-default)] pt-10">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Questions fréquentes</h2>
        <div className="space-y-6">
          {[
            {
              q: "Sur quelles plateformes PokeItem Market comparera-t-il les prix ?",
              a: "PokeItem Market intégrera CardMarket, eBay, Vinted, Rakuten et d'autres plateformes de revente de produits Pokémon TCG. L'objectif est de centraliser tous les prix en un seul endroit.",
            },
            {
              q: "Comment fonctionne l'affiliation sur PokeItem Market ?",
              a: "Lorsque vous cliquez sur un lien vers une plateforme partenaire et effectuez un achat, PokeItem perçoit une petite commission. Cela ne modifie pas le prix que vous payez.",
            },
            {
              q: "Puis-je créer des alertes de prix sur mes items Pokémon favoris ?",
              a: "Oui, cette fonctionnalité sera disponible au lancement du Market. Vous pourrez définir un prix cible pour n'importe quel item et être notifié dès qu'une annonce correspond à vos critères.",
            },
            {
              q: "Les prix sur PokeItem Market seront-ils mis à jour en temps réel ?",
              a: "Les prix seront mis à jour régulièrement (plusieurs fois par jour) depuis les plateformes partenaires. L'objectif est d'afficher des données aussi fraîches que possible.",
            },
          ].map((item, i) => (
            <div key={i}>
              <h3 className="font-medium text-[var(--text-primary)]">{item.q}</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
