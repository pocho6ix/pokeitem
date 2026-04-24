import type { Metadata } from "next";
import { Suspense } from "react";
import { TabNav } from "@/components/ui/TabNav";
import { ProduitsLandingClient } from "./ProduitsLandingClient";

export const metadata: Metadata = {
  title: "Collection produits scellés Pokémon TCG",
  description:
    "Parcourez tous les produits scellés Pokémon TCG par série et extension : Booster Boxes, ETB, coffrets, blisters, tins et displays avec leur cote actuelle.",
};

export default function CollectionProduitsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <TabNav
        tabs={[
          { label: "Cartes", href: "/collection/cartes", active: false },
          { label: "Produits scellés", href: "/collection/produits", active: true },
        ]}
      />

      {/* The client landing reads `?view=` and `?type=` via `useSearchParams`,
          which requires a Suspense boundary under Next's App Router. */}
      <Suspense fallback={null}>
        <ProduitsLandingClient />
      </Suspense>
    </div>
  );
}
