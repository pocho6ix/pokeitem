import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/Providers";
import {
  generateOrganizationJsonLd,
  generateWebsiteJsonLd,
} from "@/lib/seo/structured-data";
import "./globals.css";

// `viewport-fit=cover` lets the page draw under the iOS status bar &
// home-indicator areas so we can opt back in via `env(safe-area-inset-*)`
// in CSS. No visible effect on the Vercel web build.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0F1E",
};

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PokeItem — Gérez votre collection Pokémon TCG",
    template: "%s | PokeItem",
  },
  description:
    "Gérez et valorisez votre collection Pokémon TCG : cartes, Booster Boxes, ETB, coffrets. Cote Cardmarket en temps réel, classeur virtuel, wishlist et stats.",
  keywords: [
    "pokémon tcg",
    "collection pokémon",
    "classeur pokémon",
    "cartes pokémon",
    "prix cardmarket",
    "booster box pokémon",
    "etb pokémon",
    "wishlist pokémon",
    "pokeitem",
    "portfolio pokémon",
  ],
  metadataBase: new URL("https://app.pokeitem.fr"),
  alternates: {
    canonical: "https://app.pokeitem.fr",
  },
  authors: [{ name: "PokeItem" }],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://app.pokeitem.fr",
    siteName: "PokeItem",
    title: "PokeItem — Gérez votre collection Pokémon TCG",
    description:
      "Gérez et valorisez votre collection Pokémon TCG : cartes, Booster Boxes, ETB, coffrets. Cote Cardmarket en temps réel, classeur virtuel, wishlist et stats.",
    images: [
      {
        url: "https://app.pokeitem.fr/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "PokeItem — Valorisez votre collection Pokémon TCG",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PokeItem — Gérez votre collection Pokémon TCG",
    description:
      "Gérez et valorisez votre collection Pokémon TCG : cartes, Booster Boxes, ETB, coffrets. Cote Cardmarket en temps réel, classeur virtuel et wishlist.",
    images: ["https://app.pokeitem.fr/og-image.jpg"],
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body className={`${plusJakarta.variable} ${spaceGrotesk.variable} font-sans antialiased`} suppressHydrationWarning>
        {/*
          Pre-hydration theme lock for Capacitor native builds. `window.Capacitor`
          is injected synchronously by the native shell before our bundle runs,
          so this block flips the theme to dark BEFORE React first paints —
          no flash of unstyled light mode.

          On Vercel web, `window.Capacitor` is undefined so the script is a
          no-op and next-themes behaves exactly as before.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try {
              if (typeof window !== 'undefined' && window.Capacitor) {
                window.localStorage.setItem('theme', 'dark');
                document.documentElement.classList.remove('light');
                document.documentElement.classList.add('dark');
                // Adds a marker class used by globals.css to apply
                // env(safe-area-inset-*) padding on iOS.
                document.documentElement.classList.add('capacitor');
              }
            } catch (_) {}`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateOrganizationJsonLd()),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateWebsiteJsonLd()),
          }}
        />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
