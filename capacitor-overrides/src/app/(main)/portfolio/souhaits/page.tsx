import type { Metadata } from "next";
import { WishlistPageClient } from "./WishlistPageClient";

export const metadata: Metadata = {
  title: "Liste de souhaits",
  description:
    "Votre wishlist de cartes Pokémon TCG : suivez les cartes que vous souhaitez acquérir, consultez leur prix Cardmarket actuel et comparez-les facilement.",
  robots: { index: false, follow: true },
};

export default function WishlistPage() {
  return <WishlistPageClient />;
}
