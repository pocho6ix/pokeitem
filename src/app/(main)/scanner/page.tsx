import type { Metadata } from "next";
import { ScanLine, Sparkles, Camera, BookOpen, Package } from "lucide-react";

export const metadata: Metadata = {
  title: "Scanner — PokeItem",
  description: "Scannez vos cartes et items Pokémon TCG pour les identifier et les ajouter automatiquement à votre portfolio.",
};

const FEATURES = [
  {
    icon: Camera,
    title: "Scan de cartes",
    description: "Prenez en photo une carte Pokémon et l'IA l'identifie instantanément : nom, extension, numéro, rareté.",
  },
  {
    icon: BookOpen,
    title: "Scan de classeur",
    description: "Scannez un classeur entier page par page. L'IA détecte toutes les cartes et les ajoute en masse à votre portfolio.",
  },
  {
    icon: Package,
    title: "Scan d'items scellés",
    description: "Identifiez n'importe quel booster, ETB, display ou coffret pour l'ajouter en un instant à votre collection.",
  },
  {
    icon: Sparkles,
    title: "Powered by AI",
    description: "Reconnaissance d'image avancée pour une identification précise, même sur des cartes rares ou anciennes.",
  },
];

export default function ScannerPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">

      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-1.5 text-sm font-medium text-[var(--text-secondary)] mb-6">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          Bientôt disponible
        </div>

        <div className="flex justify-center mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
            <ScanLine className="h-10 w-10 text-white" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">
          Scanner PokeItem
        </h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
          Scannez vos cartes et items Pokémon TCG. L'IA les identifie et les ajoute automatiquement à votre portfolio.
        </p>
      </div>

      {/* Features grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-16">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 mb-4">
              <feature.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">{feature.title}</h3>
            <p className="text-sm text-[var(--text-secondary)]">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 text-center">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          Soyez notifié au lancement
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Le Scanner est en cours de développement. Créez un compte pour être informé dès son ouverture.
        </p>
        <a
          href="/inscription"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Créer un compte gratuit
        </a>
      </div>

      {/* FAQ SEO */}
      <div className="mt-16 border-t border-[var(--border-default)] pt-10">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Questions fréquentes</h2>
        <div className="space-y-6">
          {[
            {
              q: "Comment fonctionne le scanner de cartes Pokémon ?",
              a: "Le scanner utilise l'intelligence artificielle pour analyser la photo d'une carte Pokémon et identifier automatiquement son nom, son extension, son numéro de carte et sa rareté. La carte est ensuite ajoutée à votre portfolio en un seul clic.",
            },
            {
              q: "Quels types de produits peut-on scanner ?",
              a: "Le scanner reconnaît les cartes individuelles, les pages de classeur (scan en masse), ainsi que les items scellés : boosters, ETB, displays, UPC, coffrets et tins.",
            },
            {
              q: "Le scanner fonctionne-t-il pour les anciennes cartes Pokémon ?",
              a: "Oui, notre IA est entraînée sur l'ensemble du catalogue Pokémon TCG depuis le Set de Base (1999) jusqu'aux extensions les plus récentes.",
            },
            {
              q: "Quand sera disponible le Scanner PokeItem ?",
              a: "Le Scanner est actuellement en développement. Créez un compte gratuit pour être notifié dès son lancement.",
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
