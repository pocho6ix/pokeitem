import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

const FOOTER_LINKS = {
  Collection: [
    { href: "/collection", label: "Catalogue complet" },
    { href: "/collection/ecarlate-violet", label: "Ecarlate & Violet" },
    { href: "/collection/epee-bouclier", label: "Epee & Bouclier" },
    { href: "/collection/soleil-lune", label: "Soleil & Lune" },
    { href: "/collection/xy", label: "XY" },
    { href: "/collection/noir-blanc", label: "Noir & Blanc" },
    { href: "/collection/mega-evolution", label: "Mega-Evolution" },
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

export function Footer() {
  return (
    <footer className="border-t border-[var(--border-default)] bg-[var(--bg-secondary)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Logo size="md" />
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              La plateforme de gestion de collection d&apos;items scellés Pokémon TCG.
            </p>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-[var(--border-default)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-tertiary)]">
            &copy; {new Date().getFullYear()} PokeItem. Tous droits réservés.
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            Pokémon est une marque déposée de The Pokémon Company.
          </p>
        </div>
      </div>
    </footer>
  );
}
