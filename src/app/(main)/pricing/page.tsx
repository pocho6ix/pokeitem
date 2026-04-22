import type { Metadata } from "next";
import { PricingPageClient } from "./PricingPageClient";

// Public pricing page — kept indexable and enriched so that social link
// previews (WhatsApp, Discord, Twitter cards) and the <title>/<meta
// description> served on first paint actually match the offering. The
// interactive card (billing toggle, checkout) lives in
// `PricingPageClient.tsx` — splitting it out is what lets this file
// export `metadata` (forbidden from a `"use client"` module).
const title       = "Tarifs";
const description =
  "PokeItem Pro : 2,99€/mois ou 29,99€/an. 14 jours d'essai gratuit. Collection Pokémon illimitée, stats avancées, calculateur d'échanges.";
const url         = "https://app.pokeitem.fr/pricing";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: {
    title,
    description,
    type: "website",
    url,
  },
  twitter: { card: "summary_large_image", title, description },
};

export default function PricingPage() {
  return <PricingPageClient />;
}
