import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

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
    default: "PokeItem — Gérez votre portfolio d'items Pokémon TCG",
    template: "%s | PokeItem",
  },
  description:
    "PokeItem est la plateforme de référence pour gérer, valoriser et suivre votre portfolio d'items scellés Pokémon TCG. Booster Boxes, ETB, coffrets et plus.",
  keywords: [
    "pokémon tcg",
    "collection pokémon",
    "items scellés pokémon",
    "booster box pokémon",
    "etb pokémon",
    "investir pokémon",
    "pokeitem",
    "portfolio pokémon",
  ],
  authors: [{ name: "PokeItem" }],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://www.pokeitem.fr",
    siteName: "PokeItem",
    title: "PokeItem — Gérez votre portfolio d'items Pokémon TCG",
    description:
      "La plateforme de référence pour gérer et valoriser votre portfolio d'items scellés Pokémon TCG.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PokeItem",
    description: "Gérez votre portfolio d'items scellés Pokémon TCG.",
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
    <html lang="fr" suppressHydrationWarning>
      <body className={`${plusJakarta.variable} ${spaceGrotesk.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
