import Link from "next/link";
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
    { href: "/market", label: "Market" },
  ],
  Légal: [
    { href: "/mentions-legales", label: "Mentions légales" },
    { href: "/politique-confidentialite", label: "Confidentialité" },
    { href: "/cgu", label: "CGU" },
  ],
};

const APP_STORE_URL  = "#";
const GOOGLE_PLAY_URL = "#";

// ─── Store badges ─────────────────────────────────────────────────────────────
// Styled to match the official App Store / Google Play badge guidelines:
// white background, dark text, ~160×48px, rounded corners, thin border.

function AppStoreBadge() {
  return (
    <Link
      href={APP_STORE_URL}
      aria-label="Télécharger dans l'App Store"
      className="inline-flex h-12 w-40 items-center gap-2.5 rounded-lg border border-black/20 bg-white px-3.5 transition-opacity hover:opacity-80 shrink-0"
    >
      {/* Official Apple logo — black */}
      <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 fill-black" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
      <div className="text-left leading-tight">
        <p className="text-[9px] font-normal text-black/60 uppercase tracking-wide">Télécharger dans</p>
        <p className="text-[14px] font-semibold text-black">l&apos;App Store</p>
      </div>
    </Link>
  );
}

function GooglePlayBadge() {
  return (
    <Link
      href={GOOGLE_PLAY_URL}
      aria-label="Disponible sur Google Play"
      className="inline-flex h-12 w-40 items-center gap-2.5 rounded-lg border border-black/20 bg-white px-3.5 transition-opacity hover:opacity-80 shrink-0"
    >
      {/* Official Google Play logo — coloured triangles */}
      <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.18 23.76a2 2 0 0 0 2.17-.32l.06-.05 12.14-6.98-2.64-2.65z" fill="#EA4335"/>
        <path d="M20.54 10.23L17.8 8.69l-2.95 2.84 2.95 2.94 2.77-1.59a1.98 1.98 0 0 0 0-3.65z" fill="#FBBC04"/>
        <path d="M3.18.24A2 2 0 0 0 2 2.06v19.88l.05.06L14.85 12z" fill="#4285F4"/>
        <path d="M14.85 12 3.23 23.82l.06.05a2 2 0 0 0 2.06-.06l.05-.04L17.8 16.3z" fill="#34A853"/>
      </svg>
      <div className="text-left leading-tight">
        <p className="text-[9px] font-normal text-black/60 uppercase tracking-wide">Disponible sur</p>
        <p className="text-[14px] font-semibold text-black">Google Play</p>
      </div>
    </Link>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

export function Footer() {
  return (
    <footer className="border-t border-[var(--border-default)] bg-[var(--bg-primary)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">

          {/* Brand + store badges */}
          <div className="col-span-2 md:col-span-1">
            <Logo size="md" />
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Votre plateforme pour gérer votre collection de cartes et d&apos;items scellés Pokémon.
            </p>

            {/* Badges — App Store first */}
            <div className="mt-4 flex flex-col gap-2">
              <AppStoreBadge />
              <GooglePlayBadge />
            </div>
          </div>

          {/* Navigation links */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom disclaimer */}
        <div className="mt-10 space-y-3 border-t border-[var(--border-default)] pt-6">
          <p className="text-center text-xs text-[var(--text-tertiary)]">
            PokeItem n&apos;est pas une application officielle Pokémon, elle n&apos;est en aucun cas affiliée, approuvée
            ou supportée par Nintendo, GAME FREAK ou The Pokémon Company.
            Les images et illustrations utilisées sont la propriété de leurs auteurs respectifs.
          </p>
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="text-xs text-[var(--text-tertiary)]">
              &copy; {new Date().getFullYear()} PokeItem. Tous droits réservés.
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Google Play et le logo Google Play sont des marques de Google Inc.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
