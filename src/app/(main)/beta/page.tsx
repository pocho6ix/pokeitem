import type { Metadata } from "next";
import { BetaPageContent } from "@/components/beta/BetaPageContent";

export const metadata: Metadata = {
  title: "1 mois offert — Rejoins la bêta",
  description:
    "Installe PokeItem sur ton écran d'accueil et profite gratuitement de toutes les fonctionnalités Pro pendant 1 mois : classeur, scan, stats et wishlist.",
};

export default function BetaPage() {
  return <BetaPageContent />;
}
