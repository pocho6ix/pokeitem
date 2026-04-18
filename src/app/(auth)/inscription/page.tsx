import type { Metadata } from "next";
import { Suspense } from "react";
import { InscriptionForm } from "./InscriptionForm";

export const metadata: Metadata = {
  title: "Inscription",
  description:
    "Créez votre compte PokeItem gratuitement et commencez à gérer votre collection Pokémon TCG : classeur virtuel, wishlist, suivi de cote Cardmarket et stats.",
};

export default function InscriptionPage() {
  return (
    <Suspense>
      <InscriptionForm />
    </Suspense>
  );
}
