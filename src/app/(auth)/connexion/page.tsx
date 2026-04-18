import type { Metadata } from "next";
import { Suspense } from "react";
import { ConnexionForm } from "./ConnexionForm";

export const metadata: Metadata = {
  title: "Connexion",
  description:
    "Connectez-vous à PokeItem pour gérer votre collection Pokémon TCG : cartes, Booster Boxes, wishlist, suivi de cote Cardmarket et statistiques de portefeuille.",
};

export default function ConnexionPage() {
  return (
    <Suspense>
      <ConnexionForm />
    </Suspense>
  );
}
