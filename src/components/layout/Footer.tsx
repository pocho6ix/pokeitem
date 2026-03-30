import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/shared/Logo";

const FOOTER_LINKS = {
  Collection: [
    { href: "/collection", label: "Catalogue complet" },
    { href: "/collection/produits/ecarlate-violet", label: "Ecarlate & Violet" },
    { href: "/collection/produits/epee-bouclier", label: "Epee & Bouclier" },
    { href: "/collection/produits/soleil-lune", label: "Soleil & Lune" },
    { href: "/collection/produits/xy", label: "XY" },
    { href: "/collection/produits/noir-blanc", label: "Noir & Blanc" },
    { href: "/collection/produits/mega-evolution", label: "Mega-Evolution" },
  ],
  Ressources: [
    { href: "/blog", label: "Blog" },
    { href: "/market", label: "Market" },
    { href: "/blog/guide-debuter-collection-pokemon-tcg", label: "Guide du debutant" },
    { href: "/blog/top-10-produits-scelles-rentables-2025", label: "Top 10 produits rentables" },
    { href: "/blog/investir-etb-strategie-conseils", label: "Investir dans les ETB" },
  ],
  Legal: [
    { href: "/mentions-legales", label: "Mentions legales" },
    { href: "/politique-confidentialite", label: "Confidentialite" },
    { href: "/cgu", label: "CGU" },
  ],
};

// Placeholder URLs — à remplacer quand l'appli sera live
const APP_STORE_URL = "#";
const GOOGLE_PLAY_URL = "#";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-200 bg-white dark:bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Logo size="md" />
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-500">
              Votre plateforme pour gérer votre collection de cartes et d&apos;items scellés Pokémon.
            </p>

            {/* App store badges */}
            <div className="mt-4 flex flex-col gap-2">
              <Link href={GOOGLE_PLAY_URL} aria-label="Disponible sur Google Play">
                <Image
                  src="/images/badges/google-play.svg"
                  alt="Disponible sur Google Play"
                  width={140}
                  height={42}
                  className="h-[42px] w-auto"
                  unoptimized
                />
              </Link>
              <Link href={APP_STORE_URL} aria-label="Télécharger dans l'App Store">
                <Image
                  src="/images/badges/app-store.svg"
                  alt="Télécharger dans l'App Store"
                  width={140}
                  height={42}
                  className="h-[42px] w-auto"
                  unoptimized
                />
              </Link>
            </div>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-900">{title}</h3>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-900 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-10 border-t border-gray-200 dark:border-gray-200 pt-6 space-y-3">
          <p className="text-xs text-gray-400 dark:text-gray-400 text-center">
            PokeItem n&apos;est pas une application officielle Pokémon, elle n&apos;est en aucun cas affiliée, approuvée ou supportée par Nintendo, GAME FREAK ou The Pokémon Company.
            Les images et illustrations utilisées sont la propriété de leurs auteurs respectifs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-gray-400 dark:text-gray-400">
              &copy; {new Date().getFullYear()} PokeItem. Tous droits réservés.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-400">
              Google Play et le logo Google Play sont des marques de Google Inc.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
