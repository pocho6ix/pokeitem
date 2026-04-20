import type { Metadata } from "next";
import { CollectionCartesClient } from "./CollectionCartesClient";

export const metadata: Metadata = {
  title: "Collection cartes Pokémon TCG",
  description:
    "Explorez toutes les cartes Pokémon TCG par série et extension : catalogue complet avec prix Cardmarket, raretés, images HD et détails pour chaque carte.",
};

export default function CollectionCartesPage() {
  return <CollectionCartesClient />;
}
