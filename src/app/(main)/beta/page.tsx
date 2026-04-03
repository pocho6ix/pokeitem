import type { Metadata } from "next";
import { BetaPageContent } from "@/components/beta/BetaPageContent";

export const metadata: Metadata = {
  title: "1 mois offert — Rejoins la bêta | PokeItem",
  description:
    "Installe PokéItem sur ton écran d'accueil et profite de toutes les fonctionnalités Pro gratuitement pendant 1 mois.",
};

export default function BetaPage() {
  return <BetaPageContent />;
}
